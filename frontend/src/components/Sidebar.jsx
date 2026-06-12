import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Clean, professional SVG Icons
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const IconTasks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconAudits = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconEvidence = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconAttendance = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconLeaderboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
  </svg>
);

const IconBI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const Sidebar = () => {
  const { isManager } = useAuth();

  return (
    <aside className="sidebar">
      <ul className="sidebar-menu">
        <li className="sidebar-item">
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "active" : ""}
            end
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <IconDashboard />
            <span>Dashboard</span>
          </NavLink>
        </li>

        <li className="sidebar-item">
          <NavLink 
            to="/tasks" 
            className={({ isActive }) => isActive ? "active" : ""}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <IconTasks />
            <span>Tasks</span>
          </NavLink>
        </li>

        <li className="sidebar-item">
          <NavLink 
            to="/visits" 
            className={({ isActive }) => isActive ? "active" : ""}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <IconAudits />
            <span>On-Site Audits</span>
          </NavLink>
        </li>

        {isManager && (
          <>
            <li className="sidebar-item">
              <NavLink 
                to="/reviews" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconEvidence />
                <span>Verify Evidence</span>
              </NavLink>
            </li>
            
            <li className="sidebar-item">
              <NavLink 
                to="/attendance" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconAttendance />
                <span>Attendance Logs</span>
              </NavLink>
            </li>

            <li className="sidebar-item">
              <NavLink 
                to="/whatsapp-logs" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconWhatsApp />
                <span>WhatsApp Logs</span>
              </NavLink>
            </li>

            <li className="sidebar-item">
              <NavLink 
                to="/employees-master" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconUsers />
                <span>Employee Master</span>
              </NavLink>
            </li>

            <li className="sidebar-item">
              <NavLink 
                to="/amc-services" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconBriefcase />
                <span>AMC Contracts</span>
              </NavLink>
            </li>

            <li className="sidebar-item">
              <NavLink 
                to="/customer-feedback" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconStar />
                <span>Customer Reviews</span>
              </NavLink>
            </li>

            <li className="sidebar-item">
              <NavLink 
                to="/performance-analytics" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconLeaderboard />
                <span>Leaderboards</span>
              </NavLink>
            </li>

            <li className="sidebar-item">
              <NavLink 
                to="/executive-dashboard" 
                className={({ isActive }) => isActive ? "active" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <IconBI />
                <span>Executive Dashboard</span>
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;
