import React from 'react';
import { useAuth } from '../hooks/useAuth';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
import DashboardLayout from '../layouts/DashboardLayout';

export const Dashboard = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      {user.role === 'manager' ? (
        <ManagerDashboard />
      ) : (
        <EmployeeDashboard />
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
