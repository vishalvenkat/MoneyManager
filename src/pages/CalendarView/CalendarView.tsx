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
import type { Transaction } from '../../types';
import './CalendarView.css';

export const CalendarView: React.FC = () => {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
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
        <button className="icon-btn" onClick={prevMonth}>
          <ChevronLeft size={24} />
        </button>
        <span className="calendar-month-title">
          {format(currentDate, 'MMMM yyyy')}
        </span>
        <button className="icon-btn" onClick={nextMonth}>
          <ChevronRight size={24} />
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
              {income > 0 && <div className="stat income">+{formatCurrency(income)}</div>}
              {expense > 0 && <div className="stat expense">-{formatCurrency(expense)}</div>}
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
                    {isTransfer ? <ArrowRightLeft size={16}/> : (t.type === 'income' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>)}
                  </div>
                  <div className="detail-info">
                    <div className="detail-title">{isTransfer ? 'Transfer' : category?.name || 'Uncategorized'}</div>
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
