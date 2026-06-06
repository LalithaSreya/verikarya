import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

export const AttendanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal display state for reviewing attendance photo proofs
  const [activePhoto, setActivePhoto] = useState(null); // URL path
  const [activeMeta, setActiveMeta] = useState(null); // { type, name, code, date }

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/attendance/history');
      setHistory(res.data.data);
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setError('Failed to fetch attendance history log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const openPhotoModal = (photoPath, type, name, code, date) => {
    if (!photoPath) return;
    const fullUrl = (photoPath.startsWith('http://') || photoPath.startsWith('https://'))
      ? photoPath
      : `${backendUrl}${photoPath}`;
    setActivePhoto(fullUrl);
    setActiveMeta({ type, name, code, date });
  };

  const closePhotoModal = () => {
    setActivePhoto(null);
    setActiveMeta(null);
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>📅 Daily Attendance Logs</h2>
        <p className="text-muted">Review team daily check-in timestamps, verified photos, and matched codes.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Verified Attendance Registry</h3>

        {loading ? (
          <p className="text-muted">Loading attendance logs...</p>
        ) : history.length === 0 ? (
          <p className="text-muted" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            No attendance entries logged in the system.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check-in Details</th>
                  <th>Check-out Details</th>
                  <th>Work Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const empName = record.user?.name || 'Deleted User';
                  const dateStr = formatDate(record.date);
                  return (
                    <tr key={record._id}>
                      <td style={{ fontWeight: 600 }}>{empName}</td>
                      <td>{dateStr}</td>
                      
                      {/* Check-In Details column */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                            🕒 {formatTime(record.checkIn)}
                          </span>
                          {record.checkInCode && (
                            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              Code: <b>{record.checkInCode}</b>
                            </span>
                          )}
                          {record.checkInPhoto && (
                            <button 
                              className="btn btn-outline" 
                              onClick={() => openPhotoModal(record.checkInPhoto, 'Clock-In Photo Proof', empName, record.checkInCode, dateStr)}
                              style={{ padding: '2px 8px', fontSize: '0.75rem', marginTop: '2px', width: 'fit-content' }}
                            >
                              👁️ View Photo
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Check-Out Details column */}
                      <td>
                        {record.checkOut ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                              🕒 {formatTime(record.checkOut)}
                            </span>
                            {record.checkOutCode && (
                              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                Code: <b>{record.checkOutCode}</b>
                              </span>
                            )}
                            {record.checkOutPhoto && (
                              <button 
                                className="btn btn-outline" 
                                onClick={() => openPhotoModal(record.checkOutPhoto, 'Clock-Out Photo Proof', empName, record.checkOutCode, dateStr)}
                                style={{ padding: '2px 8px', fontSize: '0.75rem', marginTop: '2px', width: 'fit-content' }}
                              >
                                👁️ View Photo
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">---</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td>
                        {record.checkOut ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="badge badge-completed">Shift Done</span>
                            <span style={{ fontSize: '0.75rem' }} className="text-muted">
                              In: {record.checkInReviewStatus} | Out: {record.checkOutReviewStatus}
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-started">On Duty</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Photo Audit Modal */}
      {activePhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--spacing-md)'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-xs)' }}>
              <h3 style={{ margin: 0 }}>{activeMeta?.type}</h3>
              <button 
                onClick={closePhotoModal} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            <img 
              src={activePhoto} 
              alt="Verification Capture"
              style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', marginBottom: 'var(--spacing-md)' }}
            />

            <div style={{ 
              backgroundColor: 'var(--bg-color)', 
              padding: 'var(--spacing-sm)', 
              borderRadius: 'var(--border-radius-sm)', 
              fontSize: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }} className="text-muted">
              <div><b>Worker:</b> {activeMeta?.name}</div>
              <div><b>Date:</b> {activeMeta?.date}</div>
              <div><b>Matched Code:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)' }}>{activeMeta?.code}</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
              <button className="btn btn-primary" onClick={closePhotoModal}>
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AttendanceHistory;
