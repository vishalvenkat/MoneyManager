import { db } from './firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { Account, Category, Transaction } from '../types';

export interface ValidatedBackupData {
  version?: string;
  exportDate?: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}

export const jsonBackupService = {
  /**
   * Parses and validates raw JSON file string against MoneyManager schema
   */
  validateBackupJSON(jsonString: string): ValidatedBackupData {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error('Invalid JSON file format. Failed to parse file syntax.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup schema: File does not contain a valid JSON object.');
    }

    // Support both direct root arrays or wrapped object format { accounts: [], categories: [], transactions: [] }
    const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
      throw new Error('Invalid backup schema: Missing required collections (accounts, categories, or transactions arrays).');
    }

    // Basic structure checks for elements
    for (const acc of accounts) {
      if (!acc.id || !acc.name) {
        throw new Error(`Invalid account entry in backup: missing id or name for account "${acc.name || 'Unknown'}"`);
      }
    }

    for (const cat of categories) {
      if (!cat.id || !cat.name) {
        throw new Error(`Invalid category entry in backup: missing id or name for category "${cat.name || 'Unknown'}"`);
      }
    }

    for (const tx of transactions) {
      if (!tx.id || tx.amount === undefined || !tx.date) {
        throw new Error(`Invalid transaction entry in backup: missing required fields (id, amount, date)`);
      }
    }

    return {
      version: parsed.version || '1.0',
      exportDate: parsed.exportDate,
      accounts,
      categories,
      transactions,
    };
  },

  /**
   * Destructively wipes current user data in Firestore and batch-restores data from backup
   */
  async restoreFromJSON(
    uid: string,
    backupData: ValidatedBackupData,
    onProgress?: (status: string) => void
  ): Promise<void> {
    if (!uid) {
      throw new Error('User authentication required for restoration.');
    }

    // 1. Wipe existing collections in Firestore
    onProgress?.('Wiping current user data...');
    const collectionsToWipe = ['transactions', 'accounts', 'categories'];

    for (const colName of collectionsToWipe) {
      const colRef = collection(db, 'users', uid, colName);
      const snapshot = await getDocs(colRef);

      if (!snapshot.empty) {
        const docSnaps = snapshot.docs;
        // Batch delete in chunks of 400
        for (let i = 0; i < docSnaps.length; i += 400) {
          const chunk = docSnaps.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
      }
    }

    // 2. Restore Accounts
    onProgress?.(`Restoring ${backupData.accounts.length} accounts...`);
    if (backupData.accounts.length > 0) {
      for (let i = 0; i < backupData.accounts.length; i += 400) {
        const chunk = backupData.accounts.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(acc => {
          const docRef = doc(db, 'users', uid, 'accounts', acc.id);
          batch.set(docRef, acc);
        });
        await batch.commit();
      }
    }

    // 3. Restore Categories
    onProgress?.(`Restoring ${backupData.categories.length} categories...`);
    if (backupData.categories.length > 0) {
      for (let i = 0; i < backupData.categories.length; i += 400) {
        const chunk = backupData.categories.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(cat => {
          const docRef = doc(db, 'users', uid, 'categories', cat.id);
          batch.set(docRef, cat);
        });
        await batch.commit();
      }
    }

    // 4. Restore Transactions
    onProgress?.(`Restoring ${backupData.transactions.length} transactions...`);
    if (backupData.transactions.length > 0) {
      for (let i = 0; i < backupData.transactions.length; i += 400) {
        const chunk = backupData.transactions.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(tx => {
          const docRef = doc(db, 'users', uid, 'transactions', tx.id);
          batch.set(docRef, tx);
        });
        await batch.commit();
      }
    }

    onProgress?.('Restoration completed successfully!');
  }
};
