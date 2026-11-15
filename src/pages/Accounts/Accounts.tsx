import React, { useState, useMemo } from 'react';
import { useAccounts } from '../../context/AccountContext';
import { useTransactions } from '../../context/TransactionContext';
import { Plus, Edit2, Trash2, Wallet, CreditCard, Landmark, PiggyBank, Building, Smartphone, Briefcase, Settings2, EyeOff } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import type { Account, AccountGroup } from '../../types';
import './Accounts.css';

const AVAILABLE_ICONS: Record<string, React.ReactNode> = {
  Wallet: <Wallet size={20} />,
  CreditCard: <CreditCard size={20} />,
  Landmark: <Landmark size={20} />,
  PiggyBank: <PiggyBank size={20} />,
  Building: <Building size={20} />,
  Smartphone: <Smartphone size={20} />,
  Briefcase: <Briefcase size={20} />,
};

export const Accounts: React.FC = () => {
  const { 
    accounts, accountGroups, 
    addAccount, updateAccount, deleteAccount,
    addAccountGroup, updateAccountGroup, deleteAccountGroup 
  } = useAccounts();
  const { transactions } = useTransactions();

  // Account Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [netTxChange, setNetTxChange] = useState<number>(0);
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);

  // Group Management Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  // Group Create/Edit State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('Wallet');

  const handleOpenModal = (account?: Account, defaultGroupId?: string) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      
      let matchedGroupId = account.groupId;
      if (!matchedGroupId && account.group) {
         const found = accountGroups.find(g => g.name === account.group);
         if (found) matchedGroupId = found.id;
      }
      setSelectedGroupId(matchedGroupId || (accountGroups[0]?.id ?? ''));

      // Calculate net transactions associated with this account
      const txDelta = transactions.reduce((sum, t) => {
        if (!t) return sum;
        const amt = Number(t.amount) || 0;
        if (t.type === 'income' && t.accountId === account.id) return sum + amt;
        if (t.type === 'expense' && t.accountId === account.id) return sum - amt;
        if (t.type === 'transfer') {
          if (t.fromAccountId === account.id) return sum - amt;
          if (t.toAccountId === account.id) return sum + amt;
        }
        return sum;
      }, 0);

      setNetTxChange(txDelta);

      // Determine initial balance and current balance
      let initBal = account.initialBalance;
      const currBal = account.currentBalance ?? 0;

      if (typeof initBal !== 'number' || isNaN(initBal)) {
        initBal = currBal - txDelta;
      }

      setInitialBalance(initBal.toString());
      setCurrentBalance(currBal.toString());
      setIncludeInNetWorth(account.includeInNetWorth !== false); // Defaults to true if undefined
    } else {
      setEditingAccount(null);
      setName('');
      setSelectedGroupId(defaultGroupId || (accountGroups[0]?.id ?? ''));
      setNetTxChange(0);
      setInitialBalance('');
      setCurrentBalance('');
      setIncludeInNetWorth(true);
    }
    setIsModalOpen(true);
  };

  const handleInitialBalanceChange = (newInitVal: string) => {
    setInitialBalance(newInitVal);
    const parsedInit = parseFloat(newInitVal);
    
    if (editingAccount) {
      if (!isNaN(parsedInit)) {
        const updatedCurrent = parsedInit + netTxChange;
        setCurrentBalance(Number(updatedCurrent.toFixed(2)).toString());
      } else if (newInitVal === '' || newInitVal === '-') {
        setCurrentBalance('');
      }
    } else {
      // In Add Account mode, initial balance defines starting current balance
      setCurrentBalance(newInitVal);
    }
  };

  const handleCurrentBalanceChange = (newCurrVal: string) => {
    setCurrentBalance(newCurrVal);
    const parsedCurr = parseFloat(newCurrVal);
    
    if (editingAccount) {
      if (!isNaN(parsedCurr)) {
        const updatedInitial = parsedCurr - netTxChange;
        setInitialBalance(Number(updatedInitial.toFixed(2)).toString());
      } else if (newCurrVal === '' || newCurrVal === '-') {
        setInitialBalance('');
      }
    } else {
      setInitialBalance(newCurrVal);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initBalNum = parseFloat(initialBalance) || 0;
    const currentBalNum = parseFloat(currentBalance) || 0;
    
    const selectedGroupObj = accountGroups.find(g => g.id === selectedGroupId);

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name,
        groupId: selectedGroupId,
        group: selectedGroupObj?.name || '', // Legacy sync
        initialBalance: initBalNum,
        currentBalance: currentBalNum,
        includeInNetWorth,
      });
    } else {
      addAccount({
        name,
        groupId: selectedGroupId,
        group: selectedGroupObj?.name || '', // Legacy sync
        initialBalance: initBalNum,
        currentBalance: currentBalNum,
        includeInNetWorth,
      });
    }
    handleCloseModal();
  };

  const handleOpenGroupModal = () => {
    setIsGroupModalOpen(true);
    resetGroupForm();
  };
  
  const resetGroupForm = () => {
    setIsEditingGroup(false);
    setEditingGroupId(null);
    setGroupName('');
    setGroupIcon('Wallet');
  };

  const handleEditGroup = (group: AccountGroup) => {
    setIsEditingGroup(true);
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupIcon(group.icon || 'Wallet');
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingGroup && editingGroupId) {
      await updateAccountGroup(editingGroupId, { name: groupName, icon: groupIcon });
    } else {
      await addAccountGroup({ name: groupName, icon: groupIcon });
    }
    resetGroupForm();
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const result = await deleteAccountGroup(groupId);
      if (result && result.movedCount > 0) {
         alert(`Group deleted successfully. ${result.movedCount} account(s) were automatically moved to "${result.targetGroupName}".`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete group.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  // Grouping accounts by dynamic groups
  const groupedAccounts = useMemo(() => {
    const map: Record<string, Account[]> = {};
    accountGroups.forEach(g => map[g.id] = []);
    
    accounts.forEach(acc => {
      let gId = acc.groupId;
      if (!gId && acc.group) {
         // Legacy mapping
         const found = accountGroups.find(g => g.name === acc.group);
         if (found) gId = found.id;
      }
      
      // Fallback if group was deleted but account not updated somehow
      if (!gId || !map[gId]) {
         gId = accountGroups[0]?.id;
      }
      
      if (gId && map[gId]) {
        map[gId].push(acc);
      }
    });
    return map;
  }, [accounts, accountGroups]);

  const groupTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    accountGroups.forEach(grp => {
      totals[grp.id] = (groupedAccounts[grp.id] || []).reduce((sum, acc) => sum + acc.currentBalance, 0);
    });
    return totals;
  }, [groupedAccounts, accountGroups]);

  const grandTotal = useMemo(() => {
    return accounts
      .filter(a => a.includeInNetWorth !== false)
      .reduce((sum, acc) => sum + acc.currentBalance, 0);
  }, [accounts]);

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleOpenGroupModal}>
            <Settings2 size={18} /> Manage Groups
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()} disabled={accountGroups.length === 0}>
            <Plus size={18} /> Add Account
          </button>
        </div>
      </div>

      <div className="card grand-total-card">
        <div className="grand-total-content">
          <div className="grand-total-info">
            <span className="grand-total-label">Total Net Assets</span>
            <h2 className="grand-total-amount">{formatCurrency(grandTotal)}</h2>
          </div>
          <div className="group-summary-pills">
            {accountGroups.map(grp => (
              <div key={grp.id} className="summary-pill">
                <span className="pill-name">{grp.name}</span>
                <span className="pill-amount">{formatCurrency(groupTotals[grp.id] || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="account-groups-container">
        {accountGroups.map(grp => {
          const groupAccs = groupedAccounts[grp.id] || [];
          const total = groupTotals[grp.id] || 0;
          const GroupIconComponent = AVAILABLE_ICONS[grp.icon] || AVAILABLE_ICONS['Wallet'];

          return (
            <div key={grp.id} className="account-group-section">
              <div className="group-header">
                <div className="group-header-title">
                  <span className="group-icon-badge" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)'}}>
                    {GroupIconComponent}
                  </span>
                  <h2>{grp.name}</h2>
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
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span className="account-group-tag" style={{ margin: 0 }}>{grp.name}</span>
                            {account.includeInNetWorth === false && (
                              <span className="account-group-tag" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                                <EyeOff size={12} /> Excluded from Net Worth
                              </span>
                            )}
                          </div>
                          <div className="account-balance">{formatCurrency(account.currentBalance)}</div>
                          {account.initialBalance !== undefined && account.initialBalance !== account.currentBalance && (
                            <div className="account-initial-balance" title="Initial opening balance">
                              Initial: {formatCurrency(account.initialBalance)}
                            </div>
                          )}
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
                  <p>No {grp.name} accounts added yet.</p>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleOpenModal(undefined, grp.id)}
                  >
                    <Plus size={14} /> Add {grp.name} Account
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {accountGroups.length === 0 && (
          <div className="card empty-state">
             No account groups exist. Please create an Account Group first.
          </div>
        )}
      </div>

      {/* Add / Edit Account Modal */}
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
              placeholder="e.g. HDFC Salary, Wallet"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Group</label>
            <select
              className="form-input"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              required
            >
              {accountGroups.map(grp => (
                 <option key={grp.id} value={grp.id}>{grp.name}</option>
              ))}
            </select>
          </div>

          {editingAccount ? (
            <>
              <div className="form-group">
                <label className="form-label">Initial Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={initialBalance}
                  onChange={e => handleInitialBalanceChange(e.target.value)}
                  required
                  placeholder="0.00"
                />
                <span className="form-helper-text">
                  Opening balance for this account. Editing this will update the current balance accordingly.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Current Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={currentBalance}
                  onChange={e => handleCurrentBalanceChange(e.target.value)}
                  required
                  placeholder="0.00"
                />
                {netTxChange !== 0 && (
                  <span className="form-helper-text">
                    Current balance reflects net transactions ({netTxChange >= 0 ? '+' : ''}{formatCurrency(netTxChange)}).
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Initial Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={initialBalance}
                onChange={e => handleInitialBalanceChange(e.target.value)}
                required
                placeholder="0.00"
              />
              <span className="form-helper-text">
                Starting balance for this new account.
              </span>
            </div>
          )}

          <div className="toggle-switch-container" onClick={() => setIncludeInNetWorth(!includeInNetWorth)}>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={includeInNetWorth}
                onChange={e => setIncludeInNetWorth(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="toggle-slider"></span>
            </div>
            <div className="toggle-switch-content">
              <div className="toggle-switch-label">Include in Total Net Assets</div>
              <div className="toggle-switch-description">
                Exclude this account's balance from your global dashboard net worth summary if unchecked.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Account</button>
          </div>
        </form>
      </Modal>

      {/* Manage Groups Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Manage Account Groups"
      >
        <div className="manage-groups-container">
          <div className="existing-groups-list">
             <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Existing Groups</h4>
             {accountGroups.map(grp => (
                <div key={grp.id} className="group-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--accent-primary)'}}>{AVAILABLE_ICONS[grp.icon] || AVAILABLE_ICONS['Wallet']}</span>
                      <span style={{ fontWeight: 500 }}>{grp.name}</span>
                   </div>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="icon-btn-small" onClick={() => handleEditGroup(grp)}>
                        <Edit2 size={14} />
                      </button>
                      <button type="button" className="icon-btn-small delete-btn" onClick={() => {
                        if (accountGroups.length <= 1) {
                           alert('Cannot delete the last remaining group.');
                           return;
                        }
                        if (window.confirm(`Are you sure you want to delete the group "${grp.name}"? Any linked accounts will be moved safely.`)) {
                           handleDeleteGroup(grp.id);
                        }
                      }}>
                        <Trash2 size={14} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
          
          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-color)' }} />
          
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
             {isEditingGroup ? 'Edit Group' : 'Create New Group'}
          </h4>
          <form onSubmit={handleSaveGroup} className="group-form">
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                className="form-input"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                required
                placeholder="e.g. Investment, Business"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div className="icon-selector" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                 {Object.keys(AVAILABLE_ICONS).map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      className={`btn-icon-select ${groupIcon === iconName ? 'active' : ''}`}
                      onClick={() => setGroupIcon(iconName)}
                      style={{ 
                         padding: '0.5rem', 
                         borderRadius: 'var(--radius-md)', 
                         border: groupIcon === iconName ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                         backgroundColor: groupIcon === iconName ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                         cursor: 'pointer'
                      }}
                    >
                      {AVAILABLE_ICONS[iconName]}
                    </button>
                 ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                 {isEditingGroup ? 'Update Group' : 'Add Group'}
              </button>
              {isEditingGroup && (
                <button type="button" className="btn btn-secondary" onClick={resetGroupForm}>
                   Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
