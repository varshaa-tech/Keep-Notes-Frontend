import React, { useState } from 'react';

function LoginForm({ onLogin, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (email.trim() && password.trim()) {
      onLogin({ email });  // Pass simple user object
    } else {
      alert('Please enter email and password.');
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <h2>Login to Keep Notes</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <button className="close-btn" onClick={onClose}>X Close</button>
      </div>

      <style jsx>{`
        .login-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .login-modal {
          background: white;
          padding: 30px;
          border-radius: 10px;
          width: 300px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          width: 100%;
        }
        button {
          padding: 10px;
          border: none;
          background: #1976d2;
          color: white;
          border-radius: 5px;
          cursor: pointer;
        }
        .close-btn {
          background: transparent;
          color: black;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

export default LoginForm;
