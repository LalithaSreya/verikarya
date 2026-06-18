import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

export const AttendanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal display state for reviewing attendance photo proofs
  const [activePhoto, setActivePhoto] = useState(null); // URL path
  const [activeMeta, setActiveMeta] = useState(null); // { type, name, code, date }

  // Selection & Actions State
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/attendance/history');
      if (res.data && res.data.success) {
        setHistory(res.data.data);
        setSelectedRecords([]);
      }
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

  const cleanUrl = (url, removeSuffix = '') => {
    if (!url) return url;
    let cleaned = url.replace(/^(https?:\/\/)+/, (match) => match.includes('https') ? 'https://' : 'http://');
    if (removeSuffix && cleaned.endsWith(removeSuffix)) {
      cleaned = cleaned.slice(0, -removeSuffix.length);
    }
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  };

  let backendUrl = cleanUrl(import.meta.env.VITE_BACKEND_URL, '/api');

  if (!backendUrl || backendUrl.startsWith('http://localhost') || backendUrl.startsWith('http://127.0.0.1')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      backendUrl = 'https://verikarya.onrender.com';
    } else if (!backendUrl) {
      backendUrl = 'http://localhost:5000';
    }
  }

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

  // Selection handlers
  const handleClearSelection = () => {
    setSelectedRecords([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageRecordIds = paginatedHistory.map(r => r._id);
      setSelectedRecords(Array.from(new Set([...selectedRecords, ...pageRecordIds])));
    } else {
      const pageRecordIds = paginatedHistory.map(r => r._id);
      setSelectedRecords(selectedRecords.filter(id => !pageRecordIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectRecord = (e, id, index) => {
    const isChecked = e.target.checked;
    
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedHistory.slice(start, end + 1).map(r => r._id);
      
      if (isChecked) {
        setSelectedRecords(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedRecords(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedRecords(prev => [...prev, id]);
      } else {
        setSelectedRecords(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete Handlers
  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setDeleteMode('single');
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteClick = () => {
    setDeleteMode('bulk');
    setShowDeleteConfirm(true);
  };

  const executeSingleDelete = async (id) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.delete(`/attendance/${id}`);
      if (res.data.success) {
        setSuccess('Attendance record deleted successfully');
        handleClearSelection();
        fetchAttendanceHistory();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete attendance record');
    }
  };

  const executeBulkDelete = async () => {
    try {
      setError('');
      setSuccess('');
      const res = await api.delete('/attendance', { data: { attendanceIds: selectedRecords } });
      if (res.data.success) {
        setSuccess(res.data.message || 'Attendance records deleted successfully');
        handleClearSelection();
        fetchAttendanceHistory();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete selected attendance records');
    }
  };

  // Search Logic
  const filteredHistory = history.filter(record => {
    const query = searchTerm.toLowerCase();
    const empName = record.user?.name || 'Deleted User';
    const empEmail = record.user?.email || '';
    const dateStr = formatDate(record.date);
    return (
      empName.toLowerCase().includes(query) ||
      empEmail.toLowerCase().includes(query) ||
      dateStr.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedHistory = itemsPerPage === -1
    ? filteredHistory
    : filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedHistory.length > 0 && paginatedHistory.every(r => selectedRecords.includes(r._id));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>📅 Daily Attendance Logs</h2>
        <p className="text-muted">Review team daily check-in timestamps, verified photos, and matched codes.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {selectedRecords.length > 0 && (
        <div className="card" style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary-color)',
          marginBottom: 'var(--spacing-md)',
          padding: '12px 16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedRecords.length}</strong> record{selectedRecords.length > 1 ? 's' : ''}.
              {allPageSelected && filteredHistory.length > paginatedHistory.length && !isGlobalSelected && (
                <span style={{ marginLeft: '12px' }}>
                  All {paginatedHistory.length} records on this page are selected.{' '}
                  <button 
                    onClick={() => {
                      setSelectedRecords(filteredHistory.map(r => r._id));
                      setIsGlobalSelected(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Select all {filteredHistory.length} records matching search
                  </button>
                </span>
              )}
              {isGlobalSelected && (
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  All {filteredHistory.length} matching records are selected.{' '}
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

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search attendance logs by employee name or date..." 
            className="form-input"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              handleClearSelection();
            }}
            style={{ flex: 1, paddingRight: searchTerm ? '32px' : '12px' }}
          />
          {searchTerm && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
                handleClearSelection();
              }}
              style={{
                position: 'absolute', right: '12px', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Verified Attendance Registry</h3>

        {loading ? (
          <p className="text-muted">Loading attendance logs...</p>
        ) : paginatedHistory.length === 0 ? (
          <p className="text-muted" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            No attendance entries match query.
          </p>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', paddingLeft: 'var(--spacing-md)' }}>
                      <input 
                        type="checkbox" 
                        checked={paginatedHistory.length > 0 && paginatedHistory.every(r => selectedRecords.includes(r._id))} 
                        onChange={handleSelectAll} 
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                      />
                    </th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check-in Details</th>
                    <th>Check-out Details</th>
                    <th>Work Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((record, index) => {
                    const empName = record.user?.name || 'Deleted User';
                    const dateStr = formatDate(record.date);
                    return (
                      <tr key={record._id} style={selectedRecords.includes(record._id) ? { backgroundColor: 'var(--primary-light)' } : {}}>
                        <td style={{ paddingLeft: 'var(--spacing-md)' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedRecords.includes(record._id)} 
                            onChange={(e) => handleSelectRecord(e, record._id, index)} 
                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                          />
                        </td>
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

                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => handleDeleteClick(record)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredHistory.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md) 0',
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
                    <option value={10}>10 records</option>
                    <option value={25}>25 records</option>
                    <option value={50}>50 records</option>
                    <option value={-1}>All records</option>
                  </select>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredHistory.length)} of {filteredHistory.length} records
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
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                        className={currentPage === index + 1 ? "btn btn-primary" : "btn btn-outline"}
                        style={{
                          padding: '6px 12px', minWidth: '36px', height: '34px', justifyContent: 'center',
                          backgroundColor: currentPage === index + 1 ? 'var(--primary-color)' : 'transparent',
                          color: currentPage === index + 1 ? '#fff' : 'var(--text-main)',
                          borderColor: currentPage === index + 1 ? 'var(--primary-color)' : 'var(--border-color)'
                        }}
                      >
                        {index + 1}
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
          </>
        )}
      </div>

      {/* Attendance Photo Audit Modal */}
      {activePhoto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
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
              backgroundColor: 'var(--bg-color)', padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', 
              fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '4px'
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
                <>Are you sure you want to delete the attendance log for <strong style={{ color: 'var(--text-main)' }}>{recordToDelete?.user?.name}</strong> on <strong style={{ color: 'var(--text-main)' }}>{recordToDelete?.date}</strong>?</>
              ) : (
                <>Are you sure you want to delete the <strong style={{ color: 'var(--text-main)' }}>{selectedRecords.length}</strong> selected attendance log records? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRecordToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(recordToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setRecordToDelete(null);
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

export default AttendanceHistory;
