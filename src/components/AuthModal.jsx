import React, { useState } from 'react';
import AuthForm from './AuthForm';
import ApiService from './services/ApiService';

const AuthModal = () => {
  const [mode, setMode] = useState('login');  // 'login' or 'signup'
  const [showModal, setShowModal] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (userData) => {
    setError('');
    try {
      if (mode === 'signup') {
        await ApiService.register(userData);
        alert('Signup successful! Please login.');
        setMode('login');
      } else {
        const res = await ApiService.login(userData);
        localStorage.setItem('token', res.token);
        alert('Login successful!');
        setShowModal(false);
      }
    } catch (err) {
      setError(err.message || 'Failed');
    }
  };

  return showModal ? (
    <div>
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        onClose={() => setShowModal(false)}
      />
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <div style={{ textAlign: 'center', marginTop: 10 }}>
        {mode === 'signup' ? (
          <p>
            Already have an account?{' '}
            <button onClick={() => setMode('login')}>Login</button>
          </p>
        ) : (
          <p>
            Don't have an account?{' '}
            <button onClick={() => setMode('signup')}>Sign Up</button>
          </p>
        )}
      </div>
    </div>
  ) : null;
};

export default AuthModal;
