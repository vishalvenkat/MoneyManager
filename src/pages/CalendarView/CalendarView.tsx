import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { useAccounts } from '../../context/AccountContext';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays
} from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import { MONTHS } from '../../utils/reportUtils';
import type { Transaction } from '../../types';
import './CalendarView.css';

export const CalendarView: React.FC = () => {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>();
    for (let y = currentYear - 5; y <= currentYear + 2; y++) {
      yearsSet.add(y);
    }
    transactions.forEach(t => {
      if (t.date) {
        const y = new Date(t.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    yearsSet.add(currentDate.getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentDate]);

  const handleMonthChange = (newMonth: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(prev => new Date(newYear, prev.getMonth(), 1));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatCellCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 1000).toFixed(0)}k`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1).replace('.0', '')}k`;
    }
    return `₹${amount}`;
  };

  const getDayTransactions = (day: Date) => {
    return transactions.filter(t => isSameDay(new Date(t.date), day));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <div className="calendar-nav-controls">
          <button 
            type="button" 
            className="icon-btn calendar-nav-btn" 
            onClick={prevMonth}
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="calendar-selects-group">
            <select
              className="calendar-select calendar-select-month"
              value={currentDate.getMonth()}
              onChange={e => handleMonthChange(Number(e.target.value))}
              aria-label="Select Month"
            >
              {MONTHS.map((mName, idx) => (
                <option key={idx} value={idx}>{mName}</option>
              ))}
            </select>

            <select
              className="calendar-select calendar-select-year"
              value={currentDate.getFullYear()}
              onChange={e => handleYearChange(Number(e.target.value))}
              aria-label="Select Year"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button 
            type="button" 
            className="icon-btn calendar-nav-btn" 
            onClick={nextMonth}
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button 
          type="button" 
          className="btn-today"
          onClick={() => setCurrentDate(new Date())}
          title="Jump to Current Month"
        >
          Today
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    let startDate = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="calendar-day-name" key={i}>
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div className="calendar-days-row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;

        const dayTxs = getDayTransactions(day);
        const income = dayTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const expense = dayTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

        days.push(
          <div
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
            key={day.toString()}
            onClick={() => handleDayClick(cloneDay)}
          >
            <span className="calendar-cell-date">{formattedDate}</span>
            <div className="calendar-cell-stats">
              {income > 0 && (
                <div className="stat income" title={`+${formatCurrency(income)}`}>
                  <span className="stat-text-desktop">+{formatCurrency(income)}</span>
                  <span className="stat-text-mobile">+{formatCellCurrency(income)}</span>
                </div>
              )}
              {expense > 0 && (
                <div className="stat expense" title={`-${formatCurrency(expense)}`}>
                  <span className="stat-text-desktop">-{formatCurrency(expense)}</span>
                  <span className="stat-text-mobile">-{formatCellCurrency(expense)}</span>
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-row" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="calendar-grid">{rows}</div>;
  };

  // Day detail modal logic
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return getDayTransactions(selectedDate);
  }, [selectedDate, transactions]);

  const getCategoryTheme = (id?: string) => categories.find(c => c.id === id);
  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name;

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
      </div>

      <div className="card calendar-container">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Transactions for ${selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}`}
      >
        <div className="day-detail-list">
          {selectedDayTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
              No transactions on this day.
            </div>
          ) : (
            selectedDayTransactions.map((t: Transaction) => {
              const category = getCategoryTheme(t.categoryId);
              const isTransfer = t.type === 'transfer';
              return (
                <div key={t.id} className="detail-item">
                  <div className="detail-icon" style={{ backgroundColor: isTransfer ? '#6366f1' : category?.color || '#ccc' }}>
                    {isTransfer ? <ArrowRightLeft size={16} /> : (t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
                  </div>
                  <div className="detail-info">
                    <div className="detail-title">
                      {isTransfer ? (
                        'Transfer'
                      ) : (
                        <>
                          {category?.name || 'Uncategorized'}
                          {t.subcategory && <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}> • {t.subcategory}</span>}
                        </>
                      )}
                    </div>
                    <div className="detail-subtitle">
                      {isTransfer
                        ? `${getAccountName(t.fromAccountId)} → ${getAccountName(t.toAccountId)}`
                        : getAccountName(t.accountId)
                      }
                    </div>
                  </div>
                  <div className={`detail-amount ${t.type}`}>
                    {t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}{formatCurrency(t.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};
