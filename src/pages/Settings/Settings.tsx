import React, { useState } from 'react';
import { useCategories } from '../../context/CategoryContext';
import { useAccounts } from '../../context/AccountContext';
import { useTransactions } from '../../context/TransactionContext';
import type { Category, CategoryType } from '../../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import './Settings.css';

export const Settings: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [color, setColor] = useState('#EF4444');
  const [type, setType] = useState<CategoryType>('expense');

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setColor(category.color || '#EF4444');
      setType(category.type);
    } else {
      setEditingCategory(null);
      setName('');
      setColor(activeTab === 'expense' ? '#EF4444' : '#10B981');
      setType(activeTab);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategory(editingCategory.id, { name, color, type });
    } else {
      addCategory({ name, color, type, icon: 'circle' });
    }
    handleCloseModal();
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          Expense Categories
        </button>
        <button 
          className={`tab-btn ${activeTab === 'income' ? 'active' : ''}`}
          onClick={() => setActiveTab('income')}
        >
          Income Categories
        </button>
      </div>

      <div className="card categories-card">
        <div className="categories-list">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="category-item">
              <div className="category-info">
                <div 
                  className="category-color-swatch" 
                  style={{ backgroundColor: cat.color || '#ccc' }}
                />
                <span className="category-name">{cat.name}</span>
              </div>
              <div className="category-actions">
                <button className="icon-btn-small" onClick={() => handleOpenModal(cat)}>
                  <Edit2 size={16} />
                </button>
                <button 
                  className="icon-btn-small delete-btn" 
                  onClick={() => {
                    if(window.confirm('Delete this category?')) {
                      deleteCategory(cat.id);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="empty-state">No categories found in this section.</div>
          )}
        </div>
      </div>

      <div className="card categories-card">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 className="page-title" style={{ fontSize: '1.25rem' }}>Data Management</h2>
        </div>
        <div className="settings-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Export your application data (accounts, categories, transactions) to a JSON file for backup.</p>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              const data = {
                accounts,
                categories,
                transactions
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export to JSON
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select 
              className="form-input" 
              value={type} 
              onChange={e => setType(e.target.value as CategoryType)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color Code</label>
            <div className="color-picker-wrapper">
              <input 
                type="color" 
                className="color-input" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
              />
              <span className="color-value">{color}</span>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Category</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
