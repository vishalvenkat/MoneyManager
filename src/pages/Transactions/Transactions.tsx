import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactions } from '../../context/TransactionContext';
import { useAccounts } from '../../context/AccountContext';
import { useCategories } from '../../context/CategoryContext';
import { usePrivacy } from '../../context/PrivacyContext';
import type { Transaction } from '../../types';
import { Plus, Edit2, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, FilterX, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/Modal';
import { TransactionModal } from '../../components/TransactionModal/TransactionModal';
import { format } from 'date-fns';
import { getAvailableFilterCounts, matchesFiltersExcept, type ActiveFilters } from '../../utils/filterUtils';
import { 
  calculateClosingBalances, 
  getFormattedClosingBalance, 
  compareTransactionsDesc 
} from '../../utils/balanceUtils';
import './Transactions.css';

export const Transactions: React.FC = () => {
  const { transactions, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { isNumbersHidden, formatCurrency } = usePrivacy();
  const location = useLocation();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  // Sticky Header Scroll Detection
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    const handleScroll = () => {
      const scrollPos = mainContent ? mainContent.scrollTop : window.scrollY;
      setIsScrolled(scrollPos > 15);
    };

    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
    setEditingTransaction(transaction || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

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

  const getCategoryTheme = (id?: string) => {
    return categories.find(c => c.id === id);
  };

  const getAccountName = (id?: string) => {
    return accounts.find(a => a.id === id)?.name;
  };

  return (
    <div className="transactions-page">
      {/* Sticky Header Bar on Desktop */}
      <div className={`transactions-sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="transactions-header-content">
          <div className="transactions-header-title-group">
            <h1 className="page-title">Transactions</h1>
          </div>
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
                  const balInfo = getFormattedClosingBalance(closingBal, filterAccount, isNumbersHidden);

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
                            {isNumbersHidden ? '***' : `${t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}${formatCurrency(t.amount)}`}
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
                            onClick={() => setDeleteConfirmId(t.id)}
                            title="Delete Transaction"
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

      {/* Mobile Floating Action Button (FAB) - Portaled to document.body for true viewport-fixed positioning */}
      {typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          className="fab-add-transaction"
          onClick={() => handleOpenModal()}
          title="Add Transaction"
          aria-label="Add Transaction"
        >
          <Plus size={26} />
        </button>,
        document.body
      )}

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transaction={editingTransaction}
      />

      {/* Standardized Delete Transaction Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteTransaction(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
