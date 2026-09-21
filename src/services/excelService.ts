import * as XLSX from 'xlsx';
import type { Transaction, Account, Category, TransactionType, CategoryType } from '../types';
import { db } from './firebase';
import { doc, writeBatch } from 'firebase/firestore';

export interface ImportSummary {
  totalImported: number;
  newAccountsCreated: number;
  newCategoriesCreated: number;
  createdAccountNames: string[];
  createdCategoryNames: string[];
}

export const excelService = {
  /**
   * Export transactions to an Excel file (.xlsx)
   */
  exportTransactionsToExcel: (
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[],
    filename: string = 'MoneyManager_Transactions.xlsx'
  ) => {
    const accountMap = new Map<string, string>();
    accounts.forEach(a => accountMap.set(a.id, a.name));

    const categoryMap = new Map<string, string>();
    categories.forEach(c => categoryMap.set(c.id, c.name));

    const rows = transactions.map(t => {
      let dateStr = t.date;
      if (t.date.includes('T')) {
        dateStr = t.date.split('T')[0];
      }

      let accountName = '';
      if (t.type === 'transfer') {
        const fromName = t.fromAccountId ? accountMap.get(t.fromAccountId) || 'Unknown' : 'Unknown';
        const toName = t.toAccountId ? accountMap.get(t.toAccountId) || 'Unknown' : 'Unknown';
        accountName = `${fromName} -> ${toName}`;
      } else {
        accountName = t.accountId ? accountMap.get(t.accountId) || 'Unknown' : '';
      }

      const categoryName = t.categoryId ? categoryMap.get(t.categoryId) || '' : (t.type === 'transfer' ? 'Transfer' : '');

      return {
        'Date': dateStr,
        'Accounts': accountName,
        'Category': categoryName,
        'Subcategory': t.subcategory || '',
        'Note': t.notes || '',
        'Amount': t.amount,
        'Income/Expense': t.type.charAt(0).toUpperCase() + t.type.slice(1),
        'Description': t.description || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, filename);
  },

  /**
   * Download Excel Import Template with Instructions & Rules sheet and Template sheet
   */
  downloadExcelTemplate: (filename: string = 'MoneyManager_Import_Template.xlsx') => {
    // Sheet 1: Instructions & Rules
    const instructionsData = [
      { 'Rule / Field': 'Date Format', 'Details & Guidance': 'Use DD/MM/YYYY or YYYY-MM-DD (e.g., 20/09/2026).' },
      { 'Rule / Field': 'Accounts', 'Details & Guidance': 'Enter account name (e.g., Paytm, HDFC). New accounts will be automatically created with 0 initial balance.' },
      { 'Rule / Field': 'Category & Subcategory', 'Details & Guidance': 'Enter valid categories and optional subcategories. New categories will be auto-created on import.' },
      { 'Rule / Field': 'Income/Expense Column Values', 'Details & Guidance': 'Use "Exp." for expenses, "Income" for income, or "Transfer-In" / "Transfer-Out" for transfers between accounts.' },
      { 'Rule / Field': 'Transfer Rules', 'Details & Guidance': 'For Transfer-In, Category column represents Source Account and Accounts column represents Destination Account. Transfer-Out rows are handled automatically.' },
      { 'Rule / Field': 'Import Rules', 'Details & Guidance': 'First sheet will be considered for importing the data. Please remove the instructions and rules accordingly.' }
    ];

    // Sheet 2: Template with Sample Rows
    const templateData = [
      {
        'Date': '20/09/2026',
        'Accounts': 'Paytm',
        'Category': 'Food & Dining',
        'Subcategory': 'Groceries',
        'Note': 'Weekly groceries',
        'Amount': 1500,
        'Income/Expense': 'Exp.',
        'Description': 'Supermarket purchase'
      },
      {
        'Date': '21/09/2026',
        'Accounts': 'HDFC Savings',
        'Category': 'Paytm',
        'Subcategory': '',
        'Note': 'Wallet reload',
        'Amount': 5000,
        'Income/Expense': 'Transfer-In',
        'Description': 'Transfer from Paytm to HDFC Savings'
      },
      {
        'Date': '22/09/2026',
        'Accounts': 'HDFC Savings',
        'Category': 'Salary',
        'Subcategory': 'Monthly',
        'Note': 'September Salary',
        'Amount': 75000,
        'Income/Expense': 'Income',
        'Description': 'Direct deposit from employer'
      }
    ];

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Instructions & Rules
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 28 }, { wch: 95 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions & Rules');

    // Sheet 2: Template
    const templateSheet = XLSX.utils.json_to_sheet(templateData);
    templateSheet['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 12 },
      { wch: 16 },
      { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');

    XLSX.writeFile(workbook, filename);
  },

  /**
   * Import transactions from an Excel file (.xlsx, .xls, .csv)
   */
  importTransactionsFromExcel: async (
    file: File,
    uid: string,
    existingAccounts: Account[],
    existingCategories: Category[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<ImportSummary> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("The uploaded Excel file contains no worksheets.");
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error("The uploaded Excel sheet contains no data rows.");
    }

    // Maps for fast lookup & auto-creation
    const accountLookup = new Map<string, Account>();
    existingAccounts.forEach(a => accountLookup.set(a.name.trim().toLowerCase(), a));

    const categoryLookup = new Map<string, Category>();
    existingCategories.forEach(c => categoryLookup.set(`${c.type}:${c.name.trim().toLowerCase()}`, c));

    const createdAccountNames: string[] = [];
    const createdCategoryNames: string[] = [];

    const newTransactionsToSave: Transaction[] = [];

    const findKey = (row: Record<string, any>, matchers: string[]): string | undefined => {
      const keys = Object.keys(row);
      return keys.find(k => {
        const lowerK = k.trim().toLowerCase();
        return matchers.some(m => lowerK === m || lowerK.includes(m));
      });
    };

    const totalRows = rawRows.length;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Flexible key discovery
      const dateKey = findKey(row, ['date']);
      const accountsKey = findKey(row, ['accounts', 'account']);
      const categoryKey = findKey(row, ['category']);
      const subcategoryKey = findKey(row, ['subcategory', 'sub-category', 'sub category']);
      const noteKey = findKey(row, ['note', 'notes']);
      const amountKey = findKey(row, ['amount', 'sum', 'value']);
      const typeKey = findKey(row, ['income/expense', 'type', 'transaction type']);
      const descKey = findKey(row, ['description', 'desc']);

      const rawDate = dateKey ? row[dateKey] : '';
      const rawAccounts = accountsKey ? String(row[accountsKey]).trim() : '';
      const rawCategory = categoryKey ? String(row[categoryKey]).trim() : '';
      const rawSubcategory = subcategoryKey ? String(row[subcategoryKey]).trim() : '';
      const rawNote = noteKey ? String(row[noteKey]).trim() : '';
      const rawAmount = amountKey ? parseFloat(String(row[amountKey])) : 0;
      const rawType = typeKey ? String(row[typeKey]).trim() : '';
      const rawDesc = descKey ? String(row[descKey]).trim() : '';

      // Skip invalid / completely empty rows
      if (!rawDate && !rawAmount && !rawAccounts) continue;

      // 1. Date Formatting
      let isoDate = new Date().toISOString();
      if (rawDate) {
        if (rawDate instanceof Date) {
          isoDate = rawDate.toISOString();
        } else if (typeof rawDate === 'number') {
          // Excel serial date number conversion
          const dateObj = XLSX.SSF.parse_date_code(rawDate);
          if (dateObj) {
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            isoDate = `${dateObj.y}-${m}-${d}T12:00:00.000Z`;
          }
        } else {
          const parsedStr = String(rawDate).trim();
          const parsedDate = new Date(parsedStr);
          if (!isNaN(parsedDate.getTime())) {
            isoDate = parsedDate.toISOString();
          } else {
            // Try parsing DD/MM/YYYY
            const parts = parsedStr.split(/[-/]/);
            if (parts.length === 3) {
              const [d, m, y] = parts;
              const formattedStr = `${y.length === 4 ? y : '20' + y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00.000Z`;
              if (!isNaN(new Date(formattedStr).getTime())) {
                isoDate = formattedStr;
              }
            }
          }
        }
      }

      const amountNum = Math.abs(isNaN(rawAmount) ? 0 : rawAmount);

      // Helper to auto-create account if missing
      const getOrCreateAccount = async (accName: string): Promise<Account> => {
        const cleanName = accName.trim();
        const key = cleanName.toLowerCase();
        if (accountLookup.has(key)) {
          return accountLookup.get(key)!;
        }

        // Auto-create missing account in Firestore & local map
        const newAccount: Account = {
          id: crypto.randomUUID(),
          name: cleanName,
          group: 'Cash',
          initialBalance: 0,
          currentBalance: 0,
        };

        const batch = writeBatch(db);
        const docRef = doc(db, 'users', uid, 'accounts', newAccount.id);
        batch.set(docRef, newAccount);
        await batch.commit();

        accountLookup.set(key, newAccount);
        createdAccountNames.push(cleanName);
        return newAccount;
      };

      // Helper to auto-create category if missing
      const getOrCreateCategory = async (catName: string, cType: CategoryType, subCatName?: string): Promise<Category | undefined> => {
        if (!catName) return undefined;
        const cleanCatName = catName.trim();
        const key = `${cType}:${cleanCatName.toLowerCase()}`;

        let category = categoryLookup.get(key);
        if (!category) {
          category = {
            id: crypto.randomUUID(),
            name: cleanCatName,
            type: cType,
            color: cType === 'income' ? '#10B981' : '#EF4444',
            icon: 'circle',
            subcategories: subCatName ? [subCatName] : [],
          };

          const batch = writeBatch(db);
          const docRef = doc(db, 'users', uid, 'categories', category.id);
          batch.set(docRef, category);
          await batch.commit();

          categoryLookup.set(key, category);
          createdCategoryNames.push(`${cleanCatName} (${cType})`);
        } else if (subCatName) {
          const currentSubs = category.subcategories || [];
          if (!currentSubs.includes(subCatName)) {
            category.subcategories = [...currentSubs, subCatName];
            const batch = writeBatch(db);
            const docRef = doc(db, 'users', uid, 'categories', category.id);
            batch.update(docRef, { subcategories: category.subcategories });
            await batch.commit();
          }
        }
        return category;
      };

      // 2. Transaction Type Resolution & Pairing Rules:
      // - "Exp." / "Expense" -> Expense
      // - "Income" -> Income
      // - "Transfer-In" -> Unified Transfer transaction (FROM Category column account TO Accounts column account)
      // - "Transfer-Out" -> Skipped to avoid duplicate transfer entries (handled by paired Transfer-In)
      const lowerTypeStr = rawType.toLowerCase();

      // Handle "Transfer-Out": Skip creating a duplicate record since Transfer-In records the full transfer.
      if (lowerTypeStr.includes('transfer-out') || lowerTypeStr.includes('transfer out')) {
        if (onProgress) {
          onProgress(i + 1, totalRows);
        }
        continue;
      }

      // Handle "Transfer-In": Money transferred FROM account in Category column TO account in Accounts column
      if (lowerTypeStr.includes('transfer-in') || lowerTypeStr.includes('transfer in')) {
        const fromAccountName = rawCategory || 'Cash';
        const toAccountName = rawAccounts || 'Savings';

        // Auto-create source & destination accounts if missing (initial balance 0)
        const fromAcc = await getOrCreateAccount(fromAccountName);
        const toAcc = await getOrCreateAccount(toAccountName);

        newTransactionsToSave.push({
          id: crypto.randomUUID(),
          amount: amountNum,
          date: isoDate,
          type: 'transfer',
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          notes: rawNote,
          description: rawDesc,
        });

        if (onProgress) {
          onProgress(i + 1, totalRows);
        }
        continue;
      }

      let txType: TransactionType = 'expense';
      if (lowerTypeStr.includes('income') || lowerTypeStr === 'cr' || lowerTypeStr === 'credit') {
        txType = 'income';
      } else if (lowerTypeStr.includes('transfer') || rawAccounts.includes('->')) {
        txType = 'transfer';
      } else if (
        lowerTypeStr === 'exp.' ||
        lowerTypeStr === 'exp' ||
        lowerTypeStr.includes('expense') ||
        lowerTypeStr === 'dr' ||
        lowerTypeStr === 'debit' ||
        lowerTypeStr.includes('payment')
      ) {
        txType = 'expense';
      }

      // Handle generic Accounts & Category resolution
      if (txType === 'transfer') {
        let fromName = 'Cash';
        let toName = 'Savings';

        if (rawAccounts.includes('->')) {
          const parts = rawAccounts.split('->');
          fromName = parts[0].trim() || 'Cash';
          toName = parts[1].trim() || 'Savings';
        } else if (rawAccounts) {
          fromName = rawAccounts;
        }

        const fromAcc = await getOrCreateAccount(fromName);
        const toAcc = await getOrCreateAccount(toName);

        newTransactionsToSave.push({
          id: crypto.randomUUID(),
          amount: amountNum,
          date: isoDate,
          type: 'transfer',
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          notes: rawNote,
          description: rawDesc,
        });
      } else {
        const targetAccountName = rawAccounts || 'Cash';
        const accountObj = await getOrCreateAccount(targetAccountName);

        let categoryObj: Category | undefined = undefined;
        if (rawCategory) {
          categoryObj = await getOrCreateCategory(rawCategory, txType as CategoryType, rawSubcategory);
        }

        newTransactionsToSave.push({
          id: crypto.randomUUID(),
          amount: amountNum,
          date: isoDate,
          type: txType,
          accountId: accountObj.id,
          categoryId: categoryObj?.id || undefined,
          subcategory: rawSubcategory || '',
          notes: rawNote,
          description: rawDesc,
        });
      }

      if (onProgress) {
        onProgress(i + 1, totalRows);
      }
    }

    // Batch write transactions to Firestore in chunks of 400
    const CHUNK_SIZE = 400;
    for (let i = 0; i < newTransactionsToSave.length; i += CHUNK_SIZE) {
      const chunk = newTransactionsToSave.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(t => {
        const docRef = doc(db, 'users', uid, 'transactions', t.id);
        batch.set(docRef, t);
      });
      await batch.commit();
    }

    return {
      totalImported: newTransactionsToSave.length,
      newAccountsCreated: createdAccountNames.length,
      newCategoriesCreated: createdCategoryNames.length,
      createdAccountNames,
      createdCategoryNames,
    };
  }
};
