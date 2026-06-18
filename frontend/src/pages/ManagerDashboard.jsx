import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export const ManagerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [twilioSimulationMode, setTwilioSimulationMode] = useState(true);

  const handleResetSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/auth/seed');
      if (res.data.success) {
        alert('Database reset and seeded successfully! Logging out to log in with seeded accounts.');
        localStorage.removeItem('verikarya_token');
        window.location.href = '/login';
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to seed database.');
    } finally {
      setSeeding(false);
      setShowSeedConfirm(false);
    }
  };

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [statsRes, reviewsRes, configRes] = await Promise.all([
        api.get('/reviews/analytics'),
        api.get('/reviews?status=pending'),
        api.get('/auth/config').catch(() => ({ data: { twilioSimulationMode: true } }))
      ]);

      setStats(statsRes.data.data);
      setPendingReviews(reviewsRes.data.data);
      setTwilioSimulationMode(configRes.data.twilioSimulationMode);
    } catch (err) {
      console.error('Error fetching manager dashboard data:', err);
      setError('Failed to fetch dashboard metrics. Make sure you are logged in as a manager.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, []);

  if (loading) {
    return <p className="text-muted">Loading manager dashboard analytics...</p>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  // Calculate percentages for custom visualization
  const attendanceRate = stats.totalEmployees > 0 
    ? Math.round((stats.presentToday / stats.totalEmployees) * 100) 
    : 0;

  const taskCompletionRate = stats.tasks.total > 0 
    ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) 
    : 0;

  const totalReviews = stats.reviews.approved + stats.reviews.rejected;
  const approvalRate = totalReviews > 0
    ? Math.round((stats.reviews.approved / totalReviews) * 100)
    : 0;

  return (
    <div>
      {/* Twilio Simulator Mode Alert Banner */}
      {twilioSimulationMode && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '12px 16px', 
          backgroundColor: '#FEF3C7', 
          border: '1px solid #FCD34D', 
          borderRadius: '8px', 
          color: '#92400E', 
          fontSize: '0.9rem', 
          marginBottom: 'var(--spacing-md)',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong>Twilio Gateway Simulator:</strong> The system is currently running in local Simulation Mode. All verification codes and message notifications are logged directly to the backend database outbox instead of live cellular delivery. View outbox messages in the <Link to="/whatsapp-logs" style={{ textDecoration: 'underline', fontWeight: 'bold', color: 'inherit' }}>WhatsApp Logs</Link> console.
          </div>
        </div>
      )}

      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Manager Operations Console</h2>
          <p className="text-muted">Real-time workforce verification, audit trails, and performance monitoring.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setShowSeedConfirm(true)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              borderColor: 'var(--danger-color)', 
              color: 'var(--danger-color)' 
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
            Reset & Seed Test Data
          </button>
          <Link to="/tasks" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create Task
          </Link>
          <Link to="/visits" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Schedule Visit
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-cols-1-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Metric 1 */}
        <div className="card metric-card">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Staff Directory
            </div>
            <div className="card-subtitle">Active workforce count</div>
          </div>
          <div>
            <div className="metric-value">{stats.totalEmployees}</div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)' }}>
              Employees registered
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card metric-card">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--secondary-color)' }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Present Today
            </div>
            <div className="card-subtitle">Attendance rate</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="metric-value">{stats.presentToday}</div>
              <div style={{ 
                position: 'relative', 
                width: '50px', 
                height: '50px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--secondary-color) ${attendanceRate}%, var(--border-color) 0)` 
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  left: '4px', 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '50%', 
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {attendanceRate}%
                </div>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)' }}>
              Punch-ins out of {stats.totalEmployees} employees
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card metric-card">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Task Progression
            </div>
            <div className="card-subtitle">Completion rate</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="metric-value">{stats.tasks.completed} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {stats.tasks.total}</span></div>
              <div style={{ 
                position: 'relative', 
                width: '50px', 
                height: '50px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--primary-color) ${taskCompletionRate}%, var(--border-color) 0)` 
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  left: '4px', 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '50%', 
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {taskCompletionRate}%
                </div>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)' }}>
              Completed out of {stats.tasks.total} tasks
            </div>
          </div>
        </div>

      </div>

      <div className="grid-dashboard">
        
        {/* Left column: Submissions Pending Review */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Pending Evidence Verification ({pendingReviews.length})
            </h3>
            <Link to="/reviews" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Review Center →</Link>
          </div>

          {pendingReviews.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              No pending submissions! All employee work has been reviewed.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Submitted By</th>
                    <th>Type</th>
                    <th>Ref Title / Client</th>
                    <th>Code</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReviews.slice(0, 5).map((review) => {
                    const assigneeName = review.details?.assignedTo?.name || 'Unknown';
                    const title = review.type === 'task' 
                      ? review.details?.title 
                      : `${review.details?.clientName} (Field Visit)`;
                    return (
                      <tr key={review._id}>
                        <td>{assigneeName}</td>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600 }} className="text-muted">
                            {review.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{title}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {review.details?.verificationCode || '---'}
                        </td>
                        <td>
                          <Link to="/reviews" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Verify Proof
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Audit History & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          
          {/* Audit Trail Card */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Audit Trail Summary
            </h3>
            <p className="card-subtitle">Evidence review breakdown</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span>Approved activities</span>
                  <span style={{ fontWeight: 700, color: 'var(--success-color)' }}>{stats.reviews.approved}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${approvalRate}%`, height: '100%', backgroundColor: 'var(--success-color)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-sm)' }}>
                <span>Rejected activities</span>
                <span style={{ fontWeight: 700, color: 'var(--danger-color)' }}>{stats.reviews.rejected}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Unreviewed items queue</span>
                <span style={{ fontWeight: 700, color: 'var(--warning-color)' }}>{stats.reviews.pending}</span>
              </div>

            </div>
          </div>

          {/* Quick Operations Guide */}
          <div className="card" style={{ backgroundColor: 'var(--primary-light)', borderColor: '#BFDBFE' }}>
            <h4 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              Manager Playbook
            </h4>
            <ul style={{ paddingLeft: 'var(--spacing-md)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }} className="text-muted">
              <li>Create <b>Tasks</b> to track inside-premise office activities.</li>
              <li>Schedule <b>Field Visits</b> with client coordinates to track external client deployments.</li>
              <li>Geofencing validates that workers are within <b>100 meters</b> of the target coordinates before they can upload client evidence.</li>
              <li>Open <b>Verify Evidence</b> to audit direct-camera image frames and matched shortcodes.</li>
            </ul>
          </div>

        </div>

      </div>

      {/* Custom Database Seed Warning Modal */}
      {showSeedConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '450px', backgroundColor: 'var(--card-bg)',
            borderColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: 'var(--spacing-lg)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)',
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Reset & Seed Database?</h3>
            </div>
            
            <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: 'var(--spacing-lg)' }}>
              This action will <strong>permanently delete</strong> all records including users, tasks, audits, evidence, and attendance logs. 
              The database will be restored to its default seed state. You will be logged out.
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline" 
                type="button" 
                onClick={() => setShowSeedConfirm(false)} 
                disabled={seeding}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                type="button" 
                onClick={handleResetSeed}
                disabled={seeding}
              >
                {seeding ? 'Seeding...' : 'Yes, WIPE and SEED'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
