import React from 'react';

export default function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">🧠 Cuemath Assistant</div>
          <div className="modal-header-sub">Study smarter. Remember forever.</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="modal-row">
            <span className="modal-row-label">Competition</span>
            <span className="modal-row-value">Cuemath AI Builder Challenge 2026</span>
          </div>
          <div className="modal-row">
            <span className="modal-row-label">Problem</span>
            <span className="modal-row-value">Problem 1: The Flashcard Engine</span>
          </div>
          <div className="modal-row">
            <span className="modal-row-label">Builder</span>
            <span className="modal-row-value">Uday Vimal</span>
          </div>
          <div className="modal-row">
            <span className="modal-row-label">Algorithm</span>
            <span className="modal-row-value">SM-2 Spaced Repetition (hand-coded)</span>
          </div>
          <div className="modal-row">
            <span className="modal-row-label">Tech Stack</span>
            <div className="modal-stack-chips">
              {['React', 'FastAPI', 'PyMuPDF', 'SM-2 Algorithm', 'Gemini AI', 'Ollama Gemma3:1b', 'localStorage'].map(t => (
                <span key={t} className="modal-chip">{t}</span>
              ))}
            </div>
          </div>
          <p className="modal-tagline">
            "The most powerful flashcard engine you've never seen."
          </p>
        </div>
      </div>
    </div>
  );
}
