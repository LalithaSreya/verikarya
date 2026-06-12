import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const ExecutiveDashboard = () => {
  const [executiveData, setExecutiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExecutiveSummary();
  }, []);

  const fetchExecutiveSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/executive');
      if (res.data && res.data.success) {
        setExecutiveData(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch executive business intelligence summary');
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCompletionPercentage = (completed, total) => {
    if (!total || total === 0) return 100;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Executive BI Command Center</h1>
        <p className="text-muted">High-level financial summaries, client satisfaction trends, and operational efficiency indices.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center" style={{ padding: 'var(--spacing-xl)' }}>Loading executive BI dashboard...</div>
      ) : (
        <>
          {/* Executive Stats Cards */}
          <div className="grid-cols-1-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="card metric-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
              <div>
                <span className="card-subtitle">Monthly Recurring Revenue (MRR)</span>
                <div className="metric-value" style={{ color: 'var(--primary-color)', fontSize: '2.5rem' }}>
                  {formatCurrency(executiveData?.customers?.estimatedMRR || 0)}
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated from active AMC tiers</span>
            </div>

            <div className="card metric-card" style={{ borderLeft: '4px solid var(--secondary-color)' }}>
              <div>
                <span className="card-subtitle">Active AMC Subscriptions</span>
                <div className="metric-value">{executiveData?.customers?.activeAMCs || 0}</div>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {executiveData?.customers?.expiringAMCs || 0} expiring in next 30 days
              </span>
            </div>

            <div className="card metric-card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div>
                <span className="card-subtitle">Customer Satisfaction Index</span>
                <div className="metric-value" style={{ color: '#F59E0B' }}>
                  ★ {executiveData?.satisfaction?.index || '5.0'}
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Based on {executiveData?.satisfaction?.totalReviews || 0} client review submissions
              </span>
            </div>

            <div className="card metric-card" style={{ borderLeft: '4px solid var(--danger-color)' }}>
              <div>
                <span className="card-subtitle">Manager Pending Backlogs</span>
                <div className="metric-value" style={{ color: 'var(--danger-color)' }}>
                  {executiveData?.operations?.pendingReviews || 0}
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Technician tasks pending manual audit</span>
            </div>
          </div>

          {/* Operational charts & widgets */}
          <div className="grid-dashboard">
            {/* Completion Rates */}
            <div className="card">
              <h3 className="card-title">Operational Fulfilment Metrics</h3>
              <p className="card-subtitle">Real-time status of assigned tasks and technician geofence visits.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span>Technician Tasks Completion Rate</span>
                    <span>
                      {getCompletionPercentage(
                        executiveData?.operations?.tasks?.completed,
                        executiveData?.operations?.tasks?.total
                      )}%
                    </span>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-color)', height: '18px', borderRadius: '9px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${getCompletionPercentage(
                        executiveData?.operations?.tasks?.completed,
                        executiveData?.operations?.tasks?.total
                      )}%`,
                      backgroundColor: 'var(--primary-color)',
                      height: '100%',
                      transition: 'width 0.5s ease-out'
                    }}></div>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {executiveData?.operations?.tasks?.completed || 0} completed of {executiveData?.operations?.tasks?.total || 0} total tasks
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span>Site Visits Verification Rate</span>
                    <span>
                      {getCompletionPercentage(
                        executiveData?.operations?.visits?.submitted,
                        executiveData?.operations?.visits?.total
                      )}%
                    </span>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-color)', height: '18px', borderRadius: '9px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${getCompletionPercentage(
                        executiveData?.operations?.visits?.submitted,
                        executiveData?.operations?.visits?.total
                      )}%`,
                      backgroundColor: 'var(--secondary-color)',
                      height: '100%',
                      transition: 'width 0.5s ease-out'
                    }}></div>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {executiveData?.operations?.visits?.submitted || 0} check-ins of {executiveData?.operations?.visits?.total || 0} total scheduled visits
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Revenue Breakdown summary */}
            <div className="card">
              <h3 className="card-title">Income / Revenue Tiers</h3>
              <p className="card-subtitle">Active income contributions based on subscription tier pricing models.</p>
              
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>Premium Subscription (₹30,000/mo)</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>Priority SLAs</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Full preventive scheduling, dedicated helpline support.</p>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>Standard Subscription (₹15,000/mo)</span>
                    <span style={{ fontWeight: 700, color: 'var(--secondary-color)' }}>Preventive Visits</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Auto-triggered site checks with technician verification.</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>Basic Subscription (₹5,000/mo)</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>On-Demand Support</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Standard SLAs, manual visit requests only.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
