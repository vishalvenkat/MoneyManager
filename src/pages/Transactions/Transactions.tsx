import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactions } from '../../context/TransactionContext';
import { useAccounts } from '../../context/AccountContext';
import { useCategories } from '../../context/CategoryContext';
import type { Transaction, TransactionType } from '../../types';
import { Plus, Edit2, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, FilterX, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import { format } from 'date-fns';
import { getAvailableFilterCounts, matchesFiltersExcept, type ActiveFilters } from '../../utils/filterUtils';
import { AutocompleteInput } from '../../components/AutocompleteInput/AutocompleteInput';
import { 
  calculateClosingBalances, 
  getFormattedClosingBalance, 
  compareTransactionsDesc 
} from '../../utils/balanceUtils';
import './Transactions.css';

export const Transactions: React.FC = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Filtering State & Panel Collapse Toggle
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubcategory, setFilterSubcategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (filterAccount !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterSubcategory !== 'all') count++;
    if (filterType !== 'all') count++;
    return count;
  }, [searchQuery, startDate, endDate, filterAccount, filterCategory, filterSubcategory, filterType]);

  // Collect all unique subcategories across categories and transactions
  const allSubcategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach(c => {
      c.subcategories?.forEach(sub => set.add(sub));
    });
    transactions.forEach(t => {
      if (t.subcategory) set.add(t.subcategory);
    });
    return Array.from(set).sort();
  }, [categories, transactions]);

  // Active filters object
  const activeFilters = useMemo<ActiveFilters>(() => ({
    searchQuery,
    startDate,
    endDate,
    filterAccount,
    filterCategory,
    filterSubcategory,
    filterType,
  }), [searchQuery, startDate, endDate, filterAccount, filterCategory, filterSubcategory, filterType]);

  // Compute dynamic cascading counts for each filter option
  const filterCounts = useMemo(() => {
    return getAvailableFilterCounts(
      transactions,
      accounts,
      categories,
      allSubcategories,
      activeFilters
    );
  }, [transactions, accounts, categories, allSubcategories, activeFilters]);

  // Filter transactions based on active filters (state retention works even when panel is hidden)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => matchesFiltersExcept(t, activeFilters));
  }, [transactions, activeFilters]);

  // Chronologically compute closing balances per account across all historical transactions (memoized)
  const closingBalanceMap = useMemo(() => {
    return calculateClosingBalances(transactions, accounts);
  }, [transactions, accounts]);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, filterAccount, filterCategory, filterSubcategory, filterType, pageSize]);

  // Pagination Calculations
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort(compareTransactionsDesc);
    return sorted.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, startIndex, pageSize]);

  // Group paginated transactions by day
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    paginatedTransactions.forEach(t => {
      const dayKey = t.date.split('T')[0];
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(t);
    });
    return groups;
  }, [paginatedTransactions]);

  const hasActiveFilters = activeFilterCount > 0;

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setFilterAccount('all');
    setFilterCategory('all');
    setFilterSubcategory('all');
    setFilterType('all');
    setCurrentPage(1);
  };

  const handleOpenModal = useCallback((transaction?: Transaction) => {
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
  }, [categories, accounts]);

  // Quick Action Shortcut: Automatically open the Add Transaction modal if navigated with openAddModal state or ?action=add
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasAddState = (location.state as { openAddModal?: boolean } | null)?.openAddModal;
    const hasAddParam = params.get('action') === 'add';

    if (hasAddState || hasAddParam) {
      handleOpenModal();
      // Clean up navigation state and query params to prevent repeated modal triggers
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.search, location.pathname, navigate, handleOpenModal]);

  const handleSwapAccounts = (e: React.MouseEvent) => {
    e.preventDefault();
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
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
          {/* Collapsible Filter Toggle Button */}
          <button
            type="button"
            className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-secondary'} btn-toggle-filter`}
            onClick={() => setIsFilterOpen(prev => !prev)}
            title={isFilterOpen ? "Hide Filters" : "Show Filters"}
            aria-label={isFilterOpen ? "Hide Filters" : "Show Filters"}
          >
            <Filter size={18} className="filter-toggle-icon" />
            <span className="filter-btn-text">{isFilterOpen ? 'Hide Filters' : 'Filter'}</span>
            {activeFilterCount > 0 && (
              <span className="active-filter-badge">{activeFilterCount}</span>
            )}
            <span className="filter-btn-chevron">
              {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {/* Desktop Add Transaction Button */}
          <button className="btn btn-primary header-btn-desktop" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Collapsible Filtering Toolbar */}
      <div className={`filter-collapsible-wrapper ${isFilterOpen ? 'open' : 'closed'}`}>
        <div className="filter-toolbar card">
          <div className="filter-toolbar-header">
            <div className="filter-title">
              <Filter size={16} /> Filter Criteria
            </div>
            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={handleClearFilters}>
                <FilterX size={14} /> Clear Filters ({activeFilterCount})
              </button>
            )}
          </div>
          
          <div className="filter-search-row">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search notes or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="filter-grid">
            <div className="filter-item">
              <label className="filter-label">From Date</label>
              <input
                type="date"
                className="filter-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">To Date</label>
              <input
                type="date"
                className="filter-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">Account</label>
              <select
                className="filter-select"
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
              >
                <option value="all">All Accounts ({filterCounts.totalAccountsCount})</option>
                {accounts.map(acc => {
                  const count = filterCounts.accountCounts[acc.id] || 0;
                  return (
                    <option key={acc.id} value={acc.id} disabled={count === 0}>
                      {acc.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Category</label>
              <select
                className="filter-select"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories ({filterCounts.totalCategoriesCount})</option>
                {categories.map(cat => {
                  const count = filterCounts.categoryCounts[cat.id] || 0;
                  return (
                    <option key={cat.id} value={cat.id} disabled={count === 0}>
                      {cat.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {allSubcategories.length > 0 && (
              <div className="filter-item">
                <label className="filter-label">Subcategory</label>
                <select
                  className="filter-select"
                  value={filterSubcategory}
                  onChange={e => setFilterSubcategory(e.target.value)}
                >
                  <option value="all">All Subcategories ({filterCounts.totalSubcategoriesCount})</option>
                  {allSubcategories.map(sub => {
                    const count = filterCounts.subcategoryCounts[sub] || 0;
                    return (
                      <option key={sub} value={sub} disabled={count === 0}>
                        {sub} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="filter-item">
              <label className="filter-label">Type</label>
              <select
                className="filter-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="all">All Types ({filterCounts.totalTypesCount})</option>
                <option value="expense" disabled={(filterCounts.typeCounts.expense || 0) === 0}>
                  Expense ({(filterCounts.typeCounts.expense || 0)})
                </option>
                <option value="income" disabled={(filterCounts.typeCounts.income || 0) === 0}>
                  Income ({(filterCounts.typeCounts.income || 0)})
                </option>
                <option value="transfer" disabled={(filterCounts.typeCounts.transfer || 0) === 0}>
                  Transfer ({(filterCounts.typeCounts.transfer || 0)})
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div className="pagination-bar card">
          <div className="pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{totalItems}</strong> entries
          </div>

          <div className="pagination-controls">
            <div className="rows-per-page">
              <label>Rows per page:</label>
              <select
                className="select-small"
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="page-nav-buttons">
              <button
                className="btn-page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="btn-page"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="transactions-list">
        {totalItems === 0 && (
          <div className="card empty-state">
            {hasActiveFilters
              ? "No transactions match your filter criteria."
              : "No transactions recorded yet. Go to Backup & Restore to import records or click \"Add Transaction\" to begin."}
          </div>
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
                  const closingBal = closingBalanceMap.get(t.id);
                  const balInfo = getFormattedClosingBalance(closingBal, filterAccount);

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
                        <div className="tx-amount-group">
                          <div className={`tx-amount ${t.type}`}>
                            {t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(t.amount)}
                          </div>
                          {balInfo && (
                            <div 
                              className={`tx-closing-balance ${balInfo.isNegative ? 'negative' : ''}`}
                              title={balInfo.tooltip}
                            >
                              {balInfo.text}
                            </div>
                          )}
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

      {/* Mobile Floating Action Button (FAB) */}
      <button
        type="button"
        className="fab-add-transaction"
        onClick={() => handleOpenModal()}
        title="Add Transaction"
        aria-label="Add Transaction"
      >
        <Plus size={26} />
      </button>

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
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.currentBalance)})</option>)}
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
            <AutocompleteInput
              value={notes}
              onChange={setNotes}
              suggestions={historicalNotes}
              placeholder="e.g. Grocery shopping, Rent, etc."
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
    </div>
  );
};
