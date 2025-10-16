import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get stored token
  const getStoredToken = () => {
    return localStorage.getItem('accessToken');
  };

  // Store token
  const storeToken = (token) => {
    localStorage.setItem('accessToken', token);
  };

  // Remove token
  const removeToken = () => {
    localStorage.removeItem('accessToken');
  };

  // API request helper with auth header
  const apiRequest = async (endpoint, options = {}) => {
    const token = getStoredToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh tokens
      ...options,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // If unauthorized, try to refresh token
    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the original request with new token
        config.headers.Authorization = `Bearer ${getStoredToken()}`;
        return fetch(`${API_BASE_URL}${endpoint}`, config);
      }
    }

    return response;
  };

  // Refresh access token using refresh token
  const refreshAccessToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        storeToken(data.accessToken);
        setUser(data.user);
        return true;
      } else {
        // Refresh failed, user needs to login again
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  // Check if user is authenticated on app load
  const checkAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        removeToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      removeToken();
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        storeToken(data.accessToken);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        setError(data.message || 'Registration failed');
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error during registration';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (emailOrUsername, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await response.json();

      if (response.ok) {
        storeToken(data.accessToken);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        setError(data.message || 'Login failed');
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error during login';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call logout endpoint to clear refresh token
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API call result
      removeToken();
      setUser(null);
      setError(null);
    }
  };

  // Logout from all devices
  const logoutAll = async () => {
    try {
      await apiRequest('/auth/logout-all', { method: 'POST' });
    } catch (error) {
      console.error('Logout all API call failed:', error);
    } finally {
      removeToken();
      setUser(null);
      setError(null);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      
      const response = await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        setError(data.message || 'Failed to change password');
        return { success: false, message: data.message || 'Failed to change password' };
      }
    } catch (error) {
      const errorMessage = 'Network error during password change';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      
      const response = await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        setError(data.message || 'Failed to update profile');
        return { success: false, message: data.message || 'Failed to update profile' };
      }
    } catch (error) {
      const errorMessage = 'Network error during profile update';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    logoutAll,
    changePassword,
    updateProfile,
    apiRequest,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};