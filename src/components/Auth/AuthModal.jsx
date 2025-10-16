import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);

  if (!isOpen) return null;

  const switchToLogin = () => setMode('login');
  const switchToRegister = () => setMode('register');

  return (
    <>
      {mode === 'login' ? (
        <Login
          onSwitchToRegister={switchToRegister}
          onClose={onClose}
        />
      ) : (
        <Register
          onSwitchToLogin={switchToLogin}
          onClose={onClose}
        />
      )}
    </>
  );
};

export default AuthModal;