import React from 'react';

export default function ProgressBar({ percent, color = 'primary', height = 8, showLabel = false, animated = false }) {
  const colorMap = {
    primary: '#4F46E5',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  const clampedPercent = Math.max(0, Math.min(100, percent || 0));

  return (
    <div className="progress-bar-wrapper" style={{ height }}>
      <div
        className={`progress-bar-fill ${animated ? 'progress-bar-animated' : ''}`}
        style={{
          width: `${clampedPercent}%`,
          backgroundColor: colorMap[color] || colorMap.primary,
          height: '100%',
          borderRadius: height,
          transition: 'width 0.6s ease',
        }}
        role="progressbar"
        aria-valuenow={clampedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      {showLabel && (
        <span className="progress-bar-label">{clampedPercent}%</span>
      )}
    </div>
  );
}
