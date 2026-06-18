import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

export const ManagerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null); // Review currently open in details panel
  
  // Decision Form State
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selection & Selection Actions State
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [reviewToDelete, setReviewToDelete] = useState(null);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

  const fetchReviews = async (statusVal = filter) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/reviews?status=${statusVal}`);
      if (res.data && res.data.success) {
        setReviews(res.data.data);
        setSelectedReviews([]);
        
        // Select the first review by default if available
        if (res.data.data.length > 0) {
          setSelectedReview(res.data.data[0]);
        } else {
          setSelectedReview(null);
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to fetch reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const handleFilterChange = (status) => {
    setFilter(status);
    setComments('');
    setSuccess('');
    setError('');
    handleClearSelection();
  };

  const handleReviewDecision = async (decision) => { // decision: 'approved' | 'rejected'
    if (!selectedReview) return;
    
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/reviews/${selectedReview._id}`, {
        status: decision,
        comments
      });

      if (res.data.success) {
        setSuccess(`Submission successfully ${decision}!`);
        setComments('');
        // Reload list
        fetchReviews(filter);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // Selection Logic
  const handleClearSelection = () => {
    setSelectedReviews([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageReviewIds = paginatedReviews.map(r => r._id);
      setSelectedReviews(Array.from(new Set([...selectedReviews, ...pageReviewIds])));
    } else {
      const pageReviewIds = paginatedReviews.map(r => r._id);
      setSelectedReviews(selectedReviews.filter(id => !pageReviewIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectReview = (e, id, index) => {
    e.stopPropagation(); // Avoid selecting review details panel
    const isChecked = e.target.checked;
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedReviews.slice(start, end + 1).map(r => r._id);
      if (isChecked) {
        setSelectedReviews(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedReviews(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedReviews(prev => [...prev, id]);
      } else {
        setSelectedReviews(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete Actions
  const handleDeleteClick = (e, review) => {
    e.stopPropagation();
    setReviewToDelete(review);
    setDeleteMode('single');
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteClick = () => {
    setDeleteMode('bulk');
    setShowDeleteConfirm(true);
  };

  const executeSingleDelete = async (id) => {
    try {
      const res = await api.delete(`/reviews/${id}`);
      if (res.data.success) {
        setSuccess('Review deleted successfully');
        handleClearSelection();
        fetchReviews(filter);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete review');
    }
  };

  const executeBulkDelete = async () => {
    try {
      const res = await api.delete('/reviews', { data: { reviewIds: selectedReviews } });
      if (res.data.success) {
        setSuccess(`${selectedReviews.length} reviews deleted successfully`);
        handleClearSelection();
        fetchReviews(filter);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete selected reviews');
    }
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

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return '';
    return (photoPath.startsWith('http://') || photoPath.startsWith('https://'))
      ? photoPath
      : `${backendUrl}${photoPath}`;
  };

  // Search Logic
  const filteredReviews = reviews.filter(review => {
    const query = searchTerm.toLowerCase();
    const title = review.type === 'task' 
      ? (review.details?.title || '') 
      : (review.details?.clientName || '');
    const assigneeName = review.details?.assignedTo?.name || '';
    const assigneeEmail = review.details?.assignedTo?.email || '';
    return (
      title.toLowerCase().includes(query) ||
      assigneeName.toLowerCase().includes(query) ||
      assigneeEmail.toLowerCase().includes(query) ||
      review.type.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedReviews = itemsPerPage === -1
    ? filteredReviews
    : filteredReviews.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedReviews.length > 0 && paginatedReviews.every(r => selectedReviews.includes(r._id));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Workforce Evidence Verification</h2>
        <p className="text-muted">Perform visual and cryptographic audits on employee work submissions.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        <button 
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleFilterChange('pending')}
        >
          Pending Audit ({filter === 'pending' ? reviews.length : '?'})
        </button>
        <button 
          className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline'}`}
          onClick={() => handleFilterChange('approved')}
        >
          Approved Trails
        </button>
        <button 
          className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => handleFilterChange('rejected')}
        >
          Rejected Submissions
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {selectedReviews.length > 0 && (
        <div className="card" style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary-color)',
          marginBottom: 'var(--spacing-md)',
          padding: '12px 16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedReviews.length}</strong> review{selectedReviews.length > 1 ? 's' : ''}.
              {allPageSelected && filteredReviews.length > paginatedReviews.length && !isGlobalSelected && (
                <span style={{ marginLeft: '12px' }}>
                  All {paginatedReviews.length} records on this page are selected.{' '}
                  <button 
                    onClick={() => {
                      setSelectedReviews(filteredReviews.map(r => r._id));
                      setIsGlobalSelected(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Select all {filteredReviews.length} records matching search
                  </button>
                </span>
              )}
              {isGlobalSelected && (
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  All {filteredReviews.length} matching records are selected.{' '}
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

      {loading ? (
        <p className="text-muted">Loading audit entries...</p>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
          <p className="text-muted">No evidence files found in this category.</p>
        </div>
      ) : (
        <div className="grid-dashboard">
          
          {/* Left Column: Submissions List */}
          <div className="card" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <h3 style={{ margin: 0 }}>Submissions Queue</h3>
              {paginatedReviews.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={allPageSelected}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  Select Page
                </label>
              )}
            </div>

            <div style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
              <input 
                type="text" 
                placeholder="Search queue by title, type, employee..." 
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {paginatedReviews.map((review, index) => {
                const assigneeName = review.details?.assignedTo?.name || 'Unknown';
                const title = review.type === 'task' 
                  ? (review.details?.title || 'Task')
                  : `${review.details?.clientName || 'Visit'} (Field Visit)`;
                
                return (
                  <div 
                    key={review._id}
                    onClick={() => {
                      setSelectedReview(review);
                      setComments('');
                      setSuccess('');
                      setError('');
                    }}
                    style={{ 
                      padding: 'var(--spacing-md)',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      backgroundColor: selectedReview?._id === review._id ? 'var(--primary-light)' : 'white',
                      borderColor: selectedReview?._id === review._id ? 'var(--primary-color)' : 'var(--border-color)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--spacing-sm)'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={selectedReviews.includes(review._id)}
                      onChange={(e) => handleSelectReview(e, review._id, index)}
                      style={{ cursor: 'pointer', marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: selectedReview?._id === review._id ? 'var(--primary-color)' : 'var(--text-main)' }}>
                          {title}
                        </h4>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="badge badge-low" style={{ fontSize: '0.7rem', textTransform: 'capitalize', padding: '2px 6px' }}>
                            {review.type}
                          </span>
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ padding: '2px', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => handleDeleteClick(e, review)}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Submitted by: <b>{assigneeName}</b>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredReviews.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 'var(--spacing-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: '0.85rem' }}>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                      handleClearSelection();
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10 items</option>
                    <option value={25}>25 items</option>
                    <option value={50}>50 items</option>
                    <option value={-1}>All items</option>
                  </select>
                </div>

                {itemsPerPage !== -1 && totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '0.85rem' }}
                    >
                      ◀
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '0.85rem' }}
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Selected Submission Audit Details */}
          {selectedReview && (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Evidence Audit Panel</h3>
              
              {/* Image Frame */}
              {selectedReview.details?.evidence?.photoPath ? (
                <img 
                  src={getPhotoUrl(selectedReview.details.evidence.photoPath)} 
                  alt="Work site proof capture" 
                  className="review-preview-img"
                  style={{
                    width: '100%', maxHeight: '250px', objectFit: 'contain', 
                    borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)', marginBottom: 'var(--spacing-md)'
                  }}
                />
              ) : (
                <div style={{ height: '180px', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginBottom: 'var(--spacing-sm)' }} className="text-muted">
                  No image proof uploaded
                </div>
              )}

              {/* Metadata log */}
              <div className="evidence-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                <div><b>Employee:</b> {selectedReview.details?.assignedTo?.name} ({selectedReview.details?.assignedTo?.email})</div>
                <div><b>Activity Type:</b> <span style={{ textTransform: 'capitalize' }}>{selectedReview.type}</span></div>
                <div><b>VK Verification Code:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.95rem' }}>{selectedReview.details?.verificationCode}</span></div>
                <div><b>Submitted At:</b> {selectedReview.details?.evidence?.timestamp ? new Date(selectedReview.details.evidence.timestamp).toLocaleString() : 'N/A'}</div>
                
                {selectedReview.type === 'visit' && (
                  <>
                    <div className="verification-status-pill" style={{ color: 'var(--success-color)', fontWeight: 600 }}>
                      <b>GPS Geofence Match:</b> ✓ PASSED (Within 100m)
                    </div>
                    <div><b>Submit Coordinates:</b> {selectedReview.details?.submitLocation?.lat}, {selectedReview.details?.submitLocation?.lng}</div>
                    <div><b>Calculated Range:</b> {selectedReview.details?.distanceToTarget} meters from target</div>
                  </>
                )}
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Employee Submission Notes:</h4>
                <div style={{ backgroundColor: 'var(--bg-color)', padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', borderLeft: '3px solid var(--border-color)' }}>
                  {selectedReview.details?.evidence?.notes || <i>No notes submitted.</i>}
                </div>
              </div>

              {/* Progress History Timeline */}
              {selectedReview.details?.progressHistory && selectedReview.details.progressHistory.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: 'var(--spacing-sm)' }}>
                    Multi-Day Progress Timeline ({selectedReview.details.progressHistory.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {selectedReview.details.progressHistory.map((progress, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: 'var(--spacing-sm)', 
                          backgroundColor: 'var(--bg-color)', 
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: '0.85rem',
                          borderLeft: '3px solid var(--primary-color)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600 }}>
                          <span>Update #{idx + 1}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(progress.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {progress.photoPath && (
                          <img 
                            src={getPhotoUrl(progress.photoPath)} 
                            alt={`Progress update #${idx+1}`} 
                            style={{ 
                              width: '100%', 
                              maxHeight: '120px', 
                              objectFit: 'contain', 
                              backgroundColor: '#f1f5f9',
                              borderRadius: '4px',
                              marginBottom: '6px'
                            }} 
                          />
                        )}
                        <p style={{ margin: 0, fontStyle: progress.notes ? 'normal' : 'italic' }}>
                          {progress.notes || 'No comments logged for this day.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Feedback Form */}
              {filter === 'pending' ? (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Audit Review Comments</label>
                    <textarea 
                      className="form-input" 
                      rows="2"
                      placeholder="Add review feedback, instructions, or rejection reasons..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button 
                      className="btn btn-danger" 
                      style={{ flex: 1 }}
                      onClick={() => handleReviewDecision('rejected')}
                      disabled={actionLoading}
                    >
                      Reject Proof
                    </button>
                    <button 
                      className="btn btn-success" 
                      style={{ flex: 1 }}
                      onClick={() => handleReviewDecision('approved')}
                      disabled={actionLoading}
                    >
                      Approve Proof
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)', fontSize: '0.9rem' }} className="text-muted">
                  <div><b>Review Decision:</b> <span className={`badge badge-${selectedReview.status}`}>{selectedReview.status}</span></div>
                  <div style={{ marginTop: 'var(--spacing-xs)' }}>
                    <b>Manager Audit Notes: </b>
                    {selectedReview.comments || <i>No comments logged.</i>}
                  </div>
                </div>
              )}

            </div>
          )}

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
                <>Are you sure you want to delete this review entry? This will remove the record from the database.</>
              ) : (
                <>Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{selectedReviews.length}</strong> selected review entries? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setReviewToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(reviewToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setReviewToDelete(null);
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

export default ManagerReviews;
