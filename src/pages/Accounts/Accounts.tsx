import React, { useState, useMemo } from 'react';
import { useAccounts } from '../../context/AccountContext';
import { Plus, Edit2, Trash2, Wallet, CreditCard, Landmark } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import type { Account, AccountGroup } from '../../types';
import './Accounts.css';

const ACCOUNT_GROUPS: AccountGroup[] = ['Cash', 'Debit Card', 'Credit Card', 'Savings'];

const getGroupIcon = (group: AccountGroup) => {
  switch (group) {
    case 'Cash':
      return <Wallet size={20} />;
    case 'Debit Card':
      return <CreditCard size={20} />;
    case 'Credit Card':
      return <CreditCard size={20} />;
    case 'Savings':
      return <Landmark size={20} />;
    default:
      return <Wallet size={20} />;
  }
};

export const Accounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [group, setGroup] = useState<AccountGroup>('Cash');
  const [initialBalance, setInitialBalance] = useState('');

  const handleOpenModal = (account?: Account, defaultGroup?: AccountGroup) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setGroup(account.group || 'Cash');
      setInitialBalance(account.initialBalance.toString());
    } else {
      setEditingAccount(null);
      setName('');
      setGroup(defaultGroup || 'Cash');
      setInitialBalance('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(initialBalance) || 0;

    if (editingAccount) {
      // If editing initial balance, we adjust current balance
      const balanceDiff = balanceNum - editingAccount.initialBalance;
      updateAccount(editingAccount.id, {
        name,
        group,
        initialBalance: balanceNum,
        currentBalance: editingAccount.currentBalance + balanceDiff,
      });
    } else {
      addAccount({
        name,
        group,
        initialBalance: balanceNum,
        currentBalance: balanceNum, // initially current = initial
      });
    }
    handleCloseModal();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  // Grouping accounts
  const groupedAccounts = useMemo(() => {
    const map: Record<AccountGroup, Account[]> = {
      'Cash': [],
      'Debit Card': [],
      'Credit Card': [],
      'Savings': []
    };
    accounts.forEach(acc => {
      const grp = acc.group && map[acc.group] ? acc.group : 'Cash';
      map[grp].push(acc);
    });
    return map;
  }, [accounts]);

  // Calculating totals per group
  const groupTotals = useMemo(() => {
    const totals: Record<AccountGroup, number> = {
      'Cash': 0,
      'Debit Card': 0,
      'Credit Card': 0,
      'Savings': 0
    };
    (Object.keys(groupedAccounts) as AccountGroup[]).forEach(grp => {
      totals[grp] = groupedAccounts[grp].reduce((sum, acc) => sum + acc.currentBalance, 0);
    });
    return totals;
  }, [groupedAccounts]);

  // Grand Total
  const grandTotal = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  }, [accounts]);

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Account
        </button>
      </div>

      {/* Summary Header Banner */}
      <div className="card grand-total-card">
        <div className="grand-total-content">
          <div className="grand-total-info">
            <span className="grand-total-label">Total Net Assets</span>
            <h2 className="grand-total-amount">{formatCurrency(grandTotal)}</h2>
          </div>
          <div className="group-summary-pills">
            {ACCOUNT_GROUPS.map(grp => (
              <div key={grp} className="summary-pill">
                <span className="pill-name">{grp}</span>
                <span className="pill-amount">{formatCurrency(groupTotals[grp])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped Account Sections */}
      <div className="account-groups-container">
        {ACCOUNT_GROUPS.map(grp => {
          const groupAccs = groupedAccounts[grp];
          const total = groupTotals[grp];

          return (
            <div key={grp} className="account-group-section">
              <div className="group-header">
                <div className="group-header-title">
                  <span className={`group-icon-badge group-${grp.toLowerCase().replace(/\s+/g, '-')}`}>
                    {getGroupIcon(grp)}
                  </span>
                  <h2>{grp}</h2>
                  <span className="group-count">({groupAccs.length})</span>
                </div>
                <div className="group-header-total">
                  Total: <strong>{formatCurrency(total)}</strong>
                </div>
              </div>

              {groupAccs.length > 0 ? (
                <div className="accounts-grid">
                  {groupAccs.map(account => (
                    <div key={account.id} className="card account-card">
                      <div className="account-card-header">
                        <div>
                          <div className="account-name">{account.name}</div>
                          <span className="account-group-tag">{grp}</span>
                          <div className="account-balance">{formatCurrency(account.currentBalance)}</div>
                        </div>
                      </div>

                      <div className="account-actions">
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenModal(account)}
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this account?')) {
                              deleteAccount(account.id);
                            }
                          }}
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-group-card card">
                  <p>No {grp} accounts added yet.</p>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleOpenModal(undefined, grp)}
                  >
                    <Plus size={14} /> Add {grp} Account
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingAccount ? "Edit Account" : "Add Account"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. HDFC Salary, Wallet, HDFC Credit Card"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Group</label>
            <select
              className="form-input"
              value={group}
              onChange={e => setGroup(e.target.value as AccountGroup)}
              required
            >
              <option value="Cash">Cash</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Savings">Savings</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Balance (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
              required
              placeholder="0.00"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Account</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
