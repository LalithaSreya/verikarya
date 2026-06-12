import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export const FeedbackSubmit = () => {
  const { type, id } = useParams();
  const [details, setDetails] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReferenceDetails();
  }, [type, id]);

  const fetchReferenceDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/feedback/details/${type}/${id}`);
      if (res.data && res.data.success) {
        setDetails(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      setError('Invalid review link or records not found.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await api.post('/feedback/submit', {
        referenceId: id,
        refModel: type,
        rating,
        comments
      });
      if (res.data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card text-center">
          <p>Loading your review details...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="login-page">
        <div className="login-card text-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-color)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>Thank You!</h2>
          <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
            Your feedback has been logged. We appreciate your time in helping us improve our services.
          </p>
          <div className="alert alert-success">
            Review logged successfully for technician <strong>{details?.technicianName}</strong>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '480px', animation: 'fadeIn 0.3s ease-out' }}>
        <div className="login-logo">
          <div className="login-logo-icon">VK</div>
          <h2 style={{ fontSize: '1.25rem', marginTop: 'var(--spacing-sm)' }}>Service Feedback</h2>
        </div>

        {error ? (
          <div className="alert alert-danger text-center">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Client
              </div>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 'var(--spacing-xs)' }}>
                {details?.clientName}
              </div>
              
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: '8px' }}>
                Service / Purpose
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                {details?.purpose}
              </div>

              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: '8px' }}>
                Assigned Technician
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                {details?.technicianName}
              </div>
            </div>

            <div className="form-group text-center" style={{ margin: 'var(--spacing-lg) 0' }}>
              <label className="form-label" style={{ marginBottom: 'var(--spacing-sm)', display: 'block' }}>
                How would you rate our service?
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = hoverRating ? star <= hoverRating : star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '2.25rem',
                        color: isActive ? '#F59E0B' : '#E2E8F0',
                        transition: 'transform 0.1s ease',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '6px' }}>
                {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Very Poor'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Comments or Suggestions</label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Share your experience (optional)..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                style={{ resize: 'vertical', width: '100%', padding: '10px' }}
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 'var(--spacing-md)' }}>
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackSubmit;
