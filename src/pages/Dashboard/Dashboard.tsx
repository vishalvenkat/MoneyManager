import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccounts } from '../../context/AccountContext';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingDown, 
  Calendar, 
  History, 
  ArrowRight, 
  PieChart as PieChartIcon,
  ShoppingBag
} from 'lucide-react';
import { format, getDaysInMonth } from 'date-fns';
import {
  calculateMonthlyExpense,
  calculateDailyAverageExpense,
  calculateLast6CompletedMonthsAverage,
  getWeeklyExpenditureData,
  getCategoryExpenseBreakdown,
  getRecentExpenses
} from '../../utils/dashboardUtils';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { categories } = useCategories();

  const now = useMemo(() => new Date(), []);
  const currentMonthName = useMemo(() => format(now, 'MMMM yyyy'), [now]);
  const daysInCurrentMonth = useMemo(() => getDaysInMonth(now), [now]);

  // -------------------------------------------------------------
  // Row 1: Summary Metrics Cards
  // -------------------------------------------------------------
  // Card 1: Total Expense (This Month)
  const monthlyExpense = useMemo(() => {
    return calculateMonthlyExpense(transactions, now);
  }, [transactions, now]);

  // Card 2: Average Daily Expense (This Month) = Total Expense / Total Days in Month
  const avgDailyExpense = useMemo(() => {
    return calculateDailyAverageExpense(monthlyExpense, now);
  }, [monthlyExpense, now]);

  // Card 3: Last 6 Completed Months Expense Average
  const last6MonthsStats = useMemo(() => {
    return calculateLast6CompletedMonthsAverage(transactions, now);
  }, [transactions, now]);

  // -------------------------------------------------------------
  // Row 2: Analytics Charts (Weekly Expenditure & Expenses by Category)
  // -------------------------------------------------------------
  // First Chart: Weekly Expenditure (Sunday to Saturday)
  const { weeklyData, totalWeekExpense, weekRangeLabel } = useMemo(() => {
    return getWeeklyExpenditureData(transactions, now);
  }, [transactions, now]);

  // Second Chart: Expenses by Category with percentage shares
  const { breakdown: categoryBreakdown, totalMonthlyExpense } = useMemo(() => {
    return getCategoryExpenseBreakdown(transactions, categories, now);
  }, [transactions, categories, now]);

  // -------------------------------------------------------------
  // Row 3: Recent Expenses Preview
  // -------------------------------------------------------------
  const recentExpenses = useMemo(() => {
    return getRecentExpenses(transactions, 5);
  }, [transactions]);

  // Currency Formatter
  const formatCurrency = (amount: number, compact: boolean = false) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: compact ? 0 : 2 
    }).format(amount);
  };

  const getCategoryTheme = (id?: string) => {
    return categories.find(c => c.id === id);
  };

  const getAccountName = (id?: string) => {
    return accounts.find(a => a.id === id)?.name || 'Account';
  };

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Track your monthly expenses, weekly spending rhythm, and category allocations.</p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 1: Summary Metrics Cards (3 Cards)                    */}
      {/* ========================================================= */}
      <section className="dashboard-row row-metrics" aria-label="Monthly Expense Metrics">
        <div className="metrics-grid">
          {/* Card 1: Total Expense (This Month) */}
          <div className="metric-card card card-monthly-expense">
            <div className="metric-icon icon-expense">
              <TrendingDown size={24} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Expense (This Month)</div>
              <div className="metric-value">{formatCurrency(monthlyExpense)}</div>
              <div className="metric-subtext">Recorded in {currentMonthName}</div>
            </div>
          </div>

          {/* Card 2: Average Daily Expense (This Month) */}
          <div className="metric-card card card-daily-avg">
            <div className="metric-icon icon-daily">
              <Calendar size={24} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Average Daily Expense</div>
              <div className="metric-value">{formatCurrency(avgDailyExpense)}</div>
              <div className="metric-subtext">Across {daysInCurrentMonth} days in {format(now, 'MMMM')}</div>
            </div>
          </div>

          {/* Card 3: Last 6 Completed Months Expense Average */}
          <div className="metric-card card card-six-month-avg">
            <div className="metric-icon icon-history">
              <History size={24} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Last 6 Months Average</div>
              <div className="metric-value">{formatCurrency(last6MonthsStats.average)}</div>
              <div className="metric-subtext">{last6MonthsStats.rangeLabel}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ROW 2: Analytics Charts (2 Columns)                       */}
      {/* ========================================================= */}
      <section className="dashboard-row row-charts" aria-label="Expense Analytics Charts">
        <div className="charts-grid">
          {/* Chart 1: Weekly Expenditure (Sun - Sat) */}
          <div className="card chart-card weekly-chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">Weekly Expenditure</h2>
                <span className="chart-subtitle">{weekRangeLabel}</span>
              </div>
              <div className="chart-badge">
                {formatCurrency(totalWeekExpense, true)} total
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} 
                    tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'var(--bg-primary)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="custom-tooltip card">
                            <p className="tooltip-title">{data.fullDate}</p>
                            <p className="tooltip-value">
                              Expense: <strong>{formatCurrency(data.amount)}</strong>
                            </p>
                            {data.isToday && <span className="tooltip-today-badge">Today</span>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    name="Daily Expense" 
                    radius={[6, 6, 0, 0]} 
                    fill="var(--danger)"
                  >
                    {weeklyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isToday ? 'var(--danger)' : 'rgba(239, 68, 68, 0.75)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-footer-note">
                Week cycles from <strong>Sunday</strong> through <strong>Saturday</strong>.
              </div>
            </div>
          </div>

          {/* Chart 2: Expenses by Category (Current Month) */}
          <div className="card chart-card category-chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">Expenses by Category</h2>
                <span className="chart-subtitle">{currentMonthName}</span>
              </div>
              <div className="chart-badge">
                {formatCurrency(totalMonthlyExpense, true)} total
              </div>
            </div>

            <div className="chart-container category-chart-container">
              {categoryBreakdown.length > 0 ? (
                <>
                  <div className="donut-chart-wrapper">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Spent']}
                          contentStyle={{ 
                            backgroundColor: 'var(--card-bg)', 
                            borderColor: 'var(--border-color)', 
                            color: 'var(--text-primary)', 
                            borderRadius: '8px' 
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Breakdown Progress List */}
                  <div className="category-breakdown-list">
                    {categoryBreakdown.map(cat => (
                      <div key={cat.id} className="category-breakdown-item">
                        <div className="category-item-header">
                          <div className="category-item-info">
                            <span className="category-item-dot" style={{ backgroundColor: cat.color }} />
                            <span className="category-item-name">{cat.name}</span>
                          </div>
                          <div className="category-item-amounts">
                            <span className="category-item-percent">{cat.percentage}%</span>
                            <span className="category-item-total">{formatCurrency(cat.value)}</span>
                          </div>
                        </div>
                        <div className="category-progress-bg">
                          <div 
                            className="category-progress-fill" 
                            style={{ 
                              width: `${Math.min(cat.percentage, 100)}%`, 
                              backgroundColor: cat.color 
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-chart">
                  <PieChartIcon size={40} className="empty-chart-icon" />
                  <p>No expenses recorded in {currentMonthName}.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ROW 3: Recent Expenses                                    */}
      {/* ========================================================= */}
      <section className="dashboard-row row-recent" aria-label="Recent Expenses">
        <div className="card recent-expenses-card">
          <div className="recent-card-header">
            <div>
              <h2 className="chart-title">Recent Expenses</h2>
              <span className="chart-subtitle">Latest spending transactions recorded</span>
            </div>
            <Link to="/transactions" className="btn-view-all">
              <span>View All Transactions</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="recent-list">
            {recentExpenses.length > 0 ? (
              recentExpenses.map(t => {
                const category = getCategoryTheme(t.categoryId);
                const accountName = getAccountName(t.accountId);

                return (
                  <div key={t.id} className="recent-item">
                    <div 
                      className="recent-icon" 
                      style={{ backgroundColor: category?.color || '#ef4444' }}
                    >
                      <ShoppingBag size={18} />
                    </div>

                    <div className="recent-details">
                      <div className="recent-title">
                        {category?.name || 'Uncategorized'}
                        {t.subcategory && (
                          <span className="recent-subcategory-tag"> • {t.subcategory}</span>
                        )}
                      </div>
                      <div className="recent-subtitle">
                        {accountName}
                        {t.notes && ` • ${t.notes}`}
                      </div>
                    </div>

                    <div className="recent-meta">
                      <div className="recent-date">{format(new Date(t.date), 'MMM dd, yyyy')}</div>
                      <div className="recent-amount expense">
                        -{formatCurrency(t.amount)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-list">
                <ShoppingBag size={36} className="empty-list-icon" />
                <p>No expenses recorded yet.</p>
                <Link to="/transactions" className="empty-action-link">Add your first expense</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
