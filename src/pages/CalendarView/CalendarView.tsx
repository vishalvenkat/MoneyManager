import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { useAccounts } from '../../context/AccountContext';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowRightLeft,
  Plus, Edit2, Trash2
} from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import { ConfirmDialog } from '../../components/Modal/ConfirmDialog';
import { TransactionModal } from '../../components/TransactionModal/TransactionModal';
import { ScrollReveal } from '../../components/ScrollReveal';
import { usePrivacy } from '../../context/PrivacyContext';
import { MONTHS } from '../../utils/reportUtils';
import type { Transaction } from '../../types';
import './CalendarView.css';

export const CalendarView: React.FC = () => {
  const { transactions, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { isNumbersHidden, formatCurrency } = usePrivacy();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const formatCellCurrency = (amount: number) => {
    if (isNumbersHidden) return '***';
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
    setIsDayDetailOpen(true);
  };

  const handleOpenAddTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  };

  const handleOpenEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
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
                <div className="stat income" title={isNumbersHidden ? 'Hidden' : `+${formatCurrency(income)}`}>
                  <span className="stat-text-desktop">{isNumbersHidden ? '***' : `+${formatCurrency(income)}`}</span>
                  <span className="stat-text-mobile">{isNumbersHidden ? '***' : `+${formatCellCurrency(income)}`}</span>
                </div>
              )}
              {expense > 0 && (
                <div className="stat expense" title={isNumbersHidden ? 'Hidden' : `-${formatCurrency(expense)}`}>
                  <span className="stat-text-desktop">{isNumbersHidden ? '***' : `-${formatCurrency(expense)}`}</span>
                  <span className="stat-text-mobile">{isNumbersHidden ? '***' : `-${formatCellCurrency(expense)}`}</span>
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

  const selectedDayTotals = useMemo(() => {
    const income = selectedDayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = selectedDayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense };
  }, [selectedDayTransactions]);

  const getCategoryTheme = (id?: string) => categories.find(c => c.id === id);
  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name;

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
      </div>

      <ScrollReveal animation="fade-up" delay={50}>
        <div className="card calendar-container">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
      </ScrollReveal>

      {/* Selected Day Transactions Modal */}
      <Modal
        isOpen={isDayDetailOpen}
        onClose={() => setIsDayDetailOpen(false)}
        title={selectedDate ? `Transactions for ${format(selectedDate, 'MMM d, yyyy')}` : 'Transactions'}
        size="md"
      >
        <div className="day-modal-toolbar">
          <div className="day-modal-totals">
            {selectedDayTotals.income > 0 && (
              <span className="day-total-badge income" title={`Income: +${formatCurrency(selectedDayTotals.income)}`}>
                <TrendingUp size={13} /> +{isNumbersHidden ? '***' : formatCurrency(selectedDayTotals.income)}
              </span>
            )}
            {selectedDayTotals.expense > 0 && (
              <span className="day-total-badge expense" title={`Expense: -${formatCurrency(selectedDayTotals.expense)}`}>
                <TrendingDown size={13} /> -{isNumbersHidden ? '***' : formatCurrency(selectedDayTotals.expense)}
              </span>
            )}
            {selectedDayTotals.income === 0 && selectedDayTotals.expense === 0 && selectedDayTransactions.length > 0 && (
              <span className="day-total-badge neutral">
                {selectedDayTransactions.length} {selectedDayTransactions.length === 1 ? 'Transfer' : 'Transfers'}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary add-day-tx-btn"
            onClick={handleOpenAddTransaction}
            title="Add Transaction for this date"
            aria-label="Add Transaction for this date"
          >
            <Plus size={16} /> <span>Add Transaction</span>
          </button>
        </div>

        <div className="day-detail-list">
          {selectedDayTransactions.length === 0 ? (
            <div className="day-detail-empty">
              <p>No transactions recorded on this day.</p>
              <button
                type="button"
                className="btn btn-primary add-day-tx-btn-empty"
                onClick={handleOpenAddTransaction}
              >
                <Plus size={16} /> Add Transaction
              </button>
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
                          {t.subcategory && <span className="detail-subcategory-tag"> • {t.subcategory}</span>}
                        </>
                      )}
                    </div>
                    <div className="detail-subtitle">
                      {isTransfer
                        ? `${getAccountName(t.fromAccountId)} → ${getAccountName(t.toAccountId)}`
                        : getAccountName(t.accountId)
                      }
                      {t.notes && <span className="detail-notes-tag"> • {t.notes}</span>}
                    </div>
                  </div>
                  <div className="detail-right">
                    <div className={`detail-amount ${t.type}`}>
                      {isNumbersHidden ? '***' : `${t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}${formatCurrency(t.amount)}`}
                    </div>
                    <div className="detail-actions">
                      <button
                        type="button"
                        className="action-btn-mini edit-btn"
                        onClick={() => handleOpenEditTransaction(t)}
                        title="Edit Transaction"
                        aria-label="Edit Transaction"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        className="action-btn-mini delete-btn"
                        onClick={() => handleDeleteTransaction(t.id)}
                        title="Delete Transaction"
                        aria-label="Delete Transaction"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        transaction={editingTransaction}
        defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />

      {/* Standardized Delete Transaction Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
