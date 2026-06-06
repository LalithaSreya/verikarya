import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignHeight: '100vh',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#64748B'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          Loading VeriKarya...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, redirect to their main dashboard
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
