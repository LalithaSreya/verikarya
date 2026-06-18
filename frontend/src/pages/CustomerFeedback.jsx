import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

export const CustomerFeedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selection & Actions State
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [feedbackToDelete, setFeedbackToDelete] = useState(null);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/feedback');
      if (res.data && res.data.success) {
        setFeedbackList(res.data.data);
      }
      setSelectedFeedbacks([]);
      setIsGlobalSelected(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch customer reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  // Selection handlers
  const handleClearSelection = () => {
    setSelectedFeedbacks([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedFeedback.map(f => f._id);
      setSelectedFeedbacks(Array.from(new Set([...selectedFeedbacks, ...pageIds])));
    } else {
      const pageIds = paginatedFeedback.map(f => f._id);
      setSelectedFeedbacks(selectedFeedbacks.filter(id => !pageIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectFeedback = (e, id, index) => {
    const isChecked = e.target.checked;
    
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedFeedback.slice(start, end + 1).map(f => f._id);
      
      if (isChecked) {
        setSelectedFeedbacks(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedFeedbacks(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedFeedbacks(prev => [...prev, id]);
      } else {
        setSelectedFeedbacks(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete Handlers
  const handleDeleteClick = (feedback) => {
    setFeedbackToDelete(feedback);
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
      const res = await api.delete(`/feedback/${id}`);
      if (res.data.success) {
        setSuccess('Customer review deleted successfully');
        handleClearSelection();
        fetchFeedback();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete customer review');
    }
  };

  const executeBulkDelete = async () => {
    try {
      setError('');
      setSuccess('');
      const res = await api.delete('/feedback', { data: { feedbackIds: selectedFeedbacks } });
      if (res.data.success) {
        setSuccess(res.data.message || 'Selected customer reviews deleted successfully');
        handleClearSelection();
        fetchFeedback();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete selected customer reviews');
    }
  };

  // Calculations
  const totalReviews = feedbackList.length;
  const avgRating = totalReviews > 0
    ? parseFloat((feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1))
    : 5.0;

  // Breakdown by stars (1 to 5)
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbackList.forEach(f => {
    if (starCounts[f.rating] !== undefined) {
      starCounts[f.rating]++;
    }
  });

  // Average rating per technician list
  const technicianAverages = {};
  feedbackList.forEach(f => {
    if (!f.technician) return;
    const techId = f.technician._id;
    if (!technicianAverages[techId]) {
      technicianAverages[techId] = {
        name: f.technician.name,
        email: f.technician.email,
        sum: 0,
        count: 0
      };
    }
    technicianAverages[techId].sum += f.rating;
    technicianAverages[techId].count++;
  });

  const sortedTechnicians = Object.values(technicianAverages)
    .map(tech => ({
      ...tech,
      average: parseFloat((tech.sum / tech.count).toFixed(1))
    }))
    .sort((a, b) => b.average - a.average);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#F59E0B' : '#E2E8F0', fontSize: '1.2rem', marginRight: '2px' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  // Search Logic
  const filteredFeedback = feedbackList.filter(item => {
    const query = searchTerm.toLowerCase();
    const clientName = item.clientName || 'Anonymous Client';
    const clientPhone = item.clientPhone || '';
    const techName = item.technician?.name || 'Unassigned';
    const serviceType = item.refModel || '';
    const comments = item.comments || '';
    
    return (
      clientName.toLowerCase().includes(query) ||
      clientPhone.toLowerCase().includes(query) ||
      techName.toLowerCase().includes(query) ||
      serviceType.toLowerCase().includes(query) ||
      comments.toLowerCase().includes(query)
    );
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedFeedback = itemsPerPage === -1
    ? filteredFeedback
    : filteredFeedback.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedFeedback.length > 0 && paginatedFeedback.every(f => selectedFeedbacks.includes(f._id));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer Feedback & Reviews</h2>
        <p className="text-muted">Analyze real-time service satisfaction reviews left by AMC and task clients.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Global Selection Banner */}
      {selectedFeedbacks.length > 0 && (
        <div className="card" style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary-color)',
          marginBottom: 'var(--spacing-md)',
          padding: '12px 16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedFeedbacks.length}</strong> review{selectedFeedbacks.length > 1 ? 's' : ''}.
              {allPageSelected && filteredFeedback.length > paginatedFeedback.length && !isGlobalSelected && (
                <span style={{ marginLeft: '12px' }}>
                  All {paginatedFeedback.length} reviews on this page are selected.{' '}
                  <button 
                    onClick={() => {
                      setSelectedFeedbacks(filteredFeedback.map(f => f._id));
                      setIsGlobalSelected(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Select all {filteredFeedback.length} reviews matching search
                  </button>
                </span>
              )}
              {isGlobalSelected && (
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  All {filteredFeedback.length} matching reviews are selected.{' '}
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

      {/* Analytics Summary */}
      <div className="grid-dashboard" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {/* Rating Breakdown card */}
        <div className="card">
          <h3 className="card-title">Satisfaction Distribution</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'center', marginTop: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1 }}>{avgRating}</div>
              <div style={{ margin: '6px 0' }}>{renderStars(Math.round(avgRating))}</div>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Based on {totalReviews} reviews</span>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              {[5, 4, 3, 2, 1].map(stars => {
                const count = starCounts[stars];
                const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '45px' }}>{stars} Star</span>
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        backgroundColor: stars >= 4 ? 'var(--success-color)' : stars === 3 ? 'var(--warning-color)' : 'var(--danger-color)',
                        height: '100%'
                      }}></div>
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.8rem', width: '30px', textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Technician Ratings Leaderboard */}
        <div className="card">
          <h3 className="card-title">Technician Performance</h3>
          <p className="card-subtitle">Ranked by client feedback average ratings.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedTechnicians.length === 0 ? (
              <p className="text-center text-muted" style={{ fontSize: '0.9rem', padding: '10px' }}>
                No technician reviews recorded.
              </p>
            ) : (
              sortedTechnicians.slice(0, 5).map((tech, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tech.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{tech.count} reviews</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>★</span>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{tech.average}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search reviews by client name, client phone, technician, service type, or comments..." 
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

      {/* Review Logs Table */}
      {loading ? (
        <div className="card text-center" style={{ padding: 'var(--spacing-xl)' }}>Loading customer reviews...</div>
      ) : (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--spacing-md)' }}>Review History Logs</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', paddingLeft: 'var(--spacing-md)' }}>
                    <input 
                      type="checkbox" 
                      checked={paginatedFeedback.length > 0 && paginatedFeedback.every(f => selectedFeedbacks.includes(f._id))} 
                      onChange={handleSelectAll} 
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                    />
                  </th>
                  <th>Client</th>
                  <th>Technician</th>
                  <th>Service Type</th>
                  <th>Rating</th>
                  <th style={{ width: '35%' }}>Comments</th>
                  <th>Submitted Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFeedback.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No feedback logs available matching search query.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedback.map((item, index) => (
                    <tr key={item._id} style={selectedFeedbacks.includes(item._id) ? { backgroundColor: 'var(--primary-light)' } : {}}>
                      <td style={{ paddingLeft: 'var(--spacing-md)' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedFeedbacks.includes(item._id)} 
                          onChange={(e) => handleSelectFeedback(e, item._id, index)} 
                          style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.clientName || 'Anonymous Client'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.clientPhone}</div>
                      </td>
                      <td>
                        {item.technician ? (
                          <>
                            <div style={{ fontWeight: 500 }}>{item.technician.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.technician.email}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${item.refModel === 'Task' ? 'badge-in-progress' : 'badge-started'}`}>
                          {item.refModel}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 700 }}>{item.rating}</span>
                          <span style={{ color: '#F59E0B' }}>★</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9rem', fontStyle: 'italic', color: item.comments ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {item.comments ? `"${item.comments}"` : 'No comments provided'}
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => handleDeleteClick(item)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredFeedback.length > 0 && (
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
                  <option value={10}>10 reviews</option>
                  <option value={25}>25 reviews</option>
                  <option value={50}>50 reviews</option>
                  <option value={-1}>All reviews</option>
                </select>
                <span style={{ color: 'var(--text-muted)' }}>
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredFeedback.length)} of {filteredFeedback.length} reviews
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
                <>Are you sure you want to delete the feedback log from <strong style={{ color: 'var(--text-main)' }}>{feedbackToDelete?.clientName || 'Anonymous'}</strong>?</>
              ) : (
                <>Are you sure you want to delete the <strong style={{ color: 'var(--text-main)' }}>{selectedFeedbacks.length}</strong> selected customer reviews? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setFeedbackToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(feedbackToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setFeedbackToDelete(null);
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

export default CustomerFeedback;
