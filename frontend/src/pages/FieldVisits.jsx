import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import useGeolocation from '../hooks/useGeolocation';
import api from '../services/api';
import LeafletMap from '../components/LeafletMap';
import CameraCapture from '../components/CameraCapture';
import DashboardLayout from '../layouts/DashboardLayout';

export const FieldVisits = () => {
  const { isManager, isEmployee } = useAuth();
  const { location: currentLoc, error: gpsError, loading: gpsLoading, getLocation } = useGeolocation();

  // Lists
  const [visits, setVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manager Form State
  const [clientName, setClientName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [targetLat, setTargetLat] = useState('');
  const [targetLng, setTargetLng] = useState('');
  const [deadline, setDeadline] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [clientPhone, setClientPhone] = useState('');

  // Employee Submission Modal State
  const [activeVisit, setActiveVisit] = useState(null); // Visit currently being submitted
  const [modalStep, setModalStep] = useState(1); // 1 = GPS Check, 2 = Show Code, 3 = Camera Capture, 4 = Notes & Submit
  const [gpsCheckPassed, setGpsCheckPassed] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(null);
  const [gpsCheckError, setGpsCheckError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [proofType, setProofType] = useState('gallery'); // 'gallery' or 'camera'

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const visitsRes = await api.get('/visits');
      setVisits(visitsRes.data.data);

      if (isManager) {
        const employeesRes = await api.get('/auth/employees');
        setEmployees(employeesRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching visits data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Manager: Create Visit
  const handleCreateVisit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const latNum = parseFloat(targetLat);
    const lngNum = parseFloat(targetLng);

    if (!clientName || !purpose || !assignedTo || isNaN(latNum) || isNaN(lngNum) || !deadline) {
      setFormError('Please fill in all fields with valid data.');
      return;
    }

    setSubmittingVisit(true);
    try {
      const res = await api.post('/visits', {
        clientName,
        purpose,
        assignedTo,
        targetLocation: {
          lat: latNum,
          lng: lngNum
        },
        deadline,
        clientPhone
      });

      if (res.data.success) {
        setFormSuccess('Field visit scheduled successfully!');
        // Reset form
        setClientName('');
        setPurpose('');
        setAssignedTo('');
        setTargetLat('');
        setTargetLng('');
        setDeadline('');
        setClientPhone('');
        // Reload visits
        const visitsRes = await api.get('/visits');
        setVisits(visitsRes.data.data);
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create field visit.');
    } finally {
      setSubmittingVisit(false);
    }
  };

  // Employee: Start Visit
  const handleStartVisit = async (visitId) => {
    try {
      // First, get employee current GPS coordinates
      const loc = await getLocation();
      
      const res = await api.post(`/visits/${visitId}/start`, {
        location: {
          lat: loc.lat,
          lng: loc.lng
        }
      });

      if (res.data.success) {
        // Refresh visits list
        const visitsRes = await api.get('/visits');
        setVisits(visitsRes.data.data);
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : (err.response?.data?.error || 'Could not access GPS. Please allow permissions.'));
    }
  };

  // Employee: Open Submit Modal (Starts with GPS Validation check)
  const openSubmitModal = (visit) => {
    setActiveVisit(visit);
    setModalStep(1);
    setGpsCheckPassed(false);
    setGpsDistance(null);
    setGpsCheckError('');
    setVerificationCode('');
    setCapturedPhoto(null);
    setSubmissionNotes('');
    setModalError('');
    
    // Automatically trigger GPS lookup
    performGpsCheck(visit);
  };

  // Employee: Trigger GPS checking & calculate distance
  const performGpsCheck = async (visit) => {
    setGpsCheckError('');
    try {
      const loc = await getLocation();
      
      // Calculate distance on backend or locally
      // To perform a rigorous check, we check distance using Haversine locally for immediate feedback
      const distance = getDistanceInMeters(
        loc.lat,
        loc.lng,
        visit.targetLocation.lat,
        visit.targetLocation.lng
      );
      
      setGpsDistance(Math.round(distance * 100) / 100);

      if (distance <= 100) {
        setGpsCheckPassed(true);
      } else {
        setGpsCheckPassed(false);
        setGpsCheckError(`GPS check failed. Target location is ${Math.round(distance)}m away. You must be within 100m of the client location.`);
      }
    } catch (err) {
      setGpsCheckError(typeof err === 'string' ? err : 'Could not access GPS coordinates. Enable location in browser.');
    }
  };

  // Helper local Haversine distance calculator for instant UI check
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius
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

  // Testing Bypass: Set Current GPS coordinates as the target visit location
  const handleSetCurrentAsTarget = async () => {
    setModalError('');
    try {
      const loc = await getLocation();
      const res = await api.put(`/visits/${activeVisit._id}/bypass-location`, { location: loc });
      if (res.data.success) {
        // Update activeVisit and visits list locally
        const updatedVisit = res.data.data;
        setActiveVisit(updatedVisit);
        setVisits(prev => prev.map(v => v._id === updatedVisit._id ? { ...v, targetLocation: updatedVisit.targetLocation } : v));
        
        // Mark check as passed
        setGpsDistance(0);
        setGpsCheckPassed(true);
        setGpsCheckError('');
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to update target location.');
    }
  };

  // Employee: Move from Step 1 (GPS check passed) to Step 2 (Get VK Code)
  const proceedToGetCode = async () => {
    setModalError('');
    setCodeLoading(true);
    setModalStep(2);
    try {
      const res = await api.post(`/visits/${activeVisit._id}/request-code`);
      if (res.data.success) {
        setVerificationCode(res.data.code);
      }
    } catch (err) {
      setModalError('Failed to fetch verification code. Please retry.');
    } finally {
      setCodeLoading(false);
    }
  };

  const closeSubmitModal = () => {
    setActiveVisit(null);
    setGpsCheckPassed(false);
    setGpsDistance(null);
    setGpsCheckError('');
    setVerificationCode('');
    setCapturedPhoto(null);
    setSubmissionNotes('');
    setModalError('');
    setProofType('gallery');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setModalError('Please upload an image file (png, jpg, jpeg).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result);
        setModalError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Employee: Final Submit Visit Evidence
  const handleVisitSubmit = async () => {
    if (!capturedPhoto) {
      setModalError('Please provide image proof.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      // Re-fetch current location to send with submission
      const loc = await getLocation();

      const res = await api.post(`/visits/${activeVisit._id}/submit`, {
        location: {
          lat: loc.lat,
          lng: loc.lng
        },
        photo: capturedPhoto,
        verificationCode,
        notes: submissionNotes
      });

      if (res.data.success) {
        closeSubmitModal();
        // Refresh visits list
        const visitsRes = await api.get('/visits');
        setVisits(visitsRes.data.data);
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to submit field visit evidence.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Employee: Save daily progress update
  const handleSaveProgress = async () => {
    setModalSubmitting(true);
    setModalError('');
    try {
      const loc = await getLocation();

      const res = await api.post(`/visits/${activeVisit._id}/progress`, {
        location: loc ? { lat: loc.lat, lng: loc.lng } : null,
        photo: capturedPhoto || null,
        notes: submissionNotes
      });

      if (res.data.success) {
        closeSubmitModal();
        // Refresh visits list
        const visitsRes = await api.get('/visits');
        setVisits(visitsRes.data.data);
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save daily progress.');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>📍 On-Site Audit Tracker</h2>
        <p className="text-muted">
          {isManager
            ? 'Schedule on-site client audits with target coordinates and monitor security workforce locations.'
            : 'Start on-site audits, track target ranges, and submit geofenced audit verification proofs.'}
        </p>
      </div>

      <div className="grid-dashboard">
        
        {/* Left Column: Visits List */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>On-Site Audits Schedule</h3>

            {loading ? (
              <p className="text-muted">Loading on-site audits...</p>
            ) : visits.length === 0 ? (
              <p className="text-muted" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                No on-site audits logged in the system.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {visits.map((visit) => (
                  <div key={visit._id} style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: visit.status === 'submitted' ? 'var(--bg-color)' : 'white'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{visit.clientName}</h4>
                        <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{visit.purpose}</div>
                      </div>
                      <span className={`badge badge-${visit.status}`}>
                        {visit.status}
                      </span>
                    </div>

                    <div style={{ margin: 'var(--spacing-md) 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }} className="text-muted">
                        <span>🎯 <b>Coordinates: </b>{visit.targetLocation.lat}, {visit.targetLocation.lng}</span>
                        <span>📅 <b>Deadline: </b>{new Date(visit.deadline).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Interactive map display when active and started by Employee */}
                      {isEmployee && visit.status === 'started' && (
                        <div style={{ marginTop: 'var(--spacing-sm)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '4px' }}>
                            🗺️ Target Geofence (Teal Circle = 100m Range)
                          </div>
                          <LeafletMap 
                            targetLoc={visit.targetLocation}
                            currentLoc={currentLoc}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)', fontSize: '0.825rem', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-sm)' }} className="text-muted">
                      <div>
                        <b>Assigned To: </b>{visit.assignedTo?.name || 'Unassigned'}
                      </div>
                      <div>
                        {visit.status === 'submitted' && visit.distanceToTarget !== undefined && (
                          <div style={{ color: 'var(--success-color)', fontWeight: 600 }}>
                            Validated at distance: {visit.distanceToTarget} meters
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress History timeline logs */}
                    {visit.progressHistory && visit.progressHistory.length > 0 && (
                      <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)', fontSize: '0.8rem' }}>⏳ Saved Progress Logs ({visit.progressHistory.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {visit.progressHistory.map((progress, idx) => (
                            <div key={idx} style={{ borderLeft: '2px solid var(--primary-color)', paddingLeft: '6px', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(progress.timestamp).toLocaleDateString()}: </span>
                              <span>{progress.notes || 'Progress update logged.'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employee Actions */}
                    {isEmployee && (
                      <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
                        {visit.status === 'pending' && (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleStartVisit(visit._id)}
                            disabled={gpsLoading}
                          >
                            {gpsLoading ? 'Accessing GPS...' : '🚀 Start Visit (Punch GPS)'}
                          </button>
                        )}
                        {visit.status === 'started' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openSubmitModal(visit)}>
                            🔒 Validate GPS & Submit Evidence
                          </button>
                        )}
                        {visit.status === 'submitted' && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <span>✓ Evidence Uploaded</span>
                            <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontWeight: 700 }}>
                              {visit.verificationCode}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manager Form or details */}
        <div>
          {isManager ? (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>➕ Schedule On-Site Audit</h3>
              
              {formError && <div className="alert alert-danger">{formError}</div>}
              {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

              <form onSubmit={handleCreateVisit}>
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Apex Corp Headquarters"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Visit Purpose</label>
                  <textarea 
                    className="form-input" 
                    rows="2"
                    placeholder="e.g. Conduct annual hardware installation audit..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select 
                    className="form-select"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div style={{ border: '1px solid var(--border-color)', padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>🎯 Target Coordinates (Google Maps GPS)</div>
                  
                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Latitude</label>
                      <input 
                        type="number" 
                        step="0.0000001"
                        className="form-input" 
                        placeholder="e.g. 12.9716"
                        value={targetLat}
                        onChange={(e) => setTargetLat(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Longitude</label>
                      <input 
                        type="number" 
                        step="0.0000001"
                        className="form-input" 
                        placeholder="e.g. 77.5946"
                        value={targetLng}
                        onChange={(e) => setTargetLng(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Tip: Search a location on maps and copy lat/lng coordinates (e.g. Bangalore center: 12.9716 / 77.5946).
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Client WhatsApp Number (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. +919876543210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  style={{ marginTop: 'var(--spacing-sm)' }}
                  disabled={submittingVisit}
                >
                  {submittingVisit ? 'Scheduling...' : 'Assign On-Site Audit'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card" style={{ backgroundColor: 'var(--bg-color)' }}>
              <h3>🛰️ Geofenced Audit Details</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 'var(--spacing-xs)' }}>
                On-site activity verification implements real-time geofence tracking:
              </p>
              <ul style={{ paddingLeft: 'var(--spacing-md)', fontSize: '0.85rem', marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }} className="text-muted">
                <li><b>Audit Initialization:</b> Clicks "Start Audit" to register starting coordinates. This opens the geofence map dashboard.</li>
                <li><b>Geofence Boundary:</b> You must move within <b>100 meters</b> of the target coordinates defined by the manager.</li>
                <li><b>Distance Check:</b> The system calculates your current distance using the browser GPS API. Submissions remain locked outside the 100m range.</li>
                <li><b>Direct Proof:</b> Match the verification shortcode, open device camera, snap image evidence, and upload.</li>
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Employee Evidence Submit Modal overlay */}
      {activeVisit && (
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
          <div className="card" style={{ maxWidth: '500px', width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-xs)' }}>
              <h3 style={{ margin: 0 }}>On-Site Audit & Geofence Verification</h3>
              <button 
                onClick={closeSubmitModal} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            {modalError && <div className="alert alert-danger">{modalError}</div>}

            {/* Step 1: GPS Geofence Check */}
            {modalStep === 1 && (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  VeriKarya must validate your exact coordinates before unlocking proof upload.
                </p>

                {gpsLoading ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                    <p className="text-muted">Interrogating GPS Satellites...</p>
                  </div>
                ) : (
                  <div>
                    {gpsCheckPassed ? (
                      <div className="alert alert-success">
                        ✅ <b>Geofence Matched!</b> You are currently within range. Distance to client: <b>{gpsDistance} meters</b>.
                      </div>
                    ) : (
                      <div className="alert alert-danger">
                        ❌ <b>Geofence Verification Failed.</b> You are currently <b>{gpsDistance ? `${gpsDistance}m` : 'unknown'}</b> away. You must be within 100 meters to complete.
                      </div>
                    )}

                    {gpsCheckError && <div style={{ fontSize: '0.85rem', color: 'var(--danger-color)', margin: 'var(--spacing-xs) 0' }}>{gpsCheckError}</div>}
                    
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn btn-outline" onClick={() => performGpsCheck(activeVisit)} disabled={gpsLoading}>
                        🔄 Refresh GPS Lock
                      </button>
                      <button 
                        className="btn btn-primary" 
                        onClick={proceedToGetCode}
                        disabled={!gpsCheckPassed}
                      >
                        Proceed to Code Generation
                      </button>
                    </div>

                    {!gpsCheckPassed && (
                      <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={handleSetCurrentAsTarget}
                          disabled={gpsLoading || modalSubmitting}
                          style={{ borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)', fontSize: '0.85rem' }}
                        >
                          🔧 Testing Bypass: Set Current GPS as Target
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Verification Code display */}
            {modalStep === 2 && (
              <div>
                {codeLoading ? (
                  <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>Generating VK-Code...</p>
                ) : (
                  <div>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Below is your unique verification code generated for this client audit. You must submit evidence linking this code.
                    </p>

                    <div className="verification-code-container">
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VERIKARYA SYSTEM CODE</div>
                      <div className="verification-code-text">{verificationCode}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn btn-outline" onClick={() => setModalStep(1)}>
                        Back to GPS Check
                      </button>
                      <button className="btn btn-primary" onClick={() => setModalStep(3)}>
                        Proceed to Camera Capture
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Camera or Gallery Proof */}
            {modalStep === 3 && (
              <div>
                {/* Tab Navigation */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--spacing-md)' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      background: 'none',
                      borderBottom: proofType === 'gallery' ? '2px solid var(--primary-color)' : 'none',
                      color: proofType === 'gallery' ? 'var(--primary-color)' : 'var(--text-muted)',
                      fontWeight: proofType === 'gallery' ? 600 : 400,
                      cursor: 'pointer'
                    }}
                    onClick={() => { setProofType('gallery'); setCapturedPhoto(null); }}
                  >
                    📁 Upload from Gallery
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      background: 'none',
                      borderBottom: proofType === 'camera' ? '2px solid var(--primary-color)' : 'none',
                      color: proofType === 'camera' ? 'var(--primary-color)' : 'var(--text-muted)',
                      fontWeight: proofType === 'camera' ? 600 : 400,
                      cursor: 'pointer'
                    }}
                    onClick={() => { setProofType('camera'); setCapturedPhoto(null); }}
                  >
                    📷 Take Live Photo
                  </button>
                </div>

                {proofType === 'gallery' ? (
                  <div>
                    {capturedPhoto ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={capturedPhoto} alt="Gallery upload preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }} />
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setCapturedPhoto(null)}
                          >
                            🔄 Clear / Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="file-upload-zone">
                        <span style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>📁</span>
                        <span style={{ fontWeight: 600 }}>Click to select/upload image</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>PNG, JPG, JPEG up to 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="file-upload-input"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <CameraCapture 
                    onCapture={(photoData) => {
                      setCapturedPhoto(photoData);
                      setModalError('');
                    }}
                    onClear={() => setCapturedPhoto(null)}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
                  <button className="btn btn-outline" onClick={() => setModalStep(2)}>
                    Back to Code
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setModalStep(4)}
                    disabled={!capturedPhoto}
                  >
                    Next: Notes
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Submission Notes & Upload */}
            {activeVisit.status === 'started' && modalStep === 4 && (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Add on-site audit log details.
                </p>

                {/* Previous Progress Updates Timeline */}
                {activeVisit.progressHistory && activeVisit.progressHistory.length > 0 && (
                  <div style={{ 
                    marginBottom: 'var(--spacing-md)', 
                    maxHeight: '150px', 
                    overflowY: 'auto', 
                    padding: 'var(--spacing-sm)', 
                    backgroundColor: 'var(--bg-color)', 
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      ⏳ Previous Days' Submissions ({activeVisit.progressHistory.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {activeVisit.progressHistory.map((progress, idx) => (
                        <div key={idx} style={{ borderLeft: '2px solid var(--primary-color)', paddingLeft: '8px', paddingVertical: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>
                            <span>Update #{idx + 1}</span>
                            <span>{new Date(progress.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div style={{ color: 'var(--text-main)' }}>{progress.notes || 'Progress update logged.'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Audit Log Notes</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Enter meeting notes, actions performed, or client sign-off summary..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                  />
                </div>

                <div style={{ 
                  backgroundColor: 'var(--bg-color)', 
                  padding: 'var(--spacing-sm)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  fontSize: '0.85rem',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }} className="text-muted">
                  <div><b>Verified Geofence Distance: </b> {gpsDistance} meters</div>
                  <div><b>Matched Code:</b> {verificationCode}</div>
                  <div><b>Proof Image Attached:</b> {capturedPhoto ? 'Yes' : 'No'}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                  <button className="btn btn-outline" onClick={() => setModalStep(3)}>
                    Back
                  </button>
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    onClick={handleSaveProgress}
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? 'Saving...' : 'Save Daily Progress'}
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleVisitSubmit}
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? 'Uploading Evidence...' : 'Submit Verification'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default FieldVisits;
