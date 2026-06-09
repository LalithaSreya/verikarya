import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee'); // 'employee' | 'manager'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, loginWithGoogle, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUri = searchParams.get('redirect_uri');

  // If already authenticated, redirect immediately (either to app dashboard or back to mobile app if requested)
  useEffect(() => {
    if (isAuthenticated && user) {
      const savedToken = localStorage.getItem('verikarya_token');
      if (redirectUri && savedToken) {
        const separator = redirectUri.includes('?') ? '&' : '?';
        const redirectUrl = `${redirectUri}${separator}token=${encodeURIComponent(savedToken)}&role=${encodeURIComponent(user.role)}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;
        window.location.href = redirectUrl;
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate, redirectUri]);

  const handleRedirect = (token, loggedInUser, userRole) => {
    if (redirectUri) {
      const separator = redirectUri.includes('?') ? '&' : '?';
      const redirectUrl = `${redirectUri}${separator}token=${encodeURIComponent(token)}&role=${encodeURIComponent(userRole)}&name=${encodeURIComponent(loggedInUser.name)}&email=${encodeURIComponent(loggedInUser.email)}`;
      window.location.href = redirectUrl;
    } else {
      navigate('/');
    }
  };

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
        handleRedirect(res.token, res.user, res.user.role);
      } else {
        setError(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Server connection error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await loginWithGoogle(credentialResponse.credential, role);
      if (res.success) {
        handleRedirect(res.token, res.user, res.user.role);
      } else {
        setError(res.error || 'Google Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Server connection error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Authentication failed. Please try again.');
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

        {/* Role Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
          <button
            type="button"
            className={role === 'employee' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
            onClick={() => setRole('employee')}
            disabled={submitting}
          >
            🧑‍💼 Employee Login
          </button>
          <button
            type="button"
            className={role === 'manager' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
            onClick={() => setRole('manager')}
            disabled={submitting}
          >
            💼 Manager Login
          </button>
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

        <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--spacing-md) 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 var(--spacing-sm)' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
        </div>

        {/* Google OAuth Login Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
            shape="rectangular"
            theme="outline"
            width="100%"
          />
        </div>

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
