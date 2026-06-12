import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Tasks from '../pages/Tasks';
import FieldVisits from '../pages/FieldVisits';
import ManagerReviews from '../pages/ManagerReviews';
import AttendanceHistory from '../pages/AttendanceHistory';
import WhatsAppLogs from '../pages/WhatsAppLogs';
import EmployeeMaster from '../pages/EmployeeMaster';
import AMCServices from '../pages/AMCServices';
import CustomerFeedback from '../pages/CustomerFeedback';
import FeedbackSubmit from '../pages/FeedbackSubmit';
import PerformanceAnalytics from '../pages/PerformanceAnalytics';
import ExecutiveDashboard from '../pages/ExecutiveDashboard';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/feedback/:type/:id" element={<FeedbackSubmit />} />

      {/* Protected routes - logged in users only */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/tasks" 
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/visits" 
        element={
          <ProtectedRoute>
            <FieldVisits />
          </ProtectedRoute>
        } 
      />

      {/* Protected Manager-Only Routes */}
      <Route 
        path="/reviews" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerReviews />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/attendance" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <AttendanceHistory />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/whatsapp-logs" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <WhatsAppLogs />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/employees-master" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <EmployeeMaster />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/amc-services" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <AMCServices />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/customer-feedback" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <CustomerFeedback />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/performance-analytics" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <PerformanceAnalytics />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/executive-dashboard" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ExecutiveDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
