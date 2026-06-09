import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Sidebar = () => {
  const { isManager, isEmployee } = useAuth();

  return (
    <aside className="sidebar">
      <ul className="sidebar-menu">
        <li className="sidebar-item">
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "active" : ""}
            end
          >
            📊 Dashboard
          </NavLink>
        </li>

        <li className="sidebar-item">
          <NavLink 
            to="/tasks" 
            className={({ isActive }) => isActive ? "active" : ""}
          >
            📋 Tasks
          </NavLink>
        </li>

        <li className="sidebar-item">
          <NavLink 
            to="/visits" 
            className={({ isActive }) => isActive ? "active" : ""}
          >
            📍 On-Site Audits
          </NavLink>
        </li>

        {isManager && (
          <>
            <li className="sidebar-item">
              <NavLink 
                to="/reviews" 
                className={({ isActive }) => isActive ? "active" : ""}
              >
                🔍 Verify Evidence
              </NavLink>
            </li>
            <li className="sidebar-item">
              <NavLink 
                to="/attendance" 
                className={({ isActive }) => isActive ? "active" : ""}
              >
                📅 Attendance Logs
              </NavLink>
            </li>
            <li className="sidebar-item">
              <NavLink 
                to="/whatsapp-logs" 
                className={({ isActive }) => isActive ? "active" : ""}
              >
                💬 WhatsApp Logs
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;
