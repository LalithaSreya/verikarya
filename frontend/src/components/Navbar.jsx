import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const Navbar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo-icon">VK</div>
        <span>VeriKarya</span>
      </div>

      <div className="navbar-user">
        <div style={{ textAlign: 'right', display: 'none' }} className="d-md-block">
          {/* We can write custom styles to hide on mobile if needed, or inline */}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</span>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{user.email}</span>
          </div>
          <span className="user-badge" style={{ textTransform: 'capitalize' }}>
            {user.role}
          </span>
          <button className="btn btn-outline" onClick={logout} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
