import React, { useMemo } from 'react';
import { useAccounts } from '../../context/AccountContext';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { format, isThisMonth } from 'date-fns';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { categories } = useCategories();

  // Summary Metrics
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  }, [accounts]);

  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (isThisMonth(new Date(t.date))) {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
      }
    });
    return { monthlyIncome: income, monthlyExpense: expense };
  }, [transactions]);

  // Chart Data: Expense by Category
  const expenseByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && isThisMonth(new Date(t.date))) {
        data[t.categoryId!] = (data[t.categoryId!] || 0) + t.amount;
      }
    });
    return Object.keys(data).map(key => ({
      name: categories.find(c => c.id === key)?.name || 'Unknown',
      value: data[key],
      color: categories.find(c => c.id === key)?.color || '#ccc'
    })).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // Budget Usage Data
  const budgetUsageData = useMemo(() => {
    return categories
      .filter(c => c.type === 'expense' && c.budget && c.budget > 0)
      .map(cat => {
        let spent = 0;
        transactions.forEach(t => {
          if (t.type === 'expense' && t.categoryId === cat.id && isThisMonth(new Date(t.date))) {
            spent += t.amount;
          }
        });
        const percentage = Math.min((spent / cat.budget!) * 100, 100);
        const rawPercentage = (spent / cat.budget!) * 100;

        let status: 'success' | 'warning' | 'danger' = 'success';
        if (rawPercentage > 100) status = 'danger';
        else if (rawPercentage >= 80) status = 'warning';

        return {
          ...cat,
          spent,
          budget: cat.budget!,
          percentage,
          rawPercentage,
          status
        };
      })
      .sort((a, b) => b.rawPercentage - a.rawPercentage);
  }, [categories, transactions]);

  // Chart Data: Last 7 Days Overview
  const last7DaysData = useMemo(() => {
    const data: Record<string, { name: string, income: number, expense: number }> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'MMM dd');
      data[format(d, 'yyyy-MM-dd')] = { name: dateStr, income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const dayKey = t.date.split('T')[0];
      if (data[dayKey]) {
        if (t.type === 'income') data[dayKey].income += t.amount;
        if (t.type === 'expense') data[dayKey].expense += t.amount;
      }
    });

    return Object.values(data);
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getCategoryTheme = (id?: string) => {
    return categories.find(c => c.id === id);
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="metrics-grid">
        <div className="metric-card card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
            <Wallet size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Balance</div>
            <div className="metric-value">{formatCurrency(totalBalance)}</div>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Monthly Income</div>
            <div className="metric-value">{formatCurrency(monthlyIncome)}</div>
          </div>
        </div>

        <div className="metric-card card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <TrendingDown size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Monthly Expense</div>
            <div className="metric-value">{formatCurrency(monthlyExpense)}</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3 className="chart-title">Income vs Expense (Last 7 Days)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip cursor={{ fill: 'var(--bg-primary)' }} contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                <Bar dataKey="income" name="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3 className="chart-title">Expenses by Category (This Month)</h3>
          <div className="chart-container">
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => formatCurrency(val)} contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No expenses this month.</div>
            )}
            {expenseByCategory.length > 0 && (
              <div className="pie-legend">
                {expenseByCategory.map(cat => (
                  <div key={cat.name} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: cat.color }}></span>
                    <span className="legend-label">{cat.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {budgetUsageData.length > 0 && (
        <div className="card budget-card">
          <h3 className="chart-title">Budget Usage (This Month)</h3>
          <div className="budget-list">
            {budgetUsageData.map(item => (
              <div key={item.id} className="budget-item">
                <div className="budget-header">
                  <span className="budget-category">
                    <span className="budget-color-swatch" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="budget-amounts">
                    {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                  </span>
                </div>
                <div className="budget-progress-bg">
                  <div
                    className={`budget-progress-fill bg-${item.status}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                {item.status === 'danger' && (
                  <div className="budget-overage-text">
                    Exceeded by {formatCurrency(item.spent - item.budget)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card recent-transactions-card">
        <h3 className="chart-title">Recent Transactions</h3>
        <div className="recent-list">
          {recentTransactions.map(t => {
            const category = getCategoryTheme(t.categoryId);
            const isTransfer = t.type === 'transfer';
            return (
              <div key={t.id} className="recent-item">
                <div className="recent-icon" style={{ backgroundColor: isTransfer ? '#6366f1' : category?.color || '#ccc' }}>
                  {isTransfer ? <TrendingUp size={16} /> : (t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
                </div>
                <div className="recent-details">
                  <div className="recent-title">{isTransfer ? 'Transfer' : category?.name || 'Uncategorized'}</div>
                  <div className="recent-date">{format(new Date(t.date), 'MMM dd, yyyy')}</div>
                </div>
                <div className={`recent-amount ${t.type}`}>
                  {t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}{formatCurrency(t.amount)}
                </div>
              </div>
            );
          })}
          {recentTransactions.length === 0 && (
            <div className="empty-list">No recent transactions.</div>
          )}
        </div>
      </div>
    </div>
  );
};
