import React, { useEffect, useState, useRef } from 'react';
import { Moon, Sun, Bell, LogOut, Menu, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { Modal } from './Modal/Modal';
import { updateProfile } from 'firebase/auth';
import './Topbar.css';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const { logout, currentUser } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDark]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleResetData = async () => {
    if (!currentUser) return;
    try {
      setIsResetting(true);
      await expenseService.resetUserData(currentUser.uid);
      setIsResetModalOpen(false);
      setIsDropdownOpen(false);
    } catch (err) {
      console.error('Failed to reset data', err);
      alert('An error occurred while resetting your data. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    setDisplayName(currentUser?.displayName || '');
    setPhotoURL(currentUser?.photoURL || '');
    setIsProfileModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      setIsUpdatingProfile(true);
      await updateProfile(currentUser, { displayName, photoURL });
      setIsProfileModalOpen(false);
      window.location.reload(); // Refresh to reflect updated user state throughout the app
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('An error occurred while updating your profile. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const avatarUrl = currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email || 'Felix'}`;

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu-btn" onClick={onToggleSidebar} title="Menu">
        <Menu size={24} />
      </button>

      <div className="topbar-actions">
        <button className="icon-btn">
          <Bell size={20} />
        </button>
        <button className="icon-btn" onClick={() => setIsDark(!isDark)} title="Toggle Dark Mode">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="profile-menu" ref={dropdownRef}>
          <div className="avatar" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img src={avatarUrl} alt="User Avatar" />
          </div>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <strong>{currentUser?.displayName || 'User'}</strong>
                <span>{currentUser?.email}</span>
              </div>
              <button 
                className="dropdown-item" 
                onClick={handleOpenProfile}
              >
                <User size={16} />
                <span>Profile</span>
              </button>
              <button 
                className="dropdown-item" 
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsResetModalOpen(true);
                }}
                style={{ color: 'var(--danger)' }}
              >
                <Trash2 size={16} />
                <span>Reset Data</span>
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => !isResetting && setIsResetModalOpen(false)} 
        title="Reset Data"
      >
        <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          <p>Are you sure you want to reset all your transaction data? This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setIsResetModalOpen(false)}
            disabled={isResetting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ backgroundColor: 'var(--danger)' }}
            onClick={handleResetData}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Confirm'}
          </button>
        </div>
      </Modal>
      <Modal 
        isOpen={isProfileModalOpen} 
        onClose={() => !isUpdatingProfile && setIsProfileModalOpen(false)} 
        title="Edit Profile"
      >
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label className="form-label">Email (Read Only)</label>
            <input 
              type="text" 
              className="form-input" 
              value={currentUser?.email || ''} 
              disabled 
              style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Profile Picture URL</label>
            <input 
              type="url" 
              className="form-input" 
              value={photoURL} 
              onChange={e => setPhotoURL(e.target.value)} 
              placeholder="https://example.com/avatar.png"
            />
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsProfileModalOpen(false)}
              disabled={isUpdatingProfile}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

    </header>
  );
};
