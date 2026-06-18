import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const AMCServices = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedAMCs, setSelectedAMCs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [currentSub, setCurrentSub] = useState(null);

  // Search, pagination & selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [amcToDelete, setAmcToDelete] = useState(null);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

  // New AMC form state
  const [newAMC, setNewAMC] = useState({
    clientName: '',
    clientPhone: '',
    plan: 'Basic',
    startDate: '',
    endDate: ''
  });

  // Preventive visit form state
  const [visitForm, setVisitForm] = useState({
    purpose: 'Preventive AMC Inspection',
    assignedTo: '',
    targetLocation: { lat: 12.9715987, lng: 77.5945627 },
    deadline: '',
    clientPhone: ''
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchEmployees();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions');
      if (res.data && res.data.success) {
        setSubscriptions(res.data.data);
        setSelectedAMCs([]);
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch AMC services');
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/auth/employees');
      if (res.data && res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load employees for dropdown', err);
    }
  };

  const handleCreateAMC = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      const res = await api.post('/subscriptions', newAMC);
      if (res.data.success) {
        setSuccessMsg('AMC registered successfully!');
        fetchSubscriptions();
        setShowAddModal(false);
        setNewAMC({
          clientName: '',
          clientPhone: '',
          plan: 'Basic',
          startDate: '',
          endDate: ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register AMC');
    }
  };

  const handleOpenVisitModal = (sub) => {
    setCurrentSub(sub);
    setVisitForm({
      purpose: `Preventive AMC Inspection - ${sub.plan} Plan`,
      assignedTo: '',
      targetLocation: { lat: 12.9715987, lng: 77.5945627 },
      deadline: '',
      clientPhone: sub.clientPhone
    });
    setShowVisitModal(true);
  };

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      
      const payload = {
        clientName: currentSub.clientName,
        purpose: visitForm.purpose,
        assignedTo: visitForm.assignedTo,
        targetLocation: visitForm.targetLocation,
        deadline: visitForm.deadline,
        clientPhone: visitForm.clientPhone
      };

      const res = await api.post('/visits', payload);
      if (res.data.success) {
        // Increment the preventive visits count on the AMC subscription
        await api.put(`/subscriptions/${currentSub._id}`, {
          preventiveVisitsCount: (currentSub.preventiveVisitsCount || 0) + 1
        });

        setSuccessMsg(`Preventive visit scheduled for ${currentSub.clientName}`);
        fetchSubscriptions();
        setShowVisitModal(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule preventive visit');
    }
  };

  // Selection handlers
  const handleClearSelection = () => {
    setSelectedAMCs([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageAmcIds = paginatedAMCs.map(sub => sub._id);
      const newSelected = Array.from(new Set([...selectedAMCs, ...pageAmcIds]));
      setSelectedAMCs(newSelected);
    } else {
      const pageAmcIds = paginatedAMCs.map(sub => sub._id);
      setSelectedAMCs(selectedAMCs.filter(id => !pageAmcIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectAMC = (e, id, index) => {
    const isChecked = e.target.checked;
    
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedAMCs.slice(start, end + 1).map(sub => sub._id);
      
      if (isChecked) {
        setSelectedAMCs(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedAMCs(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedAMCs(prev => [...prev, id]);
      } else {
        setSelectedAMCs(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete actions (Trigger Modal warning confirmation instead of native window.confirm)
  const handleDeleteClick = (sub) => {
    setAmcToDelete(sub);
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
      setSuccessMsg('');
      const res = await api.delete(`/subscriptions/${id}`);
      if (res.data.success) {
        setSuccessMsg('Subscription removed successfully');
        handleClearSelection();
        fetchSubscriptions();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subscription');
    }
  };

  const executeBulkDelete = async () => {
    try {
      setError('');
      setSuccessMsg('');
      const res = await api.delete('/subscriptions', { data: { subscriptionIds: selectedAMCs } });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Subscriptions deleted successfully');
        handleClearSelection();
        fetchSubscriptions();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel selected AMC subscriptions');
    }
  };

  // Filtering & Pagination
  const filteredAMCs = subscriptions.filter(sub => {
    const query = searchTerm.toLowerCase();
    return (
      sub.clientName.toLowerCase().includes(query) ||
      sub.clientPhone.toLowerCase().includes(query) ||
      sub.plan.toLowerCase().includes(query) ||
      sub.status.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredAMCs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedAMCs = itemsPerPage === -1
    ? filteredAMCs
    : filteredAMCs.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedAMCs.length > 0 && paginatedAMCs.every(sub => selectedAMCs.includes(sub._id));

  // Stats calculation
  const totalAMCs = subscriptions.length;
  const activeCount = subscriptions.filter(s => s.status === 'Active').length;
  const expiringCount = subscriptions.filter(s => {
    if (s.status !== 'Active') return false;
    const end = new Date(s.endDate);
    const diffTime = end - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const basicCount = subscriptions.filter(s => s.plan === 'Basic').length;
  const standardCount = subscriptions.filter(s => s.plan === 'Standard').length;
  const premiumCount = subscriptions.filter(s => s.plan === 'Premium').length;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Subscription-Based AMC Contracts</h1>
          <p className="text-muted">Manage annual maintenance services, plan tiers, and auto-renewals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Register New AMC
        </button>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats Cards */}
      <div className="grid-cols-1-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card metric-card">
          <div>
            <span className="card-subtitle">Active AMC Clients</span>
            <div className="metric-value">{activeCount}</div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Out of {totalAMCs} total contracts</span>
        </div>

        <div className="card metric-card" style={{ borderLeft: '4px solid var(--warning-color)' }}>
          <div>
            <span className="card-subtitle">Expiring (Next 30 Days)</span>
            <div className="metric-value" style={{ color: 'var(--warning-color)' }}>{expiringCount}</div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Require immediate renewal calls</span>
        </div>

        <div className="card metric-card" style={{ borderLeft: '4px solid var(--secondary-color)' }}>
          <div>
            <span className="card-subtitle">Plans Distribution</span>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: '6px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Basic</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{basicCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Standard</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{standardCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Premium</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{premiumCount}</div>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Standard/Premium support direct visit triggers</span>
        </div>
      </div>

      {/* Expiring warnings panel */}
      {expiringCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <strong>Renewal Warning:</strong> There are {expiringCount} AMC subscription contracts expiring in the next 30 days. Please trigger proactive renewals.
        </div>
      )}

      {/* Search filtering card */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search AMC contracts by client name, plan or status..." 
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

      {loading ? (
        <div className="text-center" style={{ padding: 'var(--spacing-xl)' }}>Loading subscriptions...</div>
      ) : (
        <>
          {selectedAMCs.length > 0 && (
            <div className="card" style={{
              backgroundColor: 'var(--primary-light)',
              borderColor: 'var(--primary-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
              padding: '10px 16px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedAMCs.length}</strong> contract{selectedAMCs.length > 1 ? 's' : ''}.
                {allPageSelected && filteredAMCs.length > paginatedAMCs.length && !isGlobalSelected && (
                  <span style={{ marginLeft: '12px' }}>
                    All {paginatedAMCs.length} records on this page are selected.{' '}
                    <button 
                      onClick={() => {
                        setSelectedAMCs(filteredAMCs.map(sub => sub._id));
                        setIsGlobalSelected(true);
                      }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--primary-color)',
                        textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                      }}
                    >
                      Select all {filteredAMCs.length} records matching search
                    </button>
                  </span>
                )}
                {isGlobalSelected && (
                  <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                    All {filteredAMCs.length} matching records are selected.{' '}
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
                  Cancel Selected
                </button>
              </div>
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', paddingLeft: 'var(--spacing-md)' }}>
                    <input 
                      type="checkbox" 
                      checked={paginatedAMCs.length > 0 && paginatedAMCs.every(sub => selectedAMCs.includes(sub._id))} 
                      onChange={handleSelectAll} 
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                    />
                  </th>
                  <th>Client Name</th>
                  <th>Phone</th>
                  <th>Plan Tier</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th style={{ textAlign: 'center' }}>Preventive Visits</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAMCs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No AMC subscriptions match query.
                    </td>
                  </tr>
                ) : (
                  paginatedAMCs.map((sub, index) => {
                    const isExpiring = new Date(sub.endDate) - new Date() <= (30 * 24 * 60 * 60 * 1000);
                    const isExpired = new Date(sub.endDate) < new Date();
                    
                    return (
                      <tr key={sub._id} style={{
                        ...(isExpired ? { backgroundColor: 'rgba(239, 68, 68, 0.05)' } : {}),
                        ...(selectedAMCs.includes(sub._id) ? { backgroundColor: 'var(--primary-light)' } : {})
                      }}>
                        <td style={{ paddingLeft: 'var(--spacing-md)' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedAMCs.includes(sub._id)} 
                            onChange={(e) => handleSelectAMC(e, sub._id, index)} 
                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{sub.clientName}</td>
                        <td>{sub.clientPhone}</td>
                        <td>
                          <span className={`badge ${sub.plan === 'Premium' ? 'badge-high' : sub.plan === 'Standard' ? 'badge-medium' : 'badge-low'}`}>
                            {sub.plan}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isExpired || sub.status === 'Expired' ? 'badge-rejected' : isExpiring ? 'badge-pending' : 'badge-completed'}`}>
                            {isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : sub.status}
                          </span>
                        </td>
                        <td>{new Date(sub.startDate).toLocaleDateString()}</td>
                        <td style={isExpiring ? { color: 'var(--danger-color)', fontWeight: 600 } : {}}>
                          {new Date(sub.endDate).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {sub.preventiveVisitsCount || 0}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {(sub.plan === 'Standard' || sub.plan === 'Premium') && (
                              <button 
                                className="btn btn-success" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                                onClick={() => handleOpenVisitModal(sub)}
                                disabled={isExpired}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                Schedule Visit
                              </button>
                            )}
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => handleDeleteClick(sub)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredAMCs.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredAMCs.length)} of {filteredAMCs.length} contracts
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

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--card-bg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Register New AMC Contract</h3>
            
            <form onSubmit={handleCreateAMC}>
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newAMC.clientName}
                  onChange={(e) => setNewAMC({ ...newAMC, clientName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client Phone (WhatsApp)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newAMC.clientPhone}
                  onChange={(e) => setNewAMC({ ...newAMC, clientPhone: e.target.value })}
                  placeholder="e.g. +919876543210"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Plan Tier</label>
                <select 
                  className="form-select"
                  value={newAMC.plan}
                  onChange={(e) => setNewAMC({ ...newAMC, plan: e.target.value })}
                >
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newAMC.startDate}
                    onChange={(e) => setNewAMC({ ...newAMC, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newAMC.endDate}
                    onChange={(e) => setNewAMC({ ...newAMC, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register AMC</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Preventive Visit Modal */}
      {showVisitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--card-bg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Schedule Preventive Inspection</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>
              Automatically links to contract client: <b>{currentSub?.clientName}</b>
            </p>
            
            <form onSubmit={handleCreateVisit}>
              <div className="form-group">
                <label className="form-label">Inspection Purpose</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={visitForm.purpose}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assign Technician</label>
                <select 
                  className="form-select"
                  value={visitForm.assignedTo}
                  onChange={(e) => setVisitForm({ ...visitForm, assignedTo: e.target.value })}
                  required
                >
                  <option value="">-- Select Technician --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    value={visitForm.targetLocation.lat}
                    onChange={(e) => setVisitForm({ ...visitForm, targetLocation: { ...visitForm.targetLocation, lat: parseFloat(e.target.value) } })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    value={visitForm.targetLocation.lng}
                    onChange={(e) => setVisitForm({ ...visitForm, targetLocation: { ...visitForm.targetLocation, lng: parseFloat(e.target.value) } })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={visitForm.deadline}
                  onChange={(e) => setVisitForm({ ...visitForm, deadline: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowVisitModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Visit</button>
              </div>
            </form>
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
                Cancel AMC Contract?
              </h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: 'var(--spacing-lg)' }}>
              {deleteMode === 'single' ? (
                <>Are you sure you want to cancel the AMC subscription contract for <strong style={{ color: 'var(--text-main)' }}>{amcToDelete?.clientName}</strong>? This action cannot be undone.</>
              ) : (
                <>Are you sure you want to cancel the <strong style={{ color: 'var(--text-main)' }}>{selectedAMCs.length}</strong> selected AMC subscription contracts? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAmcToDelete(null);
                }}
              >
                No, Keep
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(amcToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setAmcToDelete(null);
                }}
                style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}
              >
                Yes, Cancel AMC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AMCServices;
