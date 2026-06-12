import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const CustomerFeedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedback');
      if (res.data && res.data.success) {
        setFeedbackList(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch customer reviews');
      setLoading(false);
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

  return (
    <div className="page-container">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer Feedback & Reviews</h1>
        <p className="text-muted">Analyze real-time service satisfaction reviews left by AMC and task clients.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

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

      {/* Review Logs Table */}
      {loading ? (
        <div className="text-center" style={{ padding: 'var(--spacing-xl)' }}>Loading customer reviews...</div>
      ) : (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--spacing-md)' }}>Review History Logs</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Technician</th>
                  <th>Service Type</th>
                  <th>Rating</th>
                  <th style={{ width: '40%' }}>Comments</th>
                  <th>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No feedback logs available.
                    </td>
                  </tr>
                ) : (
                  feedbackList.map(item => (
                    <tr key={item._id}>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerFeedback;
