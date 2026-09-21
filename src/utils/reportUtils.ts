import type { Transaction } from '../types';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const QUARTERS = [
  { value: 1, label: 'Q1 (Jan - Mar)' },
  { value: 2, label: 'Q2 (Apr - Jun)' },
  { value: 3, label: 'Q3 (Jul - Sep)' },
  { value: 4, label: 'Q4 (Oct - Dec)' }
];

/**
 * Extracts unique years from transactions, sorted in descending order.
 * Always includes the current year as a fallback.
 */
export const getAvailableYears = (transactions: Transaction[]): number[] => {
  const currentYear = new Date().getFullYear();
  const yearsSet = new Set<number>();
  yearsSet.add(currentYear);

  transactions.forEach(t => {
    if (t.date) {
      const year = new Date(t.date).getFullYear();
      if (!isNaN(year)) {
        yearsSet.add(year);
      }
    }
  });

  return Array.from(yearsSet).sort((a, b) => b - a);
};

/**
 * Filters transactions by selected period type, year, month index (0-11), or quarter (1-4).
 */
export const filterTransactionsByPeriod = (
  transactions: Transaction[],
  period: 'month' | 'quarter' | 'year',
  selectedYear: number,
  selectedMonth: number,
  selectedQuarter: number
): Transaction[] => {
  return transactions.filter(t => {
    const txDate = new Date(t.date);
    if (isNaN(txDate.getTime())) return false;

    const txYear = txDate.getFullYear();
    const txMonth = txDate.getMonth();

    if (txYear !== selectedYear) return false;

    if (period === 'month') {
      return txMonth === selectedMonth;
    }

    if (period === 'quarter') {
      const txQuarter = Math.floor(txMonth / 3) + 1;
      return txQuarter === selectedQuarter;
    }

    // period === 'year'
    return true;
  });
};
