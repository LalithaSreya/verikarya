import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export const ManagerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [statsRes, reviewsRes] = await Promise.all([
        api.get('/reviews/analytics'),
        api.get('/reviews?status=pending')
      ]);

      setStats(statsRes.data.data);
      setPendingReviews(reviewsRes.data.data);
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
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Manager Operations Console</h2>
          <p className="text-muted">Real-time workforce verification, audit trails, and performance monitoring.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Link to="/tasks" className="btn btn-primary">➕ Create Task</Link>
          <Link to="/visits" className="btn btn-secondary">➕ Schedule Visit</Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-cols-1-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Metric 1 */}
        <div className="card metric-card">
          <div>
            <div className="card-title">👥 Staff Directory</div>
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
            <div className="card-title">🕒 Present Today</div>
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
            <div className="card-title">📋 Task Progression</div>
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
            <h3 style={{ margin: 0 }}>🔍 Pending Evidence Verification ({pendingReviews.length})</h3>
            <Link to="/reviews" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Review Center →</Link>
          </div>

          {pendingReviews.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              ✅ No pending submissions! All employee work has been reviewed.
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
            <h3>📈 Audit Trail Summary</h3>
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
            <h4 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xs)' }}>📋 Manager Playbook</h4>
            <ul style={{ paddingLeft: 'var(--spacing-md)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }} className="text-muted">
              <li>Create <b>Tasks</b> to track inside-premise office activities.</li>
              <li>Schedule <b>Field Visits</b> with client coordinates to track external client deployments.</li>
              <li>Geofencing validates that workers are within <b>100 meters</b> of the target coordinates before they can upload client evidence.</li>
              <li>Open <b>Verify Evidence</b> to audit direct-camera image frames and matched shortcodes.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;
