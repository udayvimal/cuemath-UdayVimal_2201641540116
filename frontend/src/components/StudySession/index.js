import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudySession } from '../../hooks/useStudySession';
import { RATINGS } from '../../utils/spacedRepetition';

const TYPE_COLORS = {
  concept: '#2F80ED', why: '#6C47FF', how: '#00B4D8',
  example: '#00C48C', relationship: '#9B51E0',
  edge_case: '#FF6B35', misconception: '#FF4757', compare: '#F2994A',
};
const TYPE_LABELS = {
  concept: 'Concept', why: 'Why', how: 'How', example: 'Example',
  relationship: 'Relationship', edge_case: 'Edge Case',
  misconception: 'Misconception', compare: 'Compare',
};

// Format elapsed seconds as mm:ss
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const IMPORTANCE_LABELS = ['', 'Low', 'Low', 'Medium', 'High', 'Critical'];
const IMPORTANCE_COLORS = ['', '#9CA3AF', '#9CA3AF', '#F59E0B', '#F97316', '#EF4444'];

function ImportanceBadge({ score }) {
  const s = Math.max(1, Math.min(5, score || 3));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i <= s ? IMPORTANCE_COLORS[s] : 'var(--cue-gray-200)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '0.68rem', color: IMPORTANCE_COLORS[s], fontWeight: 600, letterSpacing: '0.02em' }}>
        {IMPORTANCE_LABELS[s]}
      </span>
    </div>
  );
}

