import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { isThisMonth, isThisQuarter, isThisYear } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import './Reports.css';

type ReportPeriod = 'month' | 'quarter' | 'year';

export const Reports: React.FC = () => {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      if (period === 'month') return isThisMonth(date);
      if (period === 'quarter') return isThisQuarter(date);
      if (period === 'year') return isThisYear(date);
      return false;
    });
  }, [transactions, period]);

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });
    return { totalIncome: income, totalExpense: expense };
  }, [filteredTransactions]);

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'expense' && t.categoryId) {
        data[t.categoryId] = (data[t.categoryId] || 0) + t.amount;
      }
    });

    return Object.keys(data).map(key => ({
      name: categories.find(c => c.id === key)?.name || 'Unknown',
      value: data[key],
      color: categories.find(c => c.id === key)?.color || '#ccc'
    })).sort((a,b) => b.value - a.value);
  }, [filteredTransactions, categories]);

  const incomeByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'income' && t.categoryId) {
        data[t.categoryId] = (data[t.categoryId] || 0) + t.amount;
      }
    });

    return Object.keys(data).map(key => ({
      name: categories.find(c => c.id === key)?.name || 'Unknown',
      value: data[key],
      color: categories.find(c => c.id === key)?.color || '#ccc'
    })).sort((a,b) => b.value - a.value);
  }, [filteredTransactions, categories]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const overviewData = [
    { name: 'Income', value: totalIncome, fill: 'var(--success)' },
    { name: 'Expense', value: totalExpense, fill: 'var(--danger)' },
  ];

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">Reports & Insights</h1>
      </div>

      <div className="period-tabs">
        <button className={`tab-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>This Month</button>
        <button className={`tab-btn ${period === 'quarter' ? 'active' : ''}`} onClick={() => setPeriod('quarter')}>This Quarter</button>
        <button className={`tab-btn ${period === 'year' ? 'active' : ''}`} onClick={() => setPeriod('year')}>This Year</button>
      </div>

      <div className="reports-grid">
        <div className="card overview-card">
          <h3 className="chart-title">Cash Flow Overview</h3>
          <div className="flow-stats">
            <div className="stat-box">
              <span className="stat-label">Total Income</span>
              <span className="stat-value income">+{formatCurrency(totalIncome)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Total Expense</span>
              <span className="stat-value expense">-{formatCurrency(totalExpense)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Net Savings</span>
              <span className={`stat-value ${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </span>
            </div>
          </div>
          
          <div className="chart-container mt-4" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overviewData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" tickFormatter={(val) => `$${val}`} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-primary)', fontWeight: 500 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(val: any) => formatCurrency(val)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {overviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card breakdown-card">
          <h3 className="chart-title">Expense Breakdown</h3>
          <div className="chart-container">
            {expensesByCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => formatCurrency(val)} contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="category-list-mini">
                  {expensesByCategory.map(cat => (
                    <div key={cat.name} className="cat-mini-item">
                      <div className="cat-mini-left">
                        <span className="cat-mini-color" style={{ backgroundColor: cat.color }}></span>
                        <span>{cat.name}</span>
                      </div>
                      <span className="cat-mini-val">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-chart">No expenses for this period.</div>
            )}
          </div>
        </div>

        <div className="card breakdown-card">
          <h3 className="chart-title">Income Breakdown</h3>
          <div className="chart-container">
            {incomeByCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={incomeByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {incomeByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => formatCurrency(val)} contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="category-list-mini">
                  {incomeByCategory.map(cat => (
                    <div key={cat.name} className="cat-mini-item">
                      <div className="cat-mini-left">
                        <span className="cat-mini-color" style={{ backgroundColor: cat.color }}></span>
                        <span>{cat.name}</span>
                      </div>
                      <span className="cat-mini-val">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-chart">No income for this period.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
