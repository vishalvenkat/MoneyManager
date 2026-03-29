import React, { useState } from 'react';
import { useAccounts } from '../../context/AccountContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import type { Account } from '../../types';
import './Accounts.css';

export const Accounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setInitialBalance(account.initialBalance.toString());
    } else {
      setEditingAccount(null);
      setName('');
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
      // If editing initial balance, we need to adjust current balance
      const balanceDiff = balanceNum - editingAccount.initialBalance;
      updateAccount(editingAccount.id, {
        name,
        initialBalance: balanceNum,
        currentBalance: editingAccount.currentBalance + balanceDiff,
      });
    } else {
      addAccount({
        name,
        initialBalance: balanceNum,
        currentBalance: balanceNum, // initially current = initial
      });
    }
    handleCloseModal();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Account
        </button>
      </div>

      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="card account-card">
            <div className="account-card-header">
              <div>
                <div className="account-name">{account.name}</div>
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
        {accounts.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No accounts found. Create one to get started.</p>
          </div>
        )}
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
              placeholder="e.g. Main Checking, Cash"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Initial Balance</label>
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
