import React, { useEffect, useState, useRef } from 'react';
import { Moon, Sun, Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Topbar.css';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
              <button className="dropdown-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
