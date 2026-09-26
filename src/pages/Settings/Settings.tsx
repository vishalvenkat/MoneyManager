import React, { useState } from 'react';
import { useCategories } from '../../context/CategoryContext';
import type { Category, CategoryType } from '../../types';
import { Plus, Edit2, Trash2, X, Target } from 'lucide-react';
import { Modal } from '../../components/Modal/Modal';
import './Settings.css';

export const Settings: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [color, setColor] = useState('#EF4444');
  const [type, setType] = useState<CategoryType>('expense');
  const [budget, setBudget] = useState('0');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubcategory, setNewSubcategory] = useState('');

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setColor(category.color || '#EF4444');
      setType(category.type);
      setBudget(category.budget ? category.budget.toString() : '0');
      setSubcategories(category.subcategories ? [...category.subcategories] : []);
    } else {
      setEditingCategory(null);
      setName('');
      setColor(activeTab === 'expense' ? '#EF4444' : '#10B981');
      setType(activeTab);
      setBudget('0');
      setSubcategories([]);
    }
    setNewSubcategory('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setSubcategories([]);
    setNewSubcategory('');
  };

  const handleAddSubcategory = () => {
    const trimmed = newSubcategory.trim();
    if (trimmed && !subcategories.includes(trimmed)) {
      setSubcategories([...subcategories, trimmed]);
      setNewSubcategory('');
    }
  };

  const handleRemoveSubcategory = (subToRemove: string) => {
    setSubcategories(subcategories.filter(s => s !== subToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let budgetValue: number | undefined = 0;
    if (type === 'expense' && budget && !isNaN(parseFloat(budget))) {
      budgetValue = parseFloat(budget);
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name,
        color,
        type,
        subcategories,
        ...(type === 'expense' ? { budget: budgetValue } : { budget: 0 }) // Clear if moved to income
      });
    } else {
      addCategory({
        name,
        color,
        type,
        icon: 'circle',
        subcategories,
        ...(budgetValue ? { budget: budgetValue } : { budget: 0 })
      });
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
              <div className="category-main-row">
                <div className="category-info">
                  <div
                    className="category-color-swatch"
                    style={{ backgroundColor: cat.color || '#ccc', boxShadow: `0 0 10px ${cat.color}40` }}
                  />
                  <div className="category-name-group">
                    <span className="category-name">{cat.name}</span>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <span className="category-sub-count">{cat.subcategories.length} subcategories</span>
                    )}
                  </div>
                </div>

                <div className="category-right-side">
                  {cat.type === 'expense' && (
                    <div className={`category-budget-badge ${cat.budget ? 'has-budget' : 'no-budget'}`}>
                      <Target size={13} className="budget-icon" />
                      <div className="budget-details">
                        <span className="budget-label">{cat.budget ? 'Monthly Limit' : 'No Budget Set'}</span>
                        {cat.budget ? (
                          <span className="budget-value">₹{cat.budget.toLocaleString('en-IN')}</span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="category-actions">
                    <button className="icon-btn-small" onClick={() => handleOpenModal(cat)} title="Edit Category">
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="icon-btn-small delete-btn"
                      onClick={() => {
                        if (window.confirm('Delete this category?')) {
                          deleteCategory(cat.id);
                        }
                      }}
                      title="Delete Category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="subcategories-chips">
                  {cat.subcategories.map(sub => (
                    <span key={sub} className="subcategory-chip">
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="empty-state">No categories found in this section.</div>
          )}
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

          {type === 'expense' && (
            <div className="form-group">
              <label className="form-label">Monthly Budget Limit (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="Leave blank for no limit"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Subcategories (Optional)</label>
            <div className="subcategory-input-row">
              <input
                type="text"
                className="form-input"
                value={newSubcategory}
                onChange={e => setNewSubcategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcategory();
                  }
                }}
                placeholder="e.g. Groceries, Dining Out"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddSubcategory}
                disabled={!newSubcategory.trim()}
              >
                Add
              </button>
            </div>
            {subcategories.length > 0 && (
              <div className="subcategory-chips-form">
                {subcategories.map((sub, index) => (
                  <span key={index} className="subcategory-chip-editable">
                    {sub}
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={() => handleRemoveSubcategory(sub)}
                      title="Remove subcategory"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
