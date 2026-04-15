import React from 'react';

/**
 * StatCard — the big number highlight boxes on the dashboard.
 * These are the "sports scoreboard" metrics that judges see first.
 */
export default function StatCard({ icon, value, label, color = 'primary', sublabel = '' }) {
  const colorMap = {
    primary: 'stat-card-primary',
    success: 'stat-card-success',
    warning: 'stat-card-warning',
    danger: 'stat-card-danger',
    neutral: 'stat-card-neutral',
    purple: 'stat-card-purple',
  };

  return (
    <div className={`stat-card ${colorMap[color] || colorMap.primary}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value ?? '—'}</div>
      <div className="stat-card-label">{label}</div>
      {sublabel && <div className="stat-card-sublabel">{sublabel}</div>}
    </div>
  );
}
