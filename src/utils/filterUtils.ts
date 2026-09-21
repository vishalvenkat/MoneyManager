import type { Transaction, Account, Category } from '../types';

export interface ActiveFilters {
  startDate: string;
  endDate: string;
  filterAccount: string;
  filterCategory: string;
  filterSubcategory: string;
  filterType: string;
}

/**
 * Checks if a transaction matches all active filters, optionally ignoring one filter field.
 */
export const matchesFiltersExcept = (
  t: Transaction,
  filters: ActiveFilters,
  ignoreField?: keyof ActiveFilters
): boolean => {
  // Date Range (From)
  if (ignoreField !== 'startDate' && filters.startDate) {
    const start = new Date(`${filters.startDate}T00:00:00Z`).getTime();
    const tTime = new Date(t.date).getTime();
    if (tTime < start) return false;
  }

  // Date Range (To)
  if (ignoreField !== 'endDate' && filters.endDate) {
    const end = new Date(`${filters.endDate}T23:59:59Z`).getTime();
    const tTime = new Date(t.date).getTime();
    if (tTime > end) return false;
  }

  // Account
  if (ignoreField !== 'filterAccount' && filters.filterAccount !== 'all') {
    if (t.type === 'transfer') {
      if (t.fromAccountId !== filters.filterAccount && t.toAccountId !== filters.filterAccount) {
        return false;
      }
    } else {
      if (t.accountId !== filters.filterAccount) return false;
    }
  }

  // Category
  if (ignoreField !== 'filterCategory' && filters.filterCategory !== 'all') {
    if (t.categoryId !== filters.filterCategory) return false;
  }

  // Subcategory
  if (ignoreField !== 'filterSubcategory' && filters.filterSubcategory !== 'all') {
    if (t.subcategory !== filters.filterSubcategory) return false;
  }

  // Transaction Type
  if (ignoreField !== 'filterType' && filters.filterType !== 'all') {
    if (t.type !== filters.filterType) return false;
  }

  return true;
};

/**
 * Calculates dynamic record counts for each filter option based on all other active filters.
 */
export const getAvailableFilterCounts = (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  allSubcategories: string[],
  filters: ActiveFilters
) => {
  // 1. Account Counts
  const accountCounts: Record<string, number> = {};
  accounts.forEach(a => { accountCounts[a.id] = 0; });
  let totalAccountsCount = 0;

  transactions.forEach(t => {
    if (matchesFiltersExcept(t, filters, 'filterAccount')) {
      totalAccountsCount++;
      if (t.type === 'transfer') {
        if (t.fromAccountId && accountCounts[t.fromAccountId] !== undefined) {
          accountCounts[t.fromAccountId]++;
        }
        if (t.toAccountId && accountCounts[t.toAccountId] !== undefined) {
          accountCounts[t.toAccountId]++;
        }
      } else if (t.accountId && accountCounts[t.accountId] !== undefined) {
        accountCounts[t.accountId]++;
      }
    }
  });

  // 2. Category Counts
  const categoryCounts: Record<string, number> = {};
  categories.forEach(c => { categoryCounts[c.id] = 0; });
  let totalCategoriesCount = 0;

  transactions.forEach(t => {
    if (matchesFiltersExcept(t, filters, 'filterCategory')) {
      totalCategoriesCount++;
      if (t.categoryId && categoryCounts[t.categoryId] !== undefined) {
        categoryCounts[t.categoryId]++;
      }
    }
  });

  // 3. Subcategory Counts
  const subcategoryCounts: Record<string, number> = {};
  allSubcategories.forEach(s => { subcategoryCounts[s] = 0; });
  let totalSubcategoriesCount = 0;

  transactions.forEach(t => {
    if (matchesFiltersExcept(t, filters, 'filterSubcategory')) {
      totalSubcategoriesCount++;
      if (t.subcategory && subcategoryCounts[t.subcategory] !== undefined) {
        subcategoryCounts[t.subcategory]++;
      }
    }
  });

  // 4. Type Counts
  const typeCounts: Record<string, number> = { expense: 0, income: 0, transfer: 0 };
  let totalTypesCount = 0;

  transactions.forEach(t => {
    if (matchesFiltersExcept(t, filters, 'filterType')) {
      totalTypesCount++;
      if (typeCounts[t.type] !== undefined) {
        typeCounts[t.type]++;
      }
    }
  });

  return {
    accountCounts,
    totalAccountsCount,
    categoryCounts,
    totalCategoriesCount,
    subcategoryCounts,
    totalSubcategoriesCount,
    typeCounts,
    totalTypesCount,
  };
};
