import type { Account, Transaction } from '../types';

export interface TransactionClosingBalance {
  // For standard income / expense
  closingBalance?: number;
  accountId?: string;
  accountName?: string;

  // For transfers
  fromClosingBalance?: number;
  toClosingBalance?: number;
  fromAccountId?: string;
  toAccountId?: string;
  fromAccountName?: string;
  toAccountName?: string;
}

// Backwards compatibility alias
export type TransactionRunningBalance = TransactionClosingBalance;

export interface FormattedBalanceInfo {
  text: string;
  tooltip?: string;
  isNegative?: boolean;
  balanceValue?: number;
}

/**
 * Compares two transactions chronologically (oldest to newest).
 * Uses ISO date timestamp, with transaction ID as a stable tie-breaker.
 */
export function compareTransactionsAsc(a: Transaction, b: Transaction): number {
  const timeA = new Date(a.date).getTime();
  const timeB = new Date(b.date).getTime();
  const validA = !isNaN(timeA);
  const validB = !isNaN(timeB);

  if (!validA && !validB) return (a.id || '').localeCompare(b.id || '');
  if (!validA) return -1;
  if (!validB) return 1;

  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Compares two transactions in reverse chronological order (newest to oldest).
 */
export function compareTransactionsDesc(a: Transaction, b: Transaction): number {
  return compareTransactionsAsc(b, a);
}

/**
 * Safely extracts the starting balance for an account with fallbacks.
 */
export function getAccountStartingBalance(account?: Account | null): number {
  if (!account) return 0;
  if (typeof account.initialBalance === 'number' && !isNaN(account.initialBalance)) {
    return account.initialBalance;
  }
  if (typeof account.currentBalance === 'number' && !isNaN(account.currentBalance)) {
    return account.currentBalance;
  }
  return 0;
}

/**
 * Formats a numeric value into INR currency string without decimals.
 */
export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates the chronological closing balance for a single specific account.
 * ONLY transactions that belong to this account (income, expense, or transfer from/to)
 * are considered in the calculation. All other accounts are strictly excluded.
 * 
 * @param transactions All transactions
 * @param selectedAccount The target Account object or account ID string
 * @returns Map<transactionId, closingBalanceAfterTransaction>
 */
export function calculateAccountClosingBalances(
  transactions: Transaction[] = [],
  selectedAccount: Account | string
): Map<string, number> {
  const closingMap = new Map<string, number>();
  if (!transactions || transactions.length === 0) return closingMap;

  const targetAccountId = typeof selectedAccount === 'string' ? selectedAccount : selectedAccount?.id;
  if (!targetAccountId) return closingMap;

  const startingBalance = typeof selectedAccount === 'object' && selectedAccount !== null
    ? getAccountStartingBalance(selectedAccount)
    : 0;

  // Filter ONLY transactions involving the selected account
  const accountTransactions = transactions.filter(t => 
    t && (t.accountId === targetAccountId || t.fromAccountId === targetAccountId || t.toAccountId === targetAccountId)
  );

  // Sort chronologically (oldest to newest)
  accountTransactions.sort(compareTransactionsAsc);

  let currentClosing = startingBalance;
  for (const tx of accountTransactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income' && tx.accountId === targetAccountId) {
      currentClosing += amount;
    } else if (tx.type === 'expense' && tx.accountId === targetAccountId) {
      currentClosing -= amount;
    } else if (tx.type === 'transfer') {
      if (tx.fromAccountId === targetAccountId) {
        currentClosing -= amount;
      } else if (tx.toAccountId === targetAccountId) {
        currentClosing += amount;
      }
    }
    closingMap.set(tx.id, currentClosing);
  }

  return closingMap;
}

/**
 * Calculates point-in-time closing balances for all accounts across all transactions.
 * Returns a Map keyed by transaction id.
 */
export function calculateAllClosingBalances(
  transactions: Transaction[] = [],
  accounts: Account[] = []
): Map<string, TransactionClosingBalance> {
  const resultMap = new Map<string, TransactionClosingBalance>();
  if (!transactions || transactions.length === 0) return resultMap;

  const accountMap = new Map<string, Account>();
  const accountClosingMaps = new Map<string, Map<string, number>>();

  if (accounts && accounts.length > 0) {
    for (const acc of accounts) {
      if (acc && acc.id) {
        accountMap.set(acc.id, acc);
        accountClosingMaps.set(acc.id, calculateAccountClosingBalances(transactions, acc));
      }
    }
  }

  // Handle any accounts that appear in transactions but aren't in accounts array
  for (const tx of transactions) {
    if (!tx) continue;
    const ids = [tx.accountId, tx.fromAccountId, tx.toAccountId].filter(Boolean) as string[];
    for (const id of ids) {
      if (!accountClosingMaps.has(id)) {
        accountClosingMaps.set(id, calculateAccountClosingBalances(transactions, id));
      }
    }
  }

  for (const tx of transactions) {
    if (!tx || !tx.id) continue;

    if (tx.type === 'transfer') {
      const fromBal = tx.fromAccountId ? accountClosingMaps.get(tx.fromAccountId)?.get(tx.id) : undefined;
      const toBal = tx.toAccountId ? accountClosingMaps.get(tx.toAccountId)?.get(tx.id) : undefined;

      resultMap.set(tx.id, {
        fromClosingBalance: fromBal,
        toClosingBalance: toBal,
        fromAccountId: tx.fromAccountId,
        toAccountId: tx.toAccountId,
        fromAccountName: tx.fromAccountId ? accountMap.get(tx.fromAccountId)?.name : undefined,
        toAccountName: tx.toAccountId ? accountMap.get(tx.toAccountId)?.name : undefined,
      });
    } else {
      const accId = tx.accountId;
      const closing = accId ? accountClosingMaps.get(accId)?.get(tx.id) : undefined;

      resultMap.set(tx.id, {
        closingBalance: closing,
        accountId: accId,
        accountName: accId ? accountMap.get(accId)?.name : undefined,
      });
    }
  }

  return resultMap;
}

