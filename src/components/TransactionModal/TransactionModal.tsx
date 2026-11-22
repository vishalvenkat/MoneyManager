import React, { useState, useMemo, useEffect } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAccounts } from '../../context/AccountContext';
import { useCategories } from '../../context/CategoryContext';
import { usePrivacy } from '../../context/PrivacyContext';
import type { Transaction, TransactionType } from '../../types';
import { Modal } from '../Modal/Modal';
import { AutocompleteInput } from '../AutocompleteInput/AutocompleteInput';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import './TransactionModal.css';

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  defaultDate?: string;
  onSuccess?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  defaultDate,
  onSuccess,
}) => {
  const { transactions, addTransaction, updateTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { formatCurrency } = usePrivacy();

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form state whenever isOpen or transaction or defaultDate changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);

      if (transaction) {
        setType(transaction.type);
        setAmount(transaction.amount.toString());
        setDate(transaction.date.split('T')[0]);
        setCategoryId(transaction.categoryId || '');
        setSubcategory(transaction.subcategory || '');
        setAccountId(transaction.accountId || '');
        setFromAccountId(transaction.fromAccountId || '');
        setToAccountId(transaction.toAccountId || '');
        setNotes(transaction.notes || '');
      } else {
        setType('expense');
        setAmount('');
        setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
        const defaultCat = categories.find(c => c.type === 'expense');
        setCategoryId(defaultCat?.id || '');
        setSubcategory('');
        setAccountId(accounts[0]?.id || '');
        setFromAccountId(accounts[0]?.id || '');
        setToAccountId(accounts[1]?.id || '');
        setNotes('');
      }
    }
  }, [isOpen, transaction, defaultDate, categories, accounts]);

  // Extract unique historical notes
  const historicalNotes = useMemo(() => {
    const noteSet = new Set<string>();
    transactions.forEach(t => {
      if (t.notes && t.notes.trim()) {
        noteSet.add(t.notes.trim());
      }
    });
    return Array.from(noteSet).sort();
  }, [transactions]);

  // Smart Budget Logic & Subcategories
  const currentCategoryObj = useMemo(() => {
    return categories.find(c => c.id === categoryId);
  }, [categories, categoryId]);

  const availableSubcategories = useMemo(() => {
    return currentCategoryObj?.subcategories || [];
  }, [currentCategoryObj]);

  const currentMonthCategorySpend = useMemo(() => {
    if (!currentCategoryObj || !currentCategoryObj.budget || type !== 'expense') return 0;
    const baseDate = new Date(date);

    return transactions.reduce((sum, t) => {
      if (
        t.type === 'expense' &&
        t.categoryId === categoryId &&
        (!transaction || t.id !== transaction.id)
      ) {
        const txDate = new Date(t.date);
        if (txDate.getMonth() === baseDate.getMonth() && txDate.getFullYear() === baseDate.getFullYear()) {
          return sum + t.amount;
        }
      }
      return sum;
    }, 0);
  }, [transactions, categoryId, currentCategoryObj, type, transaction, date]);

  const renderBudgetAlert = () => {
    if (!currentCategoryObj?.budget || type !== 'expense') return null;
    const projectedSpend = currentMonthCategorySpend + (parseFloat(amount) || 0);
    const budget = currentCategoryObj.budget;
    const percentage = (projectedSpend / budget) * 100;

    if (percentage > 100) {
      return (
        <div className="budget-feedback budget-feedback-danger">
          <strong>Over Budget:</strong> You will exceed your monthly budget by {formatCurrency(projectedSpend - budget)}.
        </div>
      );
    } else if (percentage >= 80) {
      return (
        <div className="budget-feedback budget-feedback-warning">
          <strong>Warning:</strong> You are approaching your monthly limit. {formatCurrency(budget - projectedSpend)} remaining.
        </div>
      );
    } else {
      return (
        <div className="budget-feedback budget-feedback-success">
          <strong>On Track:</strong> You still have {formatCurrency(budget - projectedSpend)} available this month.
        </div>
      );
    }
  };

  const handleSwapAccounts = (e: React.MouseEvent) => {
    e.preventDefault();
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      return;
    }

    const isoDate = `${date}T12:00:00.000Z`;

    const txData: Omit<Transaction, 'id'> = {
      amount: amountNum,
      date: isoDate,
      type,
      notes,
    };

    if (type === 'transfer') {
      if (!fromAccountId || !toAccountId) {
        setErrorMessage('Please select both From and To accounts for the transfer.');
        return;
      }
      if (fromAccountId === toAccountId) {
        setErrorMessage('From Account and To Account cannot be the same.');
        return;
      }
      txData.fromAccountId = fromAccountId;
      txData.toAccountId = toAccountId;
    } else {
      if (!categoryId) {
        setErrorMessage('Please select a category.');
        return;
      }
      if (!accountId) {
        setErrorMessage('Please select an account.');
        return;
      }
      txData.categoryId = categoryId;
      txData.subcategory = subcategory || '';
      txData.accountId = accountId;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (transaction) {
        await updateTransaction(transaction.id, txData);
      } else {
        await addTransaction(txData);
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save transaction:', err);
      setErrorMessage((err as Error)?.message || 'Failed to save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={transaction ? 'Edit Transaction' : 'Add Transaction'}
      size="lg"
      layer="elevated"
    >
      <form onSubmit={handleSubmit} className="transaction-form">
        {errorMessage && (
          <div className="budget-feedback budget-feedback-danger" style={{ marginBottom: '1rem' }}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        {/* Transaction Type Segmented Control */}
        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="type-toggle">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map(tType => (
              <button
                key={tType}
                type="button"
                className={`toggle-btn ${type === tType ? 'active' : ''}`}
                onClick={() => {
                  setType(tType);
                  const defCat = categories.find(c => c.type === tType);
                  setCategoryId(defCat?.id || '');
                  if (!defCat?.subcategories?.includes(subcategory)) {
                    setSubcategory('');
                  }
                }}
              >
                {tType.charAt(0).toUpperCase() + tType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Date Row */}
        <div className="form-row">
          <div className="form-group flex-1">
            <label className="form-label">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="form-group flex-1">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Transfer vs Income/Expense Fields */}
        {type === 'transfer' ? (
          <div className="form-row form-row-transfer">
            <div className="form-group flex-1">
              <label className="form-label">From Account</label>
              <select
                className="form-input"
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                required
              >
                <option value="" disabled>Select Account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
            <div className="swap-account-wrapper">
              <button
                type="button"
                className="btn-swap-accounts"
                onClick={handleSwapAccounts}
                title="Swap From and To Accounts"
                aria-label="Swap From and To Accounts"
                disabled={!fromAccountId && !toAccountId}
              >
                <ArrowRightLeft size={18} />
              </button>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">To Account</label>
              <select
                className="form-input"
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                required
              >
                <option value="" disabled>Select Account</option>
                {accounts.filter(a => a.id !== fromAccountId).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={categoryId}
                  onChange={e => {
                    const newCatId = e.target.value;
                    setCategoryId(newCatId);
                    const newCat = categories.find(c => c.id === newCatId);
                    if (!newCat?.subcategories?.includes(subcategory)) {
                      setSubcategory('');
                    }
                  }}
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories.filter(c => c.type === type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Account</label>
                <select
                  className="form-input"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {availableSubcategories.length > 0 && (
              <div className="form-group">
                <label className="form-label">Subcategory (Optional)</label>
                <select
                  className="form-input"
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                >
                  <option value="">Select Subcategory (Optional)</option>
                  {availableSubcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* Budget Alert Feedback */}
        {renderBudgetAlert()}

        {/* Notes with Historical Suggestions */}
        <div className="form-group">
          <label className="form-label">Notes (Optional)</label>
          <AutocompleteInput
            value={notes}
            onChange={setNotes}
            suggestions={historicalNotes}
            placeholder="e.g. Grocery shopping, Rent, etc."
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || accounts.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="btn-spinner" /> Saving...
              </>
            ) : (
              'Save Transaction'
            )}
          </button>
        </div>

        {accounts.length === 0 && (
          <p className="no-accounts-warning">
            Please create an Account first before adding transactions.
          </p>
        )}
      </form>
    </Modal>
  );
};
