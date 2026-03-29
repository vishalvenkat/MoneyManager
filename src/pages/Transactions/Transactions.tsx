import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAccounts } from '../../context/AccountContext';
import { useCategories } from '../../context/CategoryContext';
import type { Transaction, TransactionType } from '../../types';
import { Plus, Edit2, Trash2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import { format } from 'date-fns';
import './Transactions.css';

export const Transactions: React.FC = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDate(transaction.date.split('T')[0]);
      setCategoryId(transaction.categoryId || '');
      setAccountId(transaction.accountId || '');
      setFromAccountId(transaction.fromAccountId || '');
      setToAccountId(transaction.toAccountId || '');
      setNotes(transaction.notes || '');
    } else {
      setEditingTransaction(null);
      setType('expense');
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setCategoryId(categories.find(c => c.type === 'expense')?.id || '');
      setAccountId(accounts[0]?.id || '');
      setFromAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || '');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    
    // Construct ISO date string (we just use YYYY-MM-DD representing that day)
    const isoDate = `${date}T12:00:00.000Z`;

    const txData: Omit<Transaction, 'id'> = {
      amount: amountNum,
      date: isoDate,
      type,
      notes,
    };

    if (type === 'transfer') {
      txData.fromAccountId = fromAccountId;
      txData.toAccountId = toAccountId;
    } else {
      txData.categoryId = categoryId;
      txData.accountId = accountId;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, txData);
    } else {
      addTransaction(txData);
    }
    handleCloseModal();
  };

  // Group transactions by day
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sorted.forEach(t => {
      const dayKey = t.date.split('T')[0];
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(t);
    });
    return groups;
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getCategoryTheme = (id?: string) => {
    return categories.find(c => c.id === id);
  };

  const getAccountName = (id?: string) => {
    return accounts.find(a => a.id === id)?.name;
  };

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      <div className="transactions-list">
        {Object.keys(groupedTransactions).length === 0 && (
          <div className="card empty-state">No transactions recorded yet.</div>
        )}
        
        {Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => {
          const dayTransactions = groupedTransactions[dateKey];
          const dateObj = new Date(dateKey + 'T12:00:00Z');
          
          return (
            <div key={dateKey} className="day-group">
              <div className="day-header">
                <h3>{format(dateObj, 'MMM d, yyyy')}</h3>
                <span className="day-subtitle">{format(dateObj, 'EEEE')}</span>
              </div>
              
              <div className="day-items card">
                {dayTransactions.map(t => {
                  const category = getCategoryTheme(t.categoryId);
                  const isTransfer = t.type === 'transfer';
                  
                  return (
                    <div key={t.id} className="transaction-row">
                      <div className="tx-icon" style={{ backgroundColor: isTransfer ? '#6366f1' : category?.color || '#ccc' }}>
                        {isTransfer ? <ArrowRightLeft size={16} /> : (t.type === 'income' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>)}
                      </div>
                      
                      <div className="tx-details">
                        <div className="tx-title">
                          {isTransfer ? 'Fund Transfer' : category?.name || 'Uncategorized'}
                        </div>
                        <div className="tx-subtitle">
                          {isTransfer 
                            ? `${getAccountName(t.fromAccountId)} → ${getAccountName(t.toAccountId)}`
                            : getAccountName(t.accountId)
                          }
                          {t.notes && ` • ${t.notes}`}
                        </div>
                      </div>
                      
                      <div className="tx-amount-actions">
                        <div className={`tx-amount ${t.type}`}>
                          {t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}{formatCurrency(t.amount)}
                        </div>
                        <div className="tx-actions">
                          <button className="icon-btn-small" onClick={() => handleOpenModal(t)}>
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="icon-btn-small delete-btn" 
                            onClick={() => {
                              if(window.confirm('Delete this transaction?')) deleteTransaction(t.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="type-toggle">
              {(['expense', 'income', 'transfer'] as TransactionType[]).map(tType => (
                <button
                  key={tType}
                  type="button"
                  className={`toggle-btn ${type === tType ? 'active' : ''}`}
                  onClick={() => setType(tType)}
                >
                  {tType.charAt(0).toUpperCase() + tType.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
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

          {type === 'transfer' ? (
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">From Account</label>
                <select 
                  className="form-input" 
                  value={fromAccountId} 
                  onChange={e => setFromAccountId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.currentBalance)})</option>)}
                </select>
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
                  {accounts.filter(a => a.id !== fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.currentBalance)})</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Category</label>
                <select 
                  className="form-input" 
                  value={categoryId} 
                  onChange={e => setCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={accounts.length === 0}>
              Save Transaction
            </button>
          </div>
          {accounts.length === 0 && (
            <p style={{color: 'var(--warning)', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'right'}}>
              Please create an Account first before adding transactions.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
};
