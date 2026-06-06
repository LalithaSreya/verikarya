import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Tasks from '../pages/Tasks';
import FieldVisits from '../pages/FieldVisits';
import ManagerReviews from '../pages/ManagerReviews';
import AttendanceHistory from '../pages/AttendanceHistory';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

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

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
