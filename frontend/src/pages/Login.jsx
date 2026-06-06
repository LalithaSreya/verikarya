import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Server connection error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">VK</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>VeriKarya</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
            Workforce Verification & Performance Management System
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 'var(--spacing-md)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="e.g. employee@verikarya.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
            <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="checkbox" 
                id="show-password" 
                checked={showPassword} 
                onChange={() => setShowPassword(!showPassword)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="show-password" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Show Password
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: 'var(--spacing-lg)' }}
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--spacing-lg)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          <p>Demo Logins:</p>
          <p style={{ marginTop: '4px' }}>
            <b>Employee:</b> employee@verikarya.com / password123<br />
            <b>Manager:</b> manager@verikarya.com / password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