/**
 * Calculates chronological closing balances.
 * Polymorphic helper that supports:
 * 1. Single account calculation: calculateClosingBalances(transactions, selectedAccount)
 * 2. Multi account aggregation: calculateClosingBalances(transactions, accounts)
 */
export function calculateClosingBalances(
  transactions: Transaction[] = [],
  accountOrAccounts: Account | Account[] | string = []
): Map<string, any> {
  if (!Array.isArray(accountOrAccounts)) {
    return calculateAccountClosingBalances(transactions, accountOrAccounts);
  }
  return calculateAllClosingBalances(transactions, accountOrAccounts);
}

// Backwards compatibility alias
export const calculateRunningBalances = calculateClosingBalances;

/**
 * Returns formatted display text and tooltip for the closing balance of a transaction,
 * aware of current account filtering.
 */
export function getFormattedClosingBalance(
  closingBal?: TransactionClosingBalance,
  filterAccount: string = 'all',
  isMasked: boolean = false
): FormattedBalanceInfo | null {
  if (!closingBal) return null;

  // Standard Income or Expense
  if (closingBal.closingBalance !== undefined) {
    const isNeg = !isMasked && closingBal.closingBalance < 0;
    const formatted = isMasked ? '***' : formatCurrencyINR(closingBal.closingBalance);
    const accName = closingBal.accountName ? `${closingBal.accountName} ` : '';
    return {
      text: `Closing Balance: ${formatted}`,
      tooltip: isMasked ? 'Closing Balance: Hidden' : `${accName}Closing Balance: ${formatted}`,
      isNegative: isNeg,
      balanceValue: closingBal.closingBalance,
    };
  }

  // Transfer transaction
  const hasFrom = closingBal.fromClosingBalance !== undefined;
  const hasTo = closingBal.toClosingBalance !== undefined;

  if (!hasFrom && !hasTo) return null;

  // If specific account filter is active
  if (filterAccount !== 'all') {
    if (filterAccount === closingBal.fromAccountId && hasFrom) {
      const isNeg = !isMasked && closingBal.fromClosingBalance! < 0;
      const formatted = isMasked ? '***' : formatCurrencyINR(closingBal.fromClosingBalance!);
      return {
        text: `Closing Balance: ${formatted}`,
        tooltip: isMasked ? 'Closing Balance: Hidden' : `${closingBal.fromAccountName || 'From Account'} Closing Balance: ${formatted}`,
        isNegative: isNeg,
        balanceValue: closingBal.fromClosingBalance,
      };
    }
    if (filterAccount === closingBal.toAccountId && hasTo) {
      const isNeg = !isMasked && closingBal.toClosingBalance! < 0;
      const formatted = isMasked ? '***' : formatCurrencyINR(closingBal.toClosingBalance!);
      return {
        text: `Closing Balance: ${formatted}`,
        tooltip: isMasked ? 'Closing Balance: Hidden' : `${closingBal.toAccountName || 'To Account'} Closing Balance: ${formatted}`,
        isNegative: isNeg,
        balanceValue: closingBal.toClosingBalance,
      };
    }
  }

  // Default 'all' accounts view for transfers
  if (hasFrom && hasTo) {
    const fFrom = isMasked ? '***' : formatCurrencyINR(closingBal.fromClosingBalance!);
    const fTo = isMasked ? '***' : formatCurrencyINR(closingBal.toClosingBalance!);
    const isNeg = !isMasked && (closingBal.fromClosingBalance! < 0 || closingBal.toClosingBalance! < 0);
    return {
      text: `Closing: ${fFrom} → ${fTo}`,
      tooltip: isMasked ? 'Closing Balance: Hidden' : `${closingBal.fromAccountName || 'From'}: ${fFrom} | ${closingBal.toAccountName || 'To'}: ${fTo}`,
      isNegative: isNeg,
    };
  } else if (hasFrom) {
    const fFrom = isMasked ? '***' : formatCurrencyINR(closingBal.fromClosingBalance!);
    return {
      text: `Closing Balance: ${fFrom}`,
      tooltip: isMasked ? 'Closing Balance: Hidden' : `${closingBal.fromAccountName || 'Account'}: ${fFrom}`,
      isNegative: !isMasked && closingBal.fromClosingBalance! < 0,
      balanceValue: closingBal.fromClosingBalance,
    };
  } else {
    const fTo = isMasked ? '***' : formatCurrencyINR(closingBal.toClosingBalance!);
    return {
      text: `Closing Balance: ${fTo}`,
      tooltip: isMasked ? 'Closing Balance: Hidden' : `${closingBal.toAccountName || 'Account'}: ${fTo}`,
      isNegative: !isMasked && closingBal.toClosingBalance! < 0,
      balanceValue: closingBal.toClosingBalance,
    };
  }
}

// Backwards compatibility alias
export const getFormattedRunningBalance = getFormattedClosingBalance;
