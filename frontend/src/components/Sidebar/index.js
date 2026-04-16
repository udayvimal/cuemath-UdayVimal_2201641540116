import React from 'react';

const NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'deck',      icon: '📚', label: 'My Decks' },
  { id: 'study',     icon: '⚡', label: 'Study Now', badge: true },
  { id: 'settings',  icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ screen, onNavigate, dueCount, onInfo }) {
  const activeId = screen === 'complete' ? 'study'
    : screen === 'briefing' ? 'study'
    : screen === 'decks' ? 'deck'
    : screen;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-row">
          <div className="sidebar-logo-icon">🧠</div>
          <div>
            <div className="sidebar-logo-text">Cuemath</div>
            <div className="sidebar-logo-sub">Assistant</div>
          </div>
        </div>
        <div className="sidebar-builder">by Uday Vimal</div>
      </div>

      {/* Upload CTA — always visible, impossible to miss */}
      <button
        className={`sidebar-upload-cta ${activeId === 'upload' ? 'active' : ''}`}
        onClick={() => onNavigate('upload')}
      >
        <span style={{ fontSize: '1rem' }}>📤</span>
        <span>Upload PDF</span>
        <span style={{ marginLeft: 'auto', fontSize: '1.1rem', fontWeight: 700 }}>+</span>
      </button>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeId === item.id ? 'active' : ''} ${item.id === 'study' && dueCount > 0 ? 'study-neon' : ''}`}
            onClick={() => {
              if (item.id === 'study' && dueCount === 0) return;
              onNavigate(item.id);
            }}
            disabled={item.id === 'study' && dueCount === 0}
            style={item.id === 'study' && dueCount === 0 ? { opacity: 0.5 } : {}}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && dueCount > 0 && (
              <span className="sidebar-badge">{dueCount}</span>
            )}
          </button>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>About</div>
        <button className="sidebar-item" onClick={onInfo}>
          <span className="sidebar-item-icon">ℹ️</span>
          <span>About this App</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--cue-orange)' }}>
          Cuemath AI Builder Challenge 2026
        </div>
        Problem 1: The Flashcard Engine<br />
        SM-2 · Gemini AI · FastAPI
      </div>
    </aside>
  );
}
