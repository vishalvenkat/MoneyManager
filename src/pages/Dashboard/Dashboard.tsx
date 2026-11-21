import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../context/AccountContext';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { resolveAvatarUrl } from '../../utils/avatarUtils';
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
  ShoppingBag,
  Plus
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
import { AnimatedCounter } from '../../components/AnimatedCounter';
import { ScrollReveal } from '../../components/ScrollReveal';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { isNumbersHidden } = usePrivacy();

  const now = useMemo(() => new Date(), []);
  const currentMonthName = useMemo(() => format(now, 'MMMM yyyy'), [now]);
  const daysInCurrentMonth = useMemo(() => getDaysInMonth(now), [now]);

  // Personalized Greeting & User Details
  const userGreeting = useMemo(() => {
    const hour = now.getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17) {
      timeGreeting = 'Good evening';
    }

    const rawName = userProfile?.fullName || currentUser?.displayName;
    const cleanName = rawName?.trim();
    const greeting = cleanName ? `${timeGreeting}, ${cleanName}!` : 'Welcome back!';
    const formattedDate = format(now, 'EEEE, d MMMM yyyy');

    const avatarUrl = userProfile?.photoURL || 
      currentUser?.photoURL || 
      resolveAvatarUrl(userProfile?.avatarId, undefined, userProfile?.avatarGender || 'male');

    return {
      greeting,
      cleanName,
      formattedDate,
      avatarUrl
    };
  }, [now, userProfile, currentUser]);

  const handleAddTransaction = () => {
    navigate('/transactions', { state: { openAddModal: true } });
  };

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
    if (isNumbersHidden) return '***';
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
      {/* Overview Top Section: User Greeting Banner & Quick Action */}
      <section className="overview-greeting-banner" aria-label="User Greeting and Quick Actions">
        <div className="overview-greeting-content">
          <div className="overview-avatar-wrapper">
            <img 
              src={userGreeting.avatarUrl} 
              alt={userGreeting.cleanName || 'User profile'} 
              className="overview-avatar-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src = resolveAvatarUrl(undefined, undefined, 'male');
              }}
            />
          </div>
          <div className="overview-greeting-text">
            <h1 className="overview-greeting-title">{userGreeting.greeting}</h1>
            <p className="overview-greeting-subtitle">
              <span className="overview-date-pill">{userGreeting.formattedDate}</span>
              <span className="overview-subtext-message">Track your spending rhythm & account balances</span>
            </p>
          </div>
        </div>
        <div className="overview-actions">
          <button 
            type="button"
            className="btn btn-primary btn-add-transaction"
            onClick={handleAddTransaction}
            title="Add a new transaction"
          >
            <Plus size={18} />
            <span>Add Transaction</span>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ROW 1: Summary Metrics Cards (3 Cards)                    */}
      {/* ========================================================= */}
      <section className="dashboard-row row-metrics" aria-label="Monthly Expense Metrics">
        <ScrollReveal animation="fade-up" delay={50}>
          <div className="metrics-grid">
            {/* Card 1: Total Expense (This Month) */}
            <div className="metric-card card card-monthly-expense">
              <div className="metric-icon icon-expense">
                <TrendingDown size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Expense (This Month)</div>
                <div className="metric-value">
                  <AnimatedCounter value={monthlyExpense} formatter={(v) => formatCurrency(v)} />
                </div>
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
                <div className="metric-value">
                  <AnimatedCounter value={avgDailyExpense} formatter={(v) => formatCurrency(v)} />
                </div>
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
                <div className="metric-value">
                  <AnimatedCounter value={last6MonthsStats.average} formatter={(v) => formatCurrency(v)} />
                </div>
                <div className="metric-subtext">{last6MonthsStats.rangeLabel}</div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ========================================================= */}
      {/* ROW 2: Analytics Charts (2 Columns)                       */}
      {/* ========================================================= */}
      <section className="dashboard-row row-charts" aria-label="Expense Analytics Charts">
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="charts-grid">
            {/* Chart 1: Weekly Expenditure (Sun - Sat) */}
            <div className="card chart-card weekly-chart-card">
              <div className="chart-header">
                <div>
                  <h2 className="chart-title">Weekly Expenditure</h2>
                  <span className="chart-subtitle">{weekRangeLabel}</span>
                </div>
                <div className="chart-badge">
                  <AnimatedCounter value={totalWeekExpense} formatter={(v) => formatCurrency(v, true)} /> total
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
                      tickFormatter={(val) => isNumbersHidden ? '***' : (val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
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
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
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
                  <AnimatedCounter value={totalMonthlyExpense} formatter={(v) => formatCurrency(v, true)} /> total
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
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                            animationBegin={150}
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
        </ScrollReveal>
      </section>

      {/* ========================================================= */}
      {/* ROW 3: Recent Expenses                                    */}
      {/* ========================================================= */}
      <section className="dashboard-row row-recent" aria-label="Recent Expenses">
        <ScrollReveal animation="fade-up" delay={150}>
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
                          {isNumbersHidden ? '***' : `-${formatCurrency(t.amount)}`}
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
        </ScrollReveal>
      </section>
    </div>
  );
};
