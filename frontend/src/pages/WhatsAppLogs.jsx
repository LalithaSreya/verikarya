import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

export const WhatsAppLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reviews/whatsapp-logs');
      setLogs(res.data.data || []);
      if (res.data.data && res.data.data.length > 0) {
        setSelectedLog(res.data.data[0]);
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
  };

  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    return (
      (log.to && log.to.toLowerCase().includes(term)) ||
      (log.message && log.message.toLowerCase().includes(term))
    );
  });

  const uniqueRecipients = new Set(logs.map(log => log.to)).size;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>💬 Simulated WhatsApp Gateway Console</h2>
        <p className="text-muted">Review automated customer completion notifications and verify simulated outgoing traffic.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Metrics Center */}
      <div className="grid-cols-1-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
        
        {/* Metric 1: Total Messages */}
        <div className="card metric-card" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)' }}>
          <div>
            <div className="card-title" style={{ color: 'var(--primary-color)' }}>✉️ Total Dispatches</div>
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
            <div className="card-title" style={{ color: 'var(--secondary-color)' }}>👥 Target Clients</div>
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
            <div className="card-title" style={{ color: 'var(--success-color)' }}>⚡ Gateway Status</div>
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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Outbox Queue</h3>
            <button className="btn btn-outline btn-sm" onClick={fetchLogs} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
              🔄 Refresh List
            </button>
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="Search by client phone number or message content..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ width: '100%' }}
          />

          {loading ? (
            <p className="text-muted">Loading logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              No messages found. Completed tasks/visits will appear here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
              {filteredLogs.map((log) => (
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
                    gap: '12px',
                    alignItems: 'center'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--secondary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {log.to ? log.to.replace(/[^\d]/g, '').slice(-2) : 'WA'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.to}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
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
                  <div><b>Channel:</b> WhatsApp Business API API Simulator</div>
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
                <div style={{ fontSize: '1.25rem', color: '#707070' }}>☺ 📎</div>
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
                  🎤
                </div>
              </div>

            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px', textAlign: 'center' }}>
              <div className="text-muted">
                <span style={{ fontSize: '3rem' }}>💬</span>
                <h3>Select a log message</h3>
                <p>Click on any sent message inside the queue to preview its simulated delivery view.</p>
              </div>
            </div>
          )}
        </div>

      </div>

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
