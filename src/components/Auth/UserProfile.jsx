import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const UserProfile = ({ isOpen, onClose }) => {
  const { user, logout, logoutAll, changePassword } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    if (passwordError) setPasswordError('');
    if (passwordSuccess) setPasswordSuccess('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setLoading(true);
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    setLoading(false);

    if (result.success) {
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess('');
      }, 2000);
    } else {
      setPasswordError(result.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleLogoutAll = async () => {
    if (window.confirm('This will log you out from all devices. Continue?')) {
      await logoutAll();
      onClose();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Profile</h2>
          <p>Manage your account settings</p>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="profile-content">
          {/* User Info */}
          <div className="profile-section">
            <h3>Account Information</h3>
            <div className="profile-info">
              <div className="info-item">
                <label>Username:</label>
                <span>{user.username}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{user.email}</span>
              </div>
              {(user.firstName || user.lastName) && (
                <div className="info-item">
                  <label>Name:</label>
                  <span>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</span>
                </div>
              )}
              <div className="info-item">
                <label>Member since:</label>
                <span>{formatDate(user.createdAt)}</span>
              </div>
              <div className="info-item">
                <label>Last login:</label>
                <span>{formatDate(user.lastLogin)}</span>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="profile-section">
            <h3>Security</h3>
            {!showPasswordForm ? (
              <button
                className="secondary-button"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            ) : (
              <div className="password-form">
                <form onSubmit={handlePasswordSubmit}>
                  {passwordError && (
                    <div className="error-message">{passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div className="success-message">{passwordSuccess}</div>
                  )}

                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-buttons">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordError('');
                        setPasswordSuccess('');
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="auth-button"
                      disabled={loading}
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Logout Actions */}
          <div className="profile-section">
            <h3>Session Management</h3>
            <div className="logout-buttons">
              <button
                className="secondary-button"
                onClick={handleLogout}
              >
                Sign Out
              </button>
              <button
                className="danger-button"
                onClick={handleLogoutAll}
              >
                Sign Out All Devices
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;