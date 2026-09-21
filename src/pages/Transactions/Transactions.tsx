import React, { useState, useMemo, useRef } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAccounts } from '../../context/AccountContext';
import { useCategories } from '../../context/CategoryContext';
import { useAuth } from '../../context/AuthContext';
import type { Transaction, TransactionType } from '../../types';
import { Plus, Edit2, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import { format } from 'date-fns';
import { excelService, type ImportSummary } from '../../services/excelService';
import './Transactions.css';

export const Transactions: React.FC = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');

  // Excel Import / Export State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
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
      setEditingTransaction(null);
      setType('expense');
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      const defaultCat = categories.find(c => c.type === 'expense');
      setCategoryId(defaultCat?.id || '');
      setSubcategory('');
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
      txData.subcategory = subcategory || '';
      txData.accountId = accountId;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, txData);
    } else {
      addTransaction(txData);
    }
    handleCloseModal();
  };

  // Export Handler
  const handleExportExcel = () => {
    excelService.exportTransactionsToExcel(transactions, accounts, categories);
  };

  // Open / Close Import Modal
  const handleOpenImportModal = () => {
    setSelectedFile(null);
    setIsImporting(false);
    setImportProgress({ processed: 0, total: 0 });
    setImportSummary(null);
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    if (isImporting) return;
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setImportSummary(null);
    setImportError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportError(null);
    }
  };

  // Start Import Process
  const handleExecuteImport = async () => {
    if (!selectedFile || !currentUser) return;

    setIsImporting(true);
    setImportError(null);
    setImportProgress({ processed: 0, total: 0 });

    try {
      const summary = await excelService.importTransactionsFromExcel(
        selectedFile,
        currentUser.uid,
        accounts,
        categories,
        (processed, total) => {
          setImportProgress({ processed, total });
        }
      );
      setImportSummary(summary);
    } catch (err: any) {
      console.error('Excel Import Error:', err);
      setImportError(err.message || 'Failed to parse and import Excel file.');
    } finally {
      setIsImporting(false);
    }
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

  // Smart Budget Logic & Subcategories helper
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
        (!editingTransaction || t.id !== editingTransaction.id)
      ) {
        const txDate = new Date(t.date);
        if (txDate.getMonth() === baseDate.getMonth() && txDate.getFullYear() === baseDate.getFullYear()) {
          return sum + t.amount;
        }
      }
      return sum;
    }, 0);
  }, [transactions, categoryId, currentCategoryObj, type, editingTransaction, date]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

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
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExportExcel} title="Export to Excel">
            <Download size={16} /> Export Excel
          </button>
          <button className="btn btn-secondary" onClick={handleOpenImportModal} title="Import from Excel">
            <Upload size={16} /> Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Add Transaction
          </button>
        </div>
      </div>

      <div className="transactions-list">
        {Object.keys(groupedTransactions).length === 0 && (
          <div className="card empty-state">No transactions recorded yet. Click "Import Excel" or "Add Transaction" to begin.</div>
        )}

        {Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => {
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
                        {isTransfer ? <ArrowRightLeft size={16} /> : (t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
                      </div>

                      <div className="tx-details">
                        <div className="tx-title">
                          {isTransfer ? (
                            'Fund Transfer'
                          ) : (
                            <>
                              {category?.name || 'Uncategorized'}
                              {t.subcategory && <span className="tx-subcategory-tag"> • {t.subcategory}</span>}
                            </>
                          )}
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
                          {t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(t.amount)}
                        </div>
                        <div className="tx-actions">
                          <button className="icon-btn-small" onClick={() => handleOpenModal(t)}>
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="icon-btn-small delete-btn"
                            onClick={() => {
                              if (window.confirm('Delete this transaction?')) deleteTransaction(t.id);
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

      {/* Add / Edit Transaction Modal */}
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

          {renderBudgetAlert()}

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
            <p style={{ color: 'var(--warning)', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'right' }}>
              Please create an Account first before adding transactions.
            </p>
          )}
        </form>
      </Modal>

      {/* Excel Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={handleCloseImportModal}
        title="Import Historical Transactions from Excel"
      >
        {!importSummary ? (
          <div>
            <p className="excel-import-description">
              Upload your Excel file (.xlsx, .xls) or CSV. MoneyManager will automatically parse columns for
              <strong> Date, Accounts, Category, Subcategory, Note, Amount, Income/Expense, Description</strong>,
              and auto-create any new accounts or categories missing from your profile.
            </p>

            <div
              className="excel-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet size={40} className="dropzone-icon" />
              {selectedFile ? (
                <div className="selected-file-name">{selectedFile.name}</div>
              ) : (
                <p>Click or drag Excel file here to upload</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {importError && (
              <div className="import-error-banner">
                <AlertCircle size={18} />
                <span>{importError}</span>
              </div>
            )}

            {isImporting && (
              <div className="import-progress-container">
                <div className="progress-status-text">
                  Processing row {importProgress.processed} of {importProgress.total}...
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: importProgress.total > 0 ? `${(importProgress.processed / importProgress.total) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseImportModal}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteImport}
                disabled={!selectedFile || isImporting}
              >
                {isImporting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="import-summary-view">
            <div className="summary-success-header">
              <CheckCircle2 size={48} className="success-icon" />
              <h3>Import Successfully Completed!</h3>
            </div>

            <div className="summary-metrics-grid">
              <div className="summary-metric">
                <span className="summary-val">{importSummary.totalImported}</span>
                <span className="summary-lbl">Transactions Imported</span>
              </div>
              <div className="summary-metric">
                <span className="summary-val">{importSummary.newAccountsCreated}</span>
                <span className="summary-lbl">New Accounts Created</span>
              </div>
              <div className="summary-metric">
                <span className="summary-val">{importSummary.newCategoriesCreated}</span>
                <span className="summary-lbl">New Categories Created</span>
              </div>
            </div>

            {importSummary.createdAccountNames.length > 0 && (
              <div className="summary-list-section">
                <strong>New Accounts Auto-Created:</strong>
                <div className="summary-tags">
                  {importSummary.createdAccountNames.map((name, idx) => (
                    <span key={idx} className="summary-tag">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {importSummary.createdCategoryNames.length > 0 && (
              <div className="summary-list-section">
                <strong>New Categories Auto-Created:</strong>
                <div className="summary-tags">
                  {importSummary.createdCategoryNames.map((name, idx) => (
                    <span key={idx} className="summary-tag">{name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseImportModal}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
