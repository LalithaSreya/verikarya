import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export const DashboardLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