export default function StudySession({ deck, maxCards, onComplete, onExit, onCardUpdate }) {
  const {
    currentCard, isFlipped, isComplete, sessionStats,
    progress, dueCount, flipCard, rateCard,
  } = useStudySession(deck, maxCards, (cardId, sm2) => onCardUpdate(deck.id, cardId, sm2));

  const [elapsed, setElapsed] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef();
  const toastShown = useRef(false);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Show pro-tip toast on first session
  useEffect(() => {
    if (!toastShown.current) {
      toastShown.current = true;
      const t = setTimeout(() => { setShowToast(true); setTimeout(() => setShowToast(false), 4000); }, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  // Complete
  useEffect(() => {
    if (isComplete && sessionStats.cardsReviewed > 0) {
      clearInterval(timerRef.current);
      const t = setTimeout(() => onComplete({ ...sessionStats, durationSeconds: elapsed }), 300);
      return () => clearTimeout(t);
    }
  }, [isComplete, sessionStats, onComplete, elapsed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' && !isFlipped) { e.preventDefault(); flipCard(); }
      if (isFlipped) {
        if (e.key === '1') rateCard(RATINGS.AGAIN);
        if (e.key === '2') rateCard(RATINGS.HARD);
        if (e.key === '3') rateCard(RATINGS.GOOD);
        if (e.key === '4') rateCard(RATINGS.EASY);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, flipCard, rateCard]);

  // No due cards
  if (dueCount === 0) {
    return (
      <div className="study-session" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: 8 }}>All caught up!</h2>
          <p style={{ color: 'var(--cue-gray-500)', marginBottom: 24 }}>No cards are due right now. Come back tomorrow!</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={onExit}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  const color = TYPE_COLORS[currentCard.type] || '#6B7280';

  return (
    <div className="study-session">
      {/* Top bar */}
      <div className="session-bar">
        <button className="session-exit" onClick={onExit}>← Exit</button>

        <div className="session-prog-wrap">
          <div className="session-prog-track">
            <div
              className="session-prog-fill"
              style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
          <span className="session-prog-label">{progress.current} / {progress.total}</span>
        </div>

        <div className="session-score">
          <span className="session-score-item" style={{ color: 'var(--cue-green)' }}>
            ✅ {sessionStats.correctCount}
          </span>
          <span className="session-score-item" style={{ color: 'var(--cue-red)' }}>
            ❌ {sessionStats.againCount}
          </span>
        </div>

        <span className="session-timer">{formatTime(elapsed)}</span>
      </div>

      {/* Card viewport */}
      <div className="card-viewport">
        {/* Flashcard */}
        <div className="flashcard-wrap">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <div
                className={`flashcard ${isFlipped ? 'flipped' : ''}`}
                style={{ minHeight: 320 }}
              >
                {/* Front */}
                <div
                  className={`card-face card-front card-face-${currentCard.type || 'concept'}`}
                  onClick={!isFlipped ? flipCard : undefined}
                  style={{ cursor: isFlipped ? 'default' : 'pointer' }}
                >
                  <div className="card-type-row">
                    <span
                      className="card-type-pill"
                      style={{ background: color }}
                    >
                      {TYPE_LABELS[currentCard.type] || currentCard.type}
                    </span>
                    <span className="card-topic">{currentCard.topic}</span>
                  </div>

                  <div className="card-question-text">{currentCard.front}</div>

                  {!isFlipped && (
                    <div className="card-flip-hint">
                      Tap to reveal · <kbd>Space</kbd>
                    </div>
                  )}

                  <div className="card-diff-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {[1,2,3,4,5].map(d => (
                        <div key={d} className={`cdot ${d <= (currentCard.difficulty || 1) ? 'on' : ''}`} />
                      ))}
                      <span className="cdiff-label">Difficulty</span>
                    </div>
                    <ImportanceBadge score={currentCard.importance_score || 3} />
                  </div>
                </div>

                {/* Back */}
                <div className={`card-face card-back card-face-back-${currentCard.type || 'concept'}`}>
                  <div className="card-type-row">
                    <span className="card-type-pill" style={{ background: color }}>
                      {TYPE_LABELS[currentCard.type] || currentCard.type}
                    </span>
                    <span className="card-topic">{currentCard.topic}</span>
                  </div>

                  <div className="card-question-text" style={{ fontSize: '1.05rem', marginBottom: 4 }}>
                    {currentCard.front}
                  </div>

                  <div className="card-divider" />

                  <div className="card-answer-text">{currentCard.back}</div>

                  <div className="card-diff-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {[1,2,3,4,5].map(d => (
                        <div key={d} className={`cdot ${d <= (currentCard.difficulty || 1) ? 'on' : ''}`} />
                      ))}
                      <span className="cdiff-label">Difficulty</span>
                    </div>
                    <ImportanceBadge score={currentCard.importance_score || 3} />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rating buttons — slide up after flip */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              className="rating-section"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22 }}
            >
              <div className="rating-prompt">How well did you know this?</div>
              <div className="rating-btns">
                {[
                  { rating: RATINGS.AGAIN, label: 'Again',  sub: "Didn't know",   key: '1', bg: '#FFF0F1', border: '#FF4757', text: '#CC0015' },
                  { rating: RATINGS.HARD,  label: 'Hard',   sub: 'Struggled',     key: '2', bg: '#FFFBEB', border: '#FFB800', text: '#B37D00' },
                  { rating: RATINGS.GOOD,  label: 'Good',   sub: 'Got it',        key: '3', bg: '#E6FAF5', border: '#00C48C', text: '#00755A' },
                  { rating: RATINGS.EASY,  label: 'Easy',   sub: 'Perfect recall',key: '4', bg: '#EBF4FF', border: '#2F80ED', text: '#1558C4' },
                ].map(b => (
                  <button
                    key={b.rating}
                    className="rating-btn"
                    onClick={() => rateCard(b.rating)}
                    style={{ backgroundColor: b.bg, borderColor: b.border, color: b.text }}
                  >
                    <span className="rbtn-label">{b.label}</span>
                    <span className="rbtn-sub">{b.sub}</span>
                    <span className="rbtn-key">{b.key}</span>
                  </button>
                ))}
              </div>
              <div className="rating-tooltips">
                <div className="rtip">Show again<br />today</div>
                <div className="rtip">Review in<br />1 day</div>
                <div className="rtip">Review in<br />a few days</div>
                <div className="rtip">Review in<br />weeks</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isFlipped && (
          <div className="session-footer">
            <span style={{ fontSize: '0.78rem', color: 'var(--cue-gray-400)' }}>
              Press <kbd>Space</kbd> to flip · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> to rate
            </span>
          </div>
        )}
      </div>

      {/* Pro-tip toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--cue-navy)', color: 'white',
              padding: '10px 20px', borderRadius: 99, fontSize: '0.82rem', fontWeight: 500,
              boxShadow: 'var(--shadow-lg)', zIndex: 200, whiteSpace: 'nowrap',
            }}
          >
            💡 Pro tip: Use <strong style={{ margin: '0 4px' }}>Space</strong> to flip · <strong style={{ margin: '0 4px' }}>1–4</strong> to rate
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
