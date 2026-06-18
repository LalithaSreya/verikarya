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

  // Selection & Actions State
  const [selectedVisits, setSelectedVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

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
        fetchData();
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
      const loc = await getLocation();
      const res = await api.post(`/visits/${visitId}/start`, {
        location: {
          lat: loc.lat,
          lng: loc.lng
        }
      });

      if (res.data.success) {
        fetchData();
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

  const handleCloseAttempt = () => {
    const hasProgress = capturedPhoto || submissionNotes || verificationCode || gpsCheckPassed;
    if (hasProgress) {
      setShowDiscardConfirm(true);
    } else {
      closeSubmitModal();
    }
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
        fetchData();
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
        fetchData();
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save daily progress.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Selection Logic
  const handleClearSelection = () => {
    setSelectedVisits([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageVisitIds = paginatedVisits.map(v => v._id);
      setSelectedVisits(Array.from(new Set([...selectedVisits, ...pageVisitIds])));
    } else {
      const pageVisitIds = paginatedVisits.map(v => v._id);
      setSelectedVisits(selectedVisits.filter(id => !pageVisitIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectVisit = (e, id, index) => {
    const isChecked = e.target.checked;
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedVisits.slice(start, end + 1).map(v => v._id);
      if (isChecked) {
        setSelectedVisits(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedVisits(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedVisits(prev => [...prev, id]);
      } else {
        setSelectedVisits(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete Actions
  const handleDeleteClick = (visit) => {
    setVisitToDelete(visit);
    setDeleteMode('single');
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteClick = () => {
    setDeleteMode('bulk');
    setShowDeleteConfirm(true);
  };

  const executeSingleDelete = async (id) => {
    try {
      const res = await api.delete(`/visits/${id}`);
      if (res.data.success) {
        handleClearSelection();
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete visit.');
    }
  };

  const executeBulkDelete = async () => {
    try {
      const res = await api.delete('/visits', { data: { visitIds: selectedVisits } });
      if (res.data.success) {
        handleClearSelection();
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete selected visits.');
    }
  };

  // Search logic
  const filteredVisits = visits.filter(visit => {
    const query = searchTerm.toLowerCase();
    const clientMatch = visit.clientName.toLowerCase().includes(query);
    const purposeMatch = visit.purpose.toLowerCase().includes(query);
    const empMatch = visit.assignedTo?.name?.toLowerCase().includes(query);
    const statusMatch = visit.status.toLowerCase().includes(query);
    return clientMatch || purposeMatch || empMatch || statusMatch;
  });

  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedVisits = itemsPerPage === -1
    ? filteredVisits
    : filteredVisits.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedVisits.length > 0 && paginatedVisits.every(v => selectedVisits.includes(v._id));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>On-Site Audit Tracker</h2>
        <p className="text-muted">
          {isManager
            ? 'Schedule on-site client audits with target coordinates and monitor security workforce locations.'
            : 'Start on-site audits, track target ranges, and submit geofenced audit verification proofs.'}
        </p>
      </div>

      {(isManager || isEmployee) && selectedVisits.length > 0 && (
        <div className="card" style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary-color)',
          marginBottom: 'var(--spacing-md)',
          padding: '12px 16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedVisits.length}</strong> audit{selectedVisits.length > 1 ? 's' : ''}.
              {allPageSelected && filteredVisits.length > paginatedVisits.length && !isGlobalSelected && (
                <span style={{ marginLeft: '12px' }}>
                  All {paginatedVisits.length} records on this page are selected.{' '}
                  <button 
                    onClick={() => {
                      setSelectedVisits(filteredVisits.map(v => v._id));
                      setIsGlobalSelected(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Select all {filteredVisits.length} records matching search
                  </button>
                </span>
              )}
              {isGlobalSelected && (
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  All {filteredVisits.length} matching records are selected.{' '}
                  <button 
                    onClick={handleClearSelection}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Clear selection
                  </button>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button className="btn btn-outline" onClick={handleClearSelection} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Clear Selection
              </button>
              <button className="btn btn-danger" onClick={handleBulkDeleteClick} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-dashboard">
        
        {/* Left Column: Visits List */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <h3 style={{ margin: 0 }}>On-Site Audits Schedule</h3>
              {(isManager || isEmployee) && paginatedVisits.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={allPageSelected}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  Select Page Audits
                </label>
              )}
            </div>

            <div style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
              <input 
                type="text" 
                placeholder="Search audits by client name, purpose, or technician..." 
                className="form-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  handleClearSelection();
                }}
                style={{ paddingRight: searchTerm ? '32px' : '12px' }}
              />
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                    handleClearSelection();
                  }}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    fontSize: '1.2rem', padding: '4px'
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-muted">Loading on-site audits...</p>
            ) : paginatedVisits.length === 0 ? (
              <p className="text-muted" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                No audits logged in the system matching query.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {paginatedVisits.map((visit, index) => (
                  <div key={visit._id} style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: selectedVisits.includes(visit._id) ? 'var(--primary-light)' : (visit.status === 'submitted' ? 'var(--bg-color)' : 'white'),
                    transition: 'background-color 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                      {(isManager || isEmployee) && (
                        <input 
                          type="checkbox" 
                          checked={selectedVisits.includes(visit._id)}
                          onChange={(e) => handleSelectVisit(e, visit._id, index)}
                          style={{ cursor: 'pointer', marginTop: '6px', transform: 'scale(1.1)' }}
                        />
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{visit.clientName}</h4>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{visit.purpose}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={`badge badge-${visit.status}`}>
                              {visit.status}
                            </span>
                            {(isManager || isEmployee) && (
                              <button 
                                className="btn btn-outline btn-sm" 
                                style={{ padding: '4px', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => handleDeleteClick(visit)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ margin: 'var(--spacing-md) 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }} className="text-muted">
                            <span><b>Coordinates: </b>{visit.targetLocation.lat}, {visit.targetLocation.lng}</span>
                            <span><b>Deadline: </b>{new Date(visit.deadline).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Interactive map display when active and started by Employee */}
                          {isEmployee && visit.status === 'started' && (
                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '4px' }}>
                                Target Geofence (Teal Circle = 100m Range)
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
                            <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)', fontSize: '0.8rem' }}>Saved Progress Logs ({visit.progressHistory.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {visit.progressHistory.map((progress, idx) => (
                                <div key={idx} style={{ 
                                  borderLeft: '2px solid var(--primary-color)', paddingLeft: '6px', fontSize: '0.8rem',
                                  display: 'flex', gap: '10px', alignItems: 'flex-start'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{new Date(progress.timestamp).toLocaleDateString()}: </span>
                                    <span>{progress.notes || 'Progress update logged.'}</span>
                                  </div>
                                  {progress.photoPath && (
                                    <img 
                                      src={progress.photoPath} alt="Progress log" 
                                      style={{ 
                                        width: '70px', height: '50px', objectFit: 'cover', borderRadius: '4px',
                                        border: '1px solid var(--border-color)', cursor: 'pointer' 
                                      }}
                                      onClick={() => window.open(progress.photoPath, '_blank')}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Completed Evidence block */}
                        {visit.status === 'submitted' && visit.evidence && (
                          <div style={{ 
                            marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', 
                            backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', 
                            borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' 
                          }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--success-color)', marginBottom: 'var(--spacing-xs)', fontSize: '0.8rem' }}>
                              ✓ Audit Completion Evidence
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                {visit.evidence.notes && <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}><b>Notes:</b> {visit.evidence.notes}</p>}
                                {visit.verificationCode && (
                                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                    <b>Client Code:</b> <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontWeight: 700 }}>{visit.verificationCode}</span>
                                  </p>
                                )}
                              </div>
                              {visit.evidence.photoPath && (
                                <img 
                                  src={visit.evidence.photoPath} alt="Final submission" 
                                  style={{ 
                                    width: '90px', height: '65px', objectFit: 'cover', borderRadius: '4px',
                                    border: '1px solid var(--border-color)', cursor: 'pointer' 
                                  }}
                                  onClick={() => window.open(visit.evidence.photoPath, '_blank')}
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Employee Actions */}
                        {isEmployee && (
                          <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
                            {visit.status === 'pending' && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleStartVisit(visit._id)}>
                                Start Audit Visit
                              </button>
                            )}
                            {visit.status === 'started' && (
                              <button className="btn btn-secondary btn-sm" onClick={() => openSubmitModal(visit)}>
                                Submit Audit Evidence
                              </button>
                            )}
                            {visit.status === 'submitted' && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                <span>✓ Submitted</span>
                                {visit.verificationCode && (
                                  <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontWeight: 700 }}>
                                    {visit.verificationCode}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {filteredVisits.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 'var(--spacing-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                      handleClearSelection();
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10 audits</option>
                    <option value={25}>25 audits</option>
                    <option value={50}>50 audits</option>
                    <option value={-1}>All audits</option>
                  </select>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredVisits.length)} of {filteredVisits.length}
                  </span>
                </div>

                {itemsPerPage !== -1 && totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', minWidth: 'auto' }}
                    >
                      ◀
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx + 1}
                        className={currentPage === idx + 1 ? "btn btn-primary" : "btn btn-outline"}
                        onClick={() => setCurrentPage(idx + 1)}
                        style={{
                          padding: '6px 12px', minWidth: '36px', height: '34px', justifyContent: 'center',
                          backgroundColor: currentPage === idx + 1 ? 'var(--primary-color)' : 'transparent',
                          color: currentPage === idx + 1 ? '#fff' : 'var(--text-main)',
                          borderColor: currentPage === idx + 1 ? 'var(--primary-color)' : 'var(--border-color)'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', minWidth: 'auto' }}
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manager Form */}
        <div>
          {isManager ? (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Schedule Field Audit</h3>
              
              {formError && <div className="alert alert-danger">{formError}</div>}
              {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

              <form onSubmit={handleCreateVisit}>
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Acme Corp Headquarters"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Purpose / Details</label>
                  <textarea 
                    className="form-input" 
                    rows="2"
                    placeholder="Describe audit objectives..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Auditor / Technician</label>
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

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Latitude</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 12.9716"
                      value={targetLat}
                      onChange={(e) => setTargetLat(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Longitude</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 77.5946"
                      value={targetLng}
                      onChange={(e) => setTargetLng(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Client Phone for Verification Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. +919876543210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
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

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  style={{ marginTop: 'var(--spacing-sm)' }}
                  disabled={submittingVisit}
                >
                  {submittingVisit ? 'Scheduling...' : 'Schedule Visit'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card" style={{ backgroundColor: 'var(--bg-color)' }}>
              <h3>Audit Workflow Instructions</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 'var(--spacing-xs)' }}>
                Field audits are verified using location and token validation:
              </p>
              <ol style={{ paddingLeft: 'var(--spacing-md)', fontSize: '0.85rem', marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }} className="text-muted">
                <li>Upon arrival, click <b>Start Audit Visit</b> (saves start time & GPS coordinate).</li>
                <li>Request verification code from the customer. The customer will receive it on WhatsApp.</li>
                <li>Input the code, snap a live proof photo, and submit. The system validates that you are within 100 meters of the client coordinate.</li>
              </ol>
            </div>
          )}
        </div>

      </div>

      {/* Employee Submission Modal overlay */}
      {activeVisit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 'var(--spacing-md)'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-xs)' }}>
              <h3 style={{ margin: 0 }}>On-Site Audit Submission</h3>
              <button 
                onClick={handleCloseAttempt} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            {modalError && <div className="alert alert-danger">{modalError}</div>}

            {/* Step 1: GPS Check */}
            {activeVisit.status === 'started' && modalStep === 1 && (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  We must verify that your current GPS location is within 100 meters of the scheduled client site.
                </p>

                {gpsLoading ? (
                  <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>Acquiring satellite lock...</p>
                ) : (
                  <div>
                    {gpsCheckPassed ? (
                      <div className="alert alert-success">
                        <b>Geofence Match!</b> You are within range ({gpsDistance}m).
                      </div>
                    ) : (
                      <div className="alert alert-danger">
                        <b>Geofence Match Failed.</b> You are {gpsDistance || 'unknown'}m away from target.
                      </div>
                    )}

                    {gpsCheckError && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>{gpsCheckError}</div>}

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn btn-outline" onClick={() => performGpsCheck(activeVisit)}>
                        Retry GPS Match
                      </button>
                      <button className="btn btn-primary" onClick={proceedToGetCode} disabled={!gpsCheckPassed}>
                        Proceed to Code
                      </button>
                    </div>

                    {!gpsCheckPassed && (
                      <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={handleSetCurrentAsTarget}
                          style={{ borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)', fontSize: '0.85rem' }}
                        >
                          Testing Bypass: Set Current GPS as Target
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Show Code */}
            {activeVisit.status === 'started' && modalStep === 2 && (
              <div>
                {codeLoading ? (
                  <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>Generating Secure Code...</p>
                ) : (
                  <div>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Please request the code sent to the client's WhatsApp and input it here:
                    </p>

                    <div className="verification-code-container" style={{ marginBottom: 'var(--spacing-md)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CLIENT VERIFICATION CODE</div>
                      <div className="verification-code-text">{verificationCode}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
                      <button className="btn btn-outline" onClick={() => setModalStep(1)}>
                        Back to GPS
                      </button>
                      <button className="btn btn-primary" onClick={() => setModalStep(3)}>
                        Proceed to Photo Proof
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Photo capture */}
            {activeVisit.status === 'started' && modalStep === 3 && (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Attach a photo of the client site to verify physical presence.
                </p>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--spacing-md)' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '10px', border: 'none', background: 'none',
                      borderBottom: proofType === 'gallery' ? '2px solid var(--primary-color)' : 'none',
                      color: proofType === 'gallery' ? 'var(--primary-color)' : 'var(--text-muted)',
                      fontWeight: proofType === 'gallery' ? 600 : 400, cursor: 'pointer'
                    }}
                    onClick={() => { setProofType('gallery'); setCapturedPhoto(null); }}
                  >
                    Upload from Gallery
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '10px', border: 'none', background: 'none',
                      borderBottom: proofType === 'camera' ? '2px solid var(--primary-color)' : 'none',
                      color: proofType === 'camera' ? 'var(--primary-color)' : 'var(--text-muted)',
                      fontWeight: proofType === 'camera' ? 600 : 400, cursor: 'pointer'
                    }}
                    onClick={() => { setProofType('camera'); setCapturedPhoto(null); }}
                  >
                    Take Live Photo
                  </button>
                </div>

                {proofType === 'gallery' ? (
                  <div>
                    {capturedPhoto ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={capturedPhoto} alt="Gallery upload preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }} />
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <button type="button" className="btn btn-outline" onClick={() => setCapturedPhoto(null)}>
                            🔄 Clear / Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="file-upload-zone">
                        <span style={{ fontWeight: 600 }}>Click to select/upload image</span>
                        <input type="file" accept="image/*" className="file-upload-input" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                ) : (
                  <CameraCapture 
                    onCapture={(photoData) => { setCapturedPhoto(photoData); setModalError(''); }}
                    onClear={() => setCapturedPhoto(null)}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
                  <button className="btn btn-outline" onClick={() => setModalStep(2)}>
                    Back
                  </button>
                  <button className="btn btn-primary" onClick={() => setModalStep(4)} disabled={!capturedPhoto}>
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
                    marginBottom: 'var(--spacing-md)', maxHeight: '180px', overflowY: 'auto', 
                    padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-color)', 
                    borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      Previous Days' Submissions ({activeVisit.progressHistory.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeVisit.progressHistory.map((progress, idx) => (
                        <div key={idx} style={{ 
                          borderLeft: '2px solid var(--primary-color)', paddingLeft: '8px', 
                          display: 'flex', gap: '10px', alignItems: 'flex-start'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>
                              <span>Update #{idx + 1}</span>
                              <span>{new Date(progress.timestamp).toLocaleString()}</span>
                            </div>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}>{progress.notes || 'Progress update logged.'}</div>
                          </div>
                          {progress.photoPath && (
                            <img 
                              src={progress.photoPath} alt="Progress log" 
                              style={{ 
                                width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px',
                                border: '1px solid var(--border-color)', cursor: 'pointer' 
                              }}
                              onClick={() => window.open(progress.photoPath, '_blank')}
                            />
                          )}
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
                  backgroundColor: 'var(--bg-color)', padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', 
                  fontSize: '0.85rem', marginBottom: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '4px'
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

      {/* Discard progress warning modal */}
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
              Are you sure you want to discard your field audit completion progress? Any attached photo or verification details will be lost.
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowDiscardConfirm(false)}>
                Go Back
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={() => {
                  closeSubmitModal();
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
                Confirm Deletion
              </h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: 'var(--spacing-lg)' }}>
              {deleteMode === 'single' ? (
                <>Are you sure you want to delete the audit visit for <strong style={{ color: 'var(--text-main)' }}>{visitToDelete?.clientName}</strong>? This will permanently remove it from the tracker.</>
              ) : (
                <>Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{selectedVisits.length}</strong> selected audits? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setVisitToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(visitToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setVisitToDelete(null);
                }}
                style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default FieldVisits;
