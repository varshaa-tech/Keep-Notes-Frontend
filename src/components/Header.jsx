import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = ({ 
  onMenuClick, 
  searchTerm, 
  onSearchChange,
  onOpenAuth,
  onShowProfile
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  const handleManageAccount = () => {
    setShowUserMenu(false);
    if (onShowProfile) {
      onShowProfile();
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-btn" 
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <span className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        
        <div className="logo-container">
          <h1 className="app-title">Keep Notes</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          <button className="search-btn" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;