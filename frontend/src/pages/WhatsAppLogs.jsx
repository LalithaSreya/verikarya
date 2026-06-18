import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

export const WhatsAppLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Selection & Pagination States
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [logToDelete, setLogToDelete] = useState(null);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reviews/whatsapp-logs');
      const data = res.data.data || [];
      setLogs(data);
      setSelectedLogs([]);
      setIsGlobalSelected(false);
      if (data.length > 0) {
        if (!selectedLog || !data.some(d => d._id === selectedLog._id)) {
          setSelectedLog(data[0]);
        }
      } else {
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Error fetching whatsapp logs:', err);
      setError('Failed to load simulated WhatsApp outbox logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    handleClearSelection();
  };

  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    return (
      (log.to && log.to.toLowerCase().includes(term)) ||
      (log.message && log.message.toLowerCase().includes(term))
    );
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedLogs = itemsPerPage === -1
    ? filteredLogs
    : filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedLogs.length > 0 && paginatedLogs.every(l => selectedLogs.includes(l._id));

  // Selection handlers
  const handleClearSelection = () => {
    setSelectedLogs([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageLogIds = paginatedLogs.map(l => l._id);
      setSelectedLogs(Array.from(new Set([...selectedLogs, ...pageLogIds])));
    } else {
      const pageLogIds = paginatedLogs.map(l => l._id);
      setSelectedLogs(selectedLogs.filter(id => !pageLogIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectLog = (e, id, index) => {
    const isChecked = e.target.checked;
    
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedLogs.slice(start, end + 1).map(l => l._id);
      
      if (isChecked) {
        setSelectedLogs(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedLogs(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedLogs(prev => [...prev, id]);
      } else {
        setSelectedLogs(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete handlers
  const handleDeleteClick = (log) => {
    setLogToDelete(log);
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
      const res = await api.delete(`/reviews/whatsapp-logs/${id}`);
      if (res.data.success) {
        setSuccess('WhatsApp log entry deleted successfully');
        handleClearSelection();
        fetchLogs();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete WhatsApp log');
    }
  };

  const executeBulkDelete = async () => {
    try {
      setError('');
      setSuccess('');
      const res = await api.delete('/reviews/whatsapp-logs', { data: { logIds: selectedLogs } });
      if (res.data.success) {
        setSuccess(res.data.message || 'WhatsApp logs deleted successfully');
        handleClearSelection();
        fetchLogs();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete selected WhatsApp logs');
    }
  };

  const uniqueRecipients = new Set(logs.map(log => log.to)).size;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Simulated WhatsApp Gateway Console</h2>
        <p className="text-muted">Review automated customer completion notifications and verify simulated outgoing traffic.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Bulk actions banner */}
      {selectedLogs.length > 0 && (
        <div className="card" style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary-color)',
          marginBottom: 'var(--spacing-md)',
          padding: '12px 16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedLogs.length}</strong> log{selectedLogs.length > 1 ? 's' : ''}.
              {allPageSelected && filteredLogs.length > paginatedLogs.length && !isGlobalSelected && (
                <span style={{ marginLeft: '12px' }}>
                  All {paginatedLogs.length} logs on this page are selected.{' '}
                  <button 
                    onClick={() => {
                      setSelectedLogs(filteredLogs.map(l => l._id));
                      setIsGlobalSelected(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Select all {filteredLogs.length} logs matching search
                  </button>
                </span>
              )}
              {isGlobalSelected && (
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  All {filteredLogs.length} matching logs are selected.{' '}
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

      {/* Metrics Center */}
      <div className="grid-cols-1-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Metric 1: Total Messages */}
        <div className="card metric-card" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)' }}>
          <div>
            <div className="card-title" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Total Dispatches
            </div>
            <div className="card-subtitle">All simulated notifications</div>
          </div>
          <div>
            <div className="metric-value">{logs.length}</div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)' }}>
              Logged database records
            </div>
          </div>
        </div>

        {/* Metric 2: Unique Customers */}
        <div className="card metric-card" style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' }}>
          <div>
            <div className="card-title" style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Target Clients
            </div>
            <div className="card-subtitle">Unique customer endpoints</div>
          </div>
          <div>
            <div className="metric-value">{uniqueRecipients}</div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)' }}>
              Clients notified via SMS/WA
            </div>
          </div>
        </div>

        {/* Metric 3: Gateway Status */}
        <div className="card metric-card" style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)' }}>
          <div>
            <div className="card-title" style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline></svg>
              Gateway Status
            </div>
            <div className="card-subtitle">Integration simulation service</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="metric-value" style={{ color: 'var(--success-color)' }}>ONLINE</div>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: 'var(--success-color)', 
                borderRadius: '50%',
                boxShadow: '0 0 10px var(--success-color)',
                animation: 'pulse 2s infinite'
              }} />
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)' }}>
              Ready to log mock dispatches
            </div>
          </div>
        </div>

      </div>

      {/* Main interface split */}
      <div className="grid-dashboard">
        
        {/* Left Column: Logs List & Search */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', minHeight: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {paginatedLogs.length > 0 && (
                <input
                  type="checkbox"
                  checked={paginatedLogs.length > 0 && paginatedLogs.every(l => selectedLogs.includes(l._id))}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                  title="Select All on Current Page"
                />
              )}
              <h3 style={{ margin: 0 }}>Outbox Queue</h3>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchLogs} style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}>
              Refresh List
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by client phone number or message content..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ width: '100%', paddingRight: searchQuery ? '32px' : '12px' }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                  handleClearSelection();
                }}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  fontSize: '1.2rem', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ×
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-muted">Loading logs...</p>
          ) : paginatedLogs.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-xl)', flex: 1 }}>
              No messages found. Completed tasks/visits will appear here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto', flex: 1 }}>
              {paginatedLogs.map((log, index) => (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selectedLog?._id === log._id ? 'var(--primary-light)' : 'white',
                    borderColor: selectedLog?._id === log._id ? 'var(--primary-color)' : 'var(--border-color)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLogs.includes(log._id)}
                    onChange={(e) => handleSelectLog(e, log._id, index)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', transform: 'scale(1.1)', flexShrink: 0 }}
                  />

                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--secondary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {log.to ? log.to.replace(/[^\d]/g, '').slice(-2) : 'WA'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.to}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          className="btn-delete-log"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(log);
                          }}
                          title="Delete Log"
                          style={{
                            background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
                            color: 'var(--danger-color)', display: 'inline-flex', alignItems: 'center'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredLogs.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)',
              marginTop: 'auto', paddingTop: 'var(--spacing-sm)',
              borderTop: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                      handleClearSelection();
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={-1}>All</option>
                  </select>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length}
                </span>
              </div>

              {itemsPerPage !== -1 && totalPages > 1 && (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '0.85rem', padding: '0 8px', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Simulated WhatsApp Phone Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {selectedLog ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
              
              {/* Simulated Phone Header */}
              <div style={{ 
                backgroundColor: '#075E54', 
                color: 'white', 
                padding: 'var(--spacing-md)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px' 
              }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {selectedLog.to ? selectedLog.to.replace(/[^\d]/g, '').slice(-2) : 'C'}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem' }}>{selectedLog.to}</h4>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Online (Simulated Customer)</span>
                </div>
                <div style={{ fontSize: '1.25rem', opacity: 0.8 }}>⋮</div>
              </div>

              {/* Simulated Chat Background */}
              <div style={{ 
                flex: 1, 
                backgroundColor: '#ECE5DD', 
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 0)',
                backgroundSize: '16px 16px',
                padding: 'var(--spacing-md)', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'flex-end',
                minHeight: '300px'
              }}>
                {/* Chat Bubble Container */}
                <div style={{ 
                  alignSelf: 'flex-start',
                  backgroundColor: 'white', 
                  padding: '10px 14px', 
                  borderRadius: '0 8px 8px 8px', 
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
                  maxWidth: '85%',
                  position: 'relative',
                  marginBottom: 'var(--spacing-md)'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#303030', lineHeight: '1.4' }}>
                    {selectedLog.message}
                  </p>
                  <div style={{ 
                    textAlign: 'right', 
                    fontSize: '0.7rem', 
                    color: '#909090', 
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px'
                  }}>
                    <span>{new Date(selectedLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: '#34B7F1', fontWeight: 'bold' }}>✓✓</span>
                  </div>
                </div>

                {/* System Log Details Card */}
                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  padding: 'var(--spacing-sm) var(--spacing-md)', 
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <div><b>Channel:</b> WhatsApp Business API Simulator</div>
                  <div><b>Recipient Status:</b> DELIVERED (Simulated client acknowledge)</div>
                  <div><b>Dispatch Date:</b> {new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {/* Simulated Input Bar */}
              <div style={{ 
                backgroundColor: '#F0F0F0', 
                padding: 'var(--spacing-sm) var(--spacing-md)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px' 
              }}>
                <div style={{ fontSize: '1.25rem', color: '#707070', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </div>
                <div style={{ 
                  flex: 1, 
                  backgroundColor: 'white', 
                  padding: '8px 12px', 
                  borderRadius: '18px', 
                  fontSize: '0.85rem', 
                  color: '#909090',
                  border: '1px solid #E0E0E0'
                }}>
                  Type a reply...
                </div>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  backgroundColor: '#075E54', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 700
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                </div>
              </div>

            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px', textAlign: 'center' }}>
              <div className="text-muted">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-md)', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h3>Select a log message</h3>
                <p>Click on any sent message inside the queue to preview its simulated delivery view.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Red Delete Confirmation Modal */}
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
                <>Are you sure you want to delete the simulated WhatsApp log to <strong style={{ color: 'var(--text-main)' }}>{logToDelete?.to}</strong>?</>
              ) : (
                <>Are you sure you want to delete the <strong style={{ color: 'var(--text-main)' }}>{selectedLogs.length}</strong> selected WhatsApp logs? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setLogToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(logToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setLogToDelete(null);
                }}
                style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default WhatsAppLogs;
