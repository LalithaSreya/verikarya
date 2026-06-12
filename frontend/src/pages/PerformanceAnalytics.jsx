import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Professional Custom SVG Bar Chart
const PerformanceChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  // Take top 5 for cleaner chart layout
  const topData = data.slice(0, 5);
  
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = 35;
  const graphHeight = chartHeight - 2 * padding;
  const graphWidth = chartWidth - 2 * padding;
  
  const barWidth = Math.min(45, (graphWidth / topData.length) - 16);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '10px 0' }}>
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
        {/* Y Axis line */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="var(--border-color)" strokeWidth="1.5" />
        {/* X Axis line */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--border-color)" strokeWidth="1.5" />
        
        {/* Horizontal gridlines */}
        {[25, 50, 75, 100].map((val, i) => {
          const y = chartHeight - padding - (val / 100) * graphHeight;
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={padding - 8} y={y + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)" fontWeight="600">{val}%</text>
            </g>
          );
        })}
        
        {/* Bars */}
        {topData.map((item, index) => {
          const x = padding + (index * (graphWidth / topData.length)) + (graphWidth / topData.length - barWidth) / 2;
          const scoreHeight = (item.productivityScore / 100) * graphHeight;
          const y = chartHeight - padding - scoreHeight;
          
          return (
            <g key={index}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={scoreHeight}
                fill="url(#barGradient)"
                rx="4"
              />
              
              {/* Score label on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fill="var(--primary-color)"
              >
                {item.productivityScore}%
              </text>
              
              {/* Name Label below bar */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - padding + 16}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                fill="var(--text-main)"
              >
                {item.name.split(' ')[0]}
              </text>
            </g>
          );
        })}
        
        {/* Gradients */}
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-color)" />
            <stop offset="100%" stopColor="var(--secondary-color)" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const TPIAverageGauge = ({ score }) => {
  const radius = 60;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // Semicircle length
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0', width: '100%' }}>
      <svg width="180" height="110" viewBox="0 0 160 100" style={{ overflow: 'visible' }}>
        {/* Background Arc */}
        <path
          d={`M 20 90 A ${radius} ${radius} 0 0 1 140 90`}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value Arc */}
        <path
          d={`M 20 90 A ${radius} ${radius} 0 0 1 140 90`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
        {/* Center Text */}
        <text x="80" y="75" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--text-main)">
          {score}%
        </text>
        <text x="80" y="94" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)" letterSpacing="0.05em">
          TEAM AVERAGE TPI
        </text>
        
        {/* Gradients */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--secondary-color)" />
            <stop offset="100%" stopColor="var(--primary-color)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export const PerformanceAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProductivity();
  }, []);

  const fetchProductivity = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/productivity');
      if (res.data && res.data.success) {
        setAnalytics(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load productivity analytics');
      setLoading(false);
    }
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return { bg: '#FEF3C7', text: '#D97706', border: '#F59E0B' }; // Gold
    if (rank === 2) return { bg: '#F1F5F9', text: '#475569', border: '#94A3B8' }; // Silver
    if (rank === 3) return { bg: '#FFEDD5', text: '#EA580C', border: '#F97316' }; // Bronze
    return { bg: 'transparent', text: 'var(--text-muted)', border: 'transparent' };
  };

  const getRankBadge = (rank) => {
    const style = getRankStyle(rank);
    if (rank <= 3) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: style.bg,
          color: style.text,
          border: `1.5px solid ${style.border}`,
          fontWeight: 700,
          fontSize: '0.8rem'
        }}>
          {rank}
        </span>
      );
    }
    return <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{rank}</span>;
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Performance Analytics & Leaderboards</h1>
        <p className="text-muted">Track employee productivity indices, visit completion rates, and GPS location check-in accuracies.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center" style={{ padding: 'var(--spacing-xl)' }}>Loading analytics data...</div>
      ) : (
        <>
          {/* Top Performer Card */}
          {analytics?.topPerformer && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--primary-light), var(--secondary-light))',
              borderColor: 'var(--primary-color)',
              marginBottom: 'var(--spacing-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--spacing-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  border: '2px solid #F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
                  </svg>
                </div>
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--primary-color)'
                  }}>
                    Top Performer of the Month
                  </span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '2px' }}>{analytics.topPerformer.name}</h2>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>{analytics.topPerformer.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Productivity Index</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {analytics.topPerformer.productivityScore}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Avg Client Rating</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#F59E0B' }}>
                    ★ {analytics.topPerformer.avgRating}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tasks Done</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>
                    {analytics.topPerformer.completedTasks + analytics.topPerformer.completedVisits}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Productivity Analysis Explanation Banner */}
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)', borderLeft: '4px solid var(--primary-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Evaluation Methodology</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The <strong>Technician Productivity Index (TPI)</strong> measures operational efficiency by weighting task and site visit completion rates at <strong>70%</strong>, and customer reviews/satisfaction averages at <strong>30%</strong>. This provides a balanced assessment of both work volume and client service quality.
            </p>
          </div>

          {/* Leaderboard Table and Comparison Meters */}
          <div className="grid-dashboard">
            {/* Leaderboard card */}
            <div className="card">
              <h3 className="card-title">Technician Leaderboard</h3>
              <p className="card-subtitle">Detailed breakdown of operational performance across the team.</p>
              
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Rank</th>
                      <th>Technician</th>
                      <th style={{ textAlign: 'center' }}>Completions</th>
                      <th style={{ textAlign: 'center' }}>Avg Rating</th>
                      <th style={{ textAlign: 'center' }}>GPS Accuracy (Avg)</th>
                      <th style={{ textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.leaderboard?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          No technicians tracked.
                        </td>
                      </tr>
                    ) : (
                      analytics?.leaderboard?.map((emp, index) => {
                        const totalAssigned = emp.totalTasks + emp.totalVisits;
                        const totalCompleted = emp.completedTasks + emp.completedVisits;
                        
                        return (
                          <tr key={emp.id}>
                            <td style={{ textAlign: 'center' }}>{getRankBadge(index + 1)}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{emp.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 600 }}>{totalCompleted} / {totalAssigned}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.completionRate}% rate</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontWeight: 600, color: '#F59E0B' }}>★ {emp.avgRating}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {emp.avgDistance > 0 ? (
                                <span style={{ 
                                  fontWeight: 500, 
                                  color: emp.avgDistance < 100 ? 'var(--success-color)' : emp.avgDistance < 500 ? 'var(--warning-color)' : 'var(--danger-color)'
                                }}>
                                  {emp.avgDistance}m
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Perfect check-in</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-color)' }}>
                              {emp.productivityScore}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Team Comparison & Graph */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              
              {/* Team Average TPI Gauge Card */}
              {(() => {
                const teamAverageTPI = analytics?.leaderboard?.length > 0
                  ? Math.round(analytics.leaderboard.reduce((sum, emp) => sum + emp.productivityScore, 0) / analytics.leaderboard.length)
                  : 0;
                return (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h3 className="card-title" style={{ width: '100%', justifyContent: 'center' }}>Team Efficiency Gauge</h3>
                    <p className="card-subtitle" style={{ width: '100%' }}>Overall average productivity level of security team.</p>
                    <TPIAverageGauge score={teamAverageTPI} />
                  </div>
                );
              })()}

              {/* Graphic chart representation */}
              <div className="card">
                <h3 className="card-title">Productivity Score Chart</h3>
                <p className="card-subtitle">Top 5 performers compared side-by-side.</p>
                <PerformanceChart data={analytics?.leaderboard} />
              </div>

              {/* Progress bars comparison */}
              <div className="card">
                <h3 className="card-title">Score Comparison</h3>
                <p className="card-subtitle">Visual check of productivity scores across the team.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                  {analytics?.leaderboard?.map((emp) => (
                    <div key={emp.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                        <span>{emp.name}</span>
                        <span>{emp.productivityScore}%</span>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-color)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${emp.productivityScore}%`,
                          background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
                          height: '100%'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceAnalytics;
