import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, CalendarDays, ArrowRightLeft, PieChart, Settings, WalletCards, X } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { path: '/', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/transactions', label: 'Transactions', icon: <ArrowRightLeft size={20} /> },
    { path: '/calendar', label: 'Calendar', icon: <CalendarDays size={20} /> },
    { path: '/accounts', label: 'Accounts', icon: <WalletCards size={20} /> },
    { path: '/reports', label: 'Reports', icon: <PieChart size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Wallet size={28} />
          </div>
          <span>MoneyManager</span>
          <button className="mobile-close-btn icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {/* We could place dark mode toggle here or in topbar */}
        </div>
      </aside>
    </>
  );
};
