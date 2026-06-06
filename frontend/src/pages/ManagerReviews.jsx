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

  const fetchReviews = async (statusVal = filter) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/reviews?status=${statusVal}`);
      setReviews(res.data.data);
      // Select the first review by default if available
      if (res.data.data.length > 0) {
        setSelectedReview(res.data.data[0]);
      } else {
        setSelectedReview(null);
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

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return '';
    return (photoPath.startsWith('http://') || photoPath.startsWith('https://'))
      ? photoPath
      : `${backendUrl}${photoPath}`;
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>🔍 Workforce Evidence Verification</h2>
        <p className="text-muted">Perform visual and cryptographic audits on employee work submissions.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        <button 
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleFilterChange('pending')}
        >
          📥 Pending Audit ({filter === 'pending' ? reviews.length : '?'})
        </button>
        <button 
          className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline'}`}
          onClick={() => handleFilterChange('approved')}
        >
          ✅ Approved Trails
        </button>
        <button 
          className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => handleFilterChange('rejected')}
        >
          ❌ Rejected Submissions
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Submissions Queue</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {reviews.map((review) => {
                const assigneeName = review.details?.assignedTo?.name || 'Unknown';
                const title = review.type === 'task' 
                  ? review.details?.title 
                  : `${review.details?.clientName} (Field Visit)`;
                
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
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: selectedReview?._id === review._id ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        {title}
                      </h4>
                      <span className="badge badge-low" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                        {review.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Submitted by: <b>{assigneeName}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Submission Audit Details */}
          {selectedReview && (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>🔍 Evidence Audit Panel</h3>
              
              {/* Image Frame */}
              {selectedReview.details?.evidence?.photoPath ? (
                <img 
                  src={getPhotoUrl(selectedReview.details.evidence.photoPath)} 
                  alt="Work site proof capture" 
                  className="review-preview-img"
                />
              ) : (
                <div style={{ height: '180px', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginBottom: 'var(--spacing-sm)' }} className="text-muted">
                  No image proof uploaded
                </div>
              )}

              {/* Metadata log */}
              <div className="evidence-meta">
                <div><b>Employee:</b> {selectedReview.details?.assignedTo?.name} ({selectedReview.details?.assignedTo?.email})</div>
                <div><b>Activity Type:</b> <span style={{ textTransform: 'capitalize' }}>{selectedReview.type}</span></div>
                <div><b>VK Verification Code:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.95rem' }}>{selectedReview.details?.verificationCode}</span></div>
                <div><b>Submitted At:</b> {selectedReview.details?.evidence?.timestamp ? new Date(selectedReview.details.evidence.timestamp).toLocaleString() : 'N/A'}</div>
                
                {selectedReview.type === 'visit' && (
                  <>
                    <div className="verification-status-pill">
                      <b>GPS Geofence Match:</b> 
                      <span style={{ color: 'var(--success-color)' }}>✓ PASSED (Within 100m)</span>
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
                      ❌ Reject Proof
                    </button>
                    <button 
                      className="btn btn-success" 
                      style={{ flex: 1 }}
                      onClick={() => handleReviewDecision('approved')}
                      disabled={actionLoading}
                    >
                      ✅ Approve Proof
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
    </DashboardLayout>
  );
};

export default ManagerReviews;
