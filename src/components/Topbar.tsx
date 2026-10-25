import React, { useEffect, useState, useRef } from 'react';
import { Moon, Sun, Bell, LogOut, Menu, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { Modal } from './Modal/Modal';
import { UserProfileModal } from './UserProfile/UserProfileModal';
import { resolveAvatarUrl } from '../utils/avatarUtils';
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
  const { logout, currentUser, userProfile } = useAuth();
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
    setIsProfileModalOpen(true);
  };

  const userDisplayName = userProfile?.fullName || currentUser?.displayName || 'User';
  const userEmail = userProfile?.email || currentUser?.email || '';
  const avatarUrl = userProfile?.photoURL || currentUser?.photoURL || resolveAvatarUrl(userProfile?.avatarId, undefined, userProfile?.avatarGender || 'male');

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
          <div className="avatar" onClick={() => setIsDropdownOpen(!isDropdownOpen)} title="Account menu">
            <img src={avatarUrl} alt="User Avatar" />
          </div>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <strong>{userDisplayName}</strong>
                <span>{userEmail}</span>
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
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

    </header>
  );
};
