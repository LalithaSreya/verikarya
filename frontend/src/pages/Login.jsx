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
  const [appRedirectUrl, setAppRedirectUrl] = useState('');

  const { login, loginWithGoogle, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const redirectUri = searchParams.get('redirect_uri');

  // Handle clean session request from mobile app to reset web session
  useEffect(() => {
    if (searchParams.get('clean') === 'true') {
      logout();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('clean');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, logout, setSearchParams]);

  // If already authenticated, redirect immediately (either to app dashboard or back to mobile app if requested)
  useEffect(() => {
    // Only auto-redirect if we are authenticated and not currently processing a clean session request
    if (isAuthenticated && user && searchParams.get('clean') !== 'true') {
      const savedToken = localStorage.getItem('verikarya_token');
      if (redirectUri && savedToken) {
        const separator = redirectUri.includes('?') ? '&' : '?';
        const redirectUrl = `${redirectUri}${separator}token=${encodeURIComponent(savedToken)}&role=${encodeURIComponent(user.role)}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;
        setAppRedirectUrl(redirectUrl);
        // Try auto-redirect, but fallback button will be shown on page
        window.location.href = redirectUrl;
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate, redirectUri, searchParams]);

  const handleRedirect = (token, loggedInUser, userRole) => {
    if (redirectUri) {
      const separator = redirectUri.includes('?') ? '&' : '?';
      const redirectUrl = `${redirectUri}${separator}token=${encodeURIComponent(token)}&role=${encodeURIComponent(userRole)}&name=${encodeURIComponent(loggedInUser.name)}&email=${encodeURIComponent(loggedInUser.email)}`;
      setAppRedirectUrl(redirectUrl);
      // Try auto-redirect, but fallback button will be shown on page
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

  const handleMockGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      // Create a test profile based on the selected role tab
      const testEmail = role === 'manager' 
        ? 'jane_manager_google@verikarya.com' 
        : 'john_employee_google@verikarya.com';
      const testName = role === 'manager' 
        ? 'Jane Manager (Google)' 
        : 'John Employee (Google)';

      const base64url = (str) => {
        return btoa(unescape(encodeURIComponent(str)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = base64url(JSON.stringify({
        email: testEmail,
        name: testName,
        email_verified: true
      }));
      const mockToken = `${header}.${payload}.mock_signature`;

      const res = await loginWithGoogle(mockToken, role);
      if (res.success) {
        handleRedirect(res.token, res.user, res.user.role);
      } else {
        setError(res.error || 'Mock Google Login failed.');
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

  if (appRedirectUrl) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <div className="login-logo">
            <div className="login-logo-icon" style={{ backgroundColor: 'var(--success-color, #10B981)', color: '#FFFFFF' }}>✓</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '16px 0 8px 0', color: 'var(--text-main)' }}>
              Successfully Authenticated!
            </h1>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-lg)' }}>
              You have successfully logged in. Click the button below to return to the mobile app.
            </p>
          </div>

          <a
            href={appRedirectUrl}
            className="btn btn-primary btn-block"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginTop: 'var(--spacing-md)'
            }}
          >
            Return to Mobile App
          </a>

          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--spacing-lg)' }}>
            If the app does not open automatically, tapping the button above will launch it.
          </p>
        </div>
      </div>
    );
  }

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
            Employee Login
          </button>
          <button
            type="button"
            className={role === 'manager' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
            onClick={() => setRole('manager')}
            disabled={submitting}
          >
            Manager Login
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 'var(--spacing-md)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            {error}
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

        {/* Mock Google Login for Testing */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              backgroundColor: 'var(--bg-color)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
              padding: '10px 16px'
            }}
            onClick={handleMockGoogleSignIn}
            disabled={submitting}
          >
            Dev/Testing: Mock Google Sign-In
          </button>
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
