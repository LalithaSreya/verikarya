import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CameraCapture from '../components/CameraCapture';
import useGeolocation from '../hooks/useGeolocation';
import { useAuth } from '../hooks/useAuth';

export const EmployeeDashboard = () => {
  const { user, updateOfficeLocationState } = useAuth();
  const { location: currentLoc, loading: gpsLoading, getLocation } = useGeolocation();

  const [attendance, setAttendance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Punch modal state
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchType, setPunchType] = useState('checkin'); // 'checkin' | 'checkout'
  const [punchStep, setPunchStep] = useState(1); // 1 = GPS Check, 2 = Show Code, 3 = Camera Capture & Submit
  const [gpsCheckPassed, setGpsCheckPassed] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(null);
  const [gpsCheckError, setGpsCheckError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [attendanceRes, tasksRes, visitsRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/tasks'),
        api.get('/visits')
      ]);

      setAttendance(attendanceRes.data.data);
      setTasks(tasksRes.data.data);
      setVisits(visitsRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Open Modal & Trigger GPS check
  const openPunchModal = async (type) => {
    setPunchType(type);
    setPunchModalOpen(true);
    setPunchStep(1);
    setGpsCheckPassed(false);
    setGpsDistance(null);
    setGpsCheckError('');
    setVerificationCode('');
    setCapturedPhoto(null);
    setModalError('');
    
    // Trigger GPS check
    performGpsCheck(type);
  };

  const performGpsCheck = async (type) => {
    setGpsCheckError('');
    try {
      const loc = await getLocation();
      
      // Get office location from employee profile (fallback to default Bangalore coordinates)
      const officeLoc = user?.officeLocation || { lat: 12.9715987, lng: 77.5945627 };
      
      // Calculate local distance
      const distance = getDistanceInMeters(
        loc.lat,
        loc.lng,
        officeLoc.lat,
        officeLoc.lng
      );
      
      setGpsDistance(Math.round(distance * 100) / 100);

      if (distance <= 100) {
        setGpsCheckPassed(true);
      } else {
        setGpsCheckPassed(false);
        setGpsCheckError(`GPS verification failed. You are currently ${Math.round(distance)}m away. You must be within 100m of the office premises.`);
      }
    } catch (err) {
      setGpsCheckError(typeof err === 'string' ? err : 'Could not access GPS coordinates. Enable location permissions.');
    }
  };

  // Local distance helper (Haversine)
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Fetch VK-code for punch
  const proceedToGetCode = async () => {
    setModalError('');
    setModalLoading(true);
    setPunchStep(2);
    try {
      const res = await api.post('/attendance/request-code', { action: punchType });
      if (res.data.success) {
        setVerificationCode(res.data.code);
      }
    } catch (err) {
      setModalError('Failed to generate verification code. Please close and try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSetCurrentAsOffice = async () => {
    setModalLoading(true);
    setModalError('');
    try {
      const loc = await getLocation();
      const res = await api.put('/auth/office-location', { location: loc });
      if (res.data.success) {
        updateOfficeLocationState(loc);
        setGpsDistance(0);
        setGpsCheckPassed(true);
        setGpsCheckError('');
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to update office location.');
    } finally {
      setModalLoading(false);
    }
  };

  const closePunchModal = () => {
    setPunchModalOpen(false);
    setVerificationCode('');
    setCapturedPhoto(null);
    setModalError('');
    setGpsCheckPassed(false);
  };

  const handleCloseAttempt = () => {
    const hasProgress = capturedPhoto || verificationCode || gpsCheckPassed;
    if (hasProgress) {
      setShowDiscardConfirm(true);
    } else {
      closePunchModal();
    }
  };

  // Submit verified Punch In/Out
  const handlePunchSubmit = async () => {
    if (!capturedPhoto) {
      setModalError('Please capture live camera photo proof.');
      return;
    }

    setModalLoading(true);
    setModalError('');
    setMessage('');
    setError('');

    const endpoint = punchType === 'checkin' ? '/attendance/checkin' : '/attendance/checkout';
    
    try {
      // Re-fetch current location to send with submission
      const loc = await getLocation();

      const res = await api.post(endpoint, {
        photo: capturedPhoto,
        verificationCode,
        location: {
          lat: loc.lat,
          lng: loc.lng
        }
      });

      if (res.data.success) {
        setAttendance(res.data.data);
        setMessage(punchType === 'checkin' 
          ? 'Successfully verified and checked in today! Have a great workday.'
          : 'Successfully verified and checked out. Thank you for your work!'
        );
        closePunchModal();
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Verification punch failed.');
    } finally {
      setModalLoading(false);
    }
  };

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

  const totalVisits = visits.length;
  const pendingVisits = visits.filter(v => v.status !== 'submitted').length;
  const submittedVisits = visits.filter(v => v.status === 'submitted').length;

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <p className="text-muted">Loading dashboard data...</p>;
  }

  return (
    <div>
      {/* Twilio Simulator Mode Alert Banner */}
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
          <strong>Twilio Gateway Simulator:</strong> The system is currently running in local Simulation Mode. All verification codes and message notifications are logged directly to the backend database outbox instead of live cellular delivery.
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Welcome to VeriKarya</h2>
        <p className="text-muted">Track your attendance, manage assigned tasks, and submit on-site audit verification proofs.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="grid-dashboard" style={{ marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Left column: Attendance punch & Workload list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          
          {/* Attendance Punch Box */}
          <div className="card">
            <h3 className="card-title">🕒 Attendance Punch (Verified & Geofenced)</h3>
            <p className="card-subtitle">Punch-in/out requires 100m office geofence check, camera identity verification, and VK code.</p>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              alignItems: 'center', 
              backgroundColor: 'var(--bg-color)', 
              padding: 'var(--spacing-md)', 
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-md)',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CHECK IN</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: attendance?.checkIn ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  {formatTime(attendance?.checkIn)}
                </div>
                {attendance?.checkIn && (
                  <span className={`badge badge-${attendance.checkInReviewStatus}`} style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                    {attendance.checkInReviewStatus}
                  </span>
                )}
              </div>
              
              <div style={{ height: '35px', width: '1px', backgroundColor: 'var(--border-color)' }} />
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CHECK OUT</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: attendance?.checkOut ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  {formatTime(attendance?.checkOut)}
                </div>
                {attendance?.checkOut && (
                  <span className={`badge badge-${attendance.checkOutReviewStatus}`} style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                    {attendance.checkOutReviewStatus}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => openPunchModal('checkin')}
                disabled={attendance && !attendance.checkOut}
              >
                Punch In (Verify Presence)
              </button>
              
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => openPunchModal('checkout')}
                disabled={!attendance || !!attendance.checkOut}
              >
                Punch Out (Verify Exit)
              </button>
            </div>
            
            <div style={{ marginTop: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.85rem' }} className="text-muted">
              {attendance ? (
                attendance.checkOut 
                  ? `Shift status: Clocked out at ${formatTime(attendance.checkOut)}. Ready to check-in again.` 
                  : `Shift status: Clocked in at ${formatTime(attendance.checkIn)}. Session is active.`
              ) : 'You have not checked in yet today.'}
            </div>
          </div>

          {/* Quick Tasks List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ margin: 0 }}>📋 Urgent Tasks</h3>
              <Link to="/tasks" style={{ fontSize: '0.875rem', fontWeight: 600 }}>View All Tasks →</Link>
            </div>
            
            {tasks.filter(t => t.status !== 'completed').length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                🎉 No pending tasks! You are all caught up.
              </p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.filter(t => t.status !== 'completed').slice(0, 3).map(task => (
                      <tr key={task._id}>
                        <td style={{ fontWeight: 600 }}>{task.title}</td>
                        <td>
                          <span className={`badge badge-${task.priority}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td>{new Date(task.deadline).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${task.status.replace('_', '-')}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

             {/* Right column: Stats Summary & On-Site Audits overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          
          {/* Work Summary Stats Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white' }}>
            <h3 style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>📊 Work Summary</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>Your task and field audit milestones.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                <span>Total Assigned Tasks</span>
                <span style={{ fontWeight: 700 }}>{totalTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                <span>Completed Tasks</span>
                <span style={{ fontWeight: 700 }}>{completedTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                <span>Pending Tasks</span>
                <span style={{ fontWeight: 700 }}>{pendingTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                <span>Submitted On-Site Audits</span>
                <span style={{ fontWeight: 700 }}>{submittedVisits} / {totalVisits}</span>
              </div>
            </div>
          </div>
 
          {/* Quick Visits List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ margin: 0 }}>📍 On-Site Audits</h3>
              <Link to="/visits" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Go to Audits →</Link>
            </div>
            
            {visits.filter(v => v.status !== 'submitted').length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                🚗 No pending on-site audits scheduled.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {visits.filter(v => v.status !== 'submitted').slice(0, 2).map(visit => (
                  <div key={visit._id} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--border-radius-sm)', 
                    padding: 'var(--spacing-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ fontWeight: 600 }}>{visit.clientName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{visit.purpose}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className={`badge badge-${visit.status}`}>{visit.status}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger-color)' }}>
                        Due: {new Date(visit.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Attendance Verification Punch Modal overlay */}
      {punchModalOpen && (
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
          <div className="card" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-xs)' }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
                🔐 {punchType === 'checkin' ? 'Clock-In Verification' : 'Clock-Out Verification'}
              </h3>
              <button 
                onClick={handleCloseAttempt} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            {modalError && <div className="alert alert-danger">{modalError}</div>}

            {/* Step 1: Office GPS Geofence Check */}
            {punchStep === 1 && (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  VeriKarya must validate that you are physically present at the office premises (100m range).
                </p>

                {gpsLoading ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                    <p className="text-muted">Acquiring current GPS coordinates...</p>
                  </div>
                ) : (
                  <div>
                    {gpsCheckPassed ? (
                      <div className="alert alert-success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <b>Geofence Matched!</b> You are inside the office range. Distance: <b>{gpsDistance} meters</b>.
                      </div>
                    ) : (
                      <div className="alert alert-danger">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        <b>Geofence Check Failed.</b> You are currently <b>{gpsDistance ? `${gpsDistance}m` : 'unknown'}</b> away. You must be within 100 meters of your assigned office coordinate.
                      </div>
                    )}

                    {gpsCheckError && <div style={{ fontSize: '0.85rem', color: 'var(--danger-color)', margin: 'var(--spacing-xs) 0' }}>{gpsCheckError}</div>}
                    
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn btn-outline" type="button" onClick={() => performGpsCheck(punchType)} disabled={gpsLoading}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                        Refresh GPS Lock
                      </button>
                      <button 
                        className="btn btn-primary" 
                        type="button"
                        onClick={proceedToGetCode}
                        disabled={!gpsCheckPassed}
                      >
                        Proceed to Code
                      </button>
                    </div>

                    {!gpsCheckPassed && (
                      <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={handleSetCurrentAsOffice}
                          disabled={gpsLoading || modalLoading}
                          style={{ borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                          Testing Bypass: Set Current GPS as Office
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Code Display */}
            {punchStep === 2 && (
              <div>
                {modalLoading ? (
                  <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>Generating Secure Code...</p>
                ) : (
                  <div>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Please match this dynamic verification code generated for your punch session:
                    </p>

                    <div className="verification-code-container">
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PUNCH CODE</div>
                      <div className="verification-code-text">{verificationCode}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn btn-outline" onClick={() => setPunchStep(1)}>
                        Back to GPS
                      </button>
                      <button className="btn btn-primary" onClick={() => setPunchStep(3)}>
                        Proceed to Camera Capture
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Camera Capture */}
            {punchStep === 3 && (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Snap a live photo of yourself at the site to verify your identity.
                </p>

                <CameraCapture 
                  onCapture={(photoData) => {
                    setCapturedPhoto(photoData);
                    setModalError('');
                  }}
                  onClear={() => setCapturedPhoto(null)}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
                  <button className="btn btn-outline" onClick={() => setPunchStep(2)}>
                    Back to Code
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handlePunchSubmit}
                    disabled={!capturedPhoto || modalLoading}
                  >
                    {modalLoading ? 'Punches Submitting...' : `Verify & Complete ${punchType === 'checkin' ? 'Clock-In' : 'Clock-Out'}`}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Discard Progress warning modal */}
      {showDiscardConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '400px', backgroundColor: 'var(--card-bg)',
            borderColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: 'var(--spacing-lg)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)',
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Discard Progress?
              </h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: 'var(--spacing-lg)' }}>
              Are you sure you want to discard your clock-in/out verification progress? Any captured photo or check-in details will be lost.
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowDiscardConfirm(false)}
              >
                Go Back
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  closePunchModal();
                  setShowDiscardConfirm(false);
                }}
                style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;
