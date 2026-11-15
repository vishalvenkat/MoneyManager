import { 
  startOfWeek, 
  addDays, 
  subMonths, 
  getDaysInMonth, 
  isSameMonth, 
  isSameYear, 
  isSameDay, 
  format 
} from 'date-fns';
import type { Transaction, Category } from '../types';

export interface DayExpenditure {
  day: string; // e.g., 'Sun', 'Mon'
  date: string; // e.g., 'Nov 15'
  amount: number;
  fullDate: string; // e.g., 'Sunday, Nov 15, 2026'
  isToday: boolean;
}

export interface CategoryExpenseShare {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface Last6MonthsAverageResult {
  average: number;
  total: number;
  monthsCount: number;
  rangeLabel: string;
  monthlyBreakdown: {
    monthKey: string;
    label: string;
    total: number;
  }[];
}

/**
 * 1. Total Expense for the current month
 */
export function calculateMonthlyExpense(transactions: Transaction[], referenceDate: Date = new Date()): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'expense' && t.date) {
      const txDate = new Date(t.date);
      if (isSameMonth(txDate, referenceDate) && isSameYear(txDate, referenceDate)) {
        return sum + (Number(t.amount) || 0);
      }
    }
    return sum;
  }, 0);
}

/**
 * 2. Average Daily Expense for the current month: (Total Expense for this month) / (Total number of days in that month)
 */
export function calculateDailyAverageExpense(totalExpense: number, referenceDate: Date = new Date()): number {
  const daysInMonth = getDaysInMonth(referenceDate);
  if (!daysInMonth || daysInMonth <= 0) return 0;
  return totalExpense / daysInMonth;
}

/**
 * 3. Average monthly expense calculated across the past 6 completed months (excluding the current ongoing month).
 */
export function calculateLast6CompletedMonthsAverage(
  transactions: Transaction[],
  referenceDate: Date = new Date()
): Last6MonthsAverageResult {
  const monthlyBreakdown: { monthKey: string; label: string; total: number }[] = [];
  let total = 0;

  // 6 completed months: subMonths(referenceDate, 6) up to subMonths(referenceDate, 1)
  // 1 is the most recent completed month (e.g. October if now is November)
  // 6 is 6 months prior (e.g. May if now is November)
  for (let i = 6; i >= 1; i--) {
    const targetMonth = subMonths(referenceDate, i);
    const monthKey = format(targetMonth, 'yyyy-MM');
    const label = format(targetMonth, 'MMM yyyy');

    const monthExpense = transactions.reduce((sum, t) => {
      if (t.type === 'expense' && t.date) {
        const txDate = new Date(t.date);
        if (isSameMonth(txDate, targetMonth) && isSameYear(txDate, targetMonth)) {
          return sum + (Number(t.amount) || 0);
        }
      }
      return sum;
    }, 0);

    total += monthExpense;
    monthlyBreakdown.push({
      monthKey,
      label,
      total: monthExpense,
    });
  }

  const oldestMonth = monthlyBreakdown[0]?.label || '';
  const newestMonth = monthlyBreakdown[monthlyBreakdown.length - 1]?.label || '';
  const rangeLabel = oldestMonth && newestMonth ? `${oldestMonth} – ${newestMonth}` : 'Last 6 completed months';

  const average = total / 6;

  return {
    average,
    total,
    monthsCount: 6,
    rangeLabel,
    monthlyBreakdown,
  };
}

/**
 * 4. Weekly Expenditure day-by-day starting from Sunday through Saturday for the current week.
 */
export function getWeeklyExpenditureData(
  transactions: Transaction[],
  referenceDate: Date = new Date()
): { weeklyData: DayExpenditure[]; totalWeekExpense: number; weekRangeLabel: string } {
  const sunday = startOfWeek(referenceDate, { weekStartsOn: 0 }); // Sunday
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData: DayExpenditure[] = [];
  let totalWeekExpense = 0;

  for (let i = 0; i < 7; i++) {
    const currentDay = addDays(sunday, i);
    const dayKey = format(currentDay, 'yyyy-MM-dd');
    const isTodayDay = isSameDay(currentDay, referenceDate);

    const dayExpense = transactions.reduce((sum, t) => {
      if (t.type === 'expense' && t.date) {
        const txDateStr = t.date.split('T')[0];
        if (txDateStr === dayKey) {
          return sum + (Number(t.amount) || 0);
        }
      }
      return sum;
    }, 0);

    totalWeekExpense += dayExpense;

    weeklyData.push({
      day: daysOfWeek[i],
      date: format(currentDay, 'MMM d'),
      amount: dayExpense,
      fullDate: format(currentDay, 'EEEE, MMM d, yyyy'),
      isToday: isTodayDay,
    });
  }

  const saturday = addDays(sunday, 6);
  const weekRangeLabel = `${format(sunday, 'MMM d')} – ${format(saturday, 'MMM d, yyyy')}`;

  return {
    weeklyData,
    totalWeekExpense,
    weekRangeLabel,
  };
}

/**
 * 5. Expenses grouped by category for the current month with percentage shares
 */
export function getCategoryExpenseBreakdown(
  transactions: Transaction[],
  categories: Category[],
  referenceDate: Date = new Date()
): { breakdown: CategoryExpenseShare[]; totalMonthlyExpense: number } {
  const categoryMap = new Map<string, Category>();
  categories.forEach(c => categoryMap.set(c.id, c));

  const expensesByCat: Record<string, number> = {};
  let totalMonthlyExpense = 0;

  transactions.forEach(t => {
    if (t.type === 'expense' && t.date) {
      const txDate = new Date(t.date);
      if (isSameMonth(txDate, referenceDate) && isSameYear(txDate, referenceDate)) {
        const catId = t.categoryId || 'uncategorized';
        const amt = Number(t.amount) || 0;
        expensesByCat[catId] = (expensesByCat[catId] || 0) + amt;
        totalMonthlyExpense += amt;
      }
    }
  });

  const breakdown: CategoryExpenseShare[] = Object.keys(expensesByCat).map(catId => {
    const category = categoryMap.get(catId);
    const value = expensesByCat[catId];
    const percentage = totalMonthlyExpense > 0 ? (value / totalMonthlyExpense) * 100 : 0;
    return {
      id: catId,
      name: category?.name || (catId === 'uncategorized' ? 'Uncategorized' : 'Other'),
      value,
      percentage: Number(percentage.toFixed(1)),
      color: category?.color || '#94a3b8',
    };
  }).sort((a, b) => b.value - a.value);

  return {
    breakdown,
    totalMonthlyExpense,
  };
}

/**
 * 6. Recent Expenses preview (top N latest expense transactions)
 */
export function getRecentExpenses(transactions: Transaction[], limit: number = 5): Transaction[] {
  return [...transactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
