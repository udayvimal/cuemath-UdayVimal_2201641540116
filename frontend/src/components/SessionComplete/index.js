import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '../common/Button';

const MESSAGES = {
  perfect:  { headline: 'Outstanding! 🔥',      body: "You nailed every card. Those memories are now deeply encoded. The algorithm has pushed your next reviews weeks ahead." },
  great:    { headline: 'Great work! 💪',        body: "Solid session. Cards you struggled with come back sooner for extra practice — that's SM-2 working for you." },
  decent:   { headline: 'Good session! 📚',      body: "Every review strengthens the memory trace. Keep the consistency going — the streak is what matters most." },
  keep_going:{ headline: 'Keep going! 🌱',       body: "Learning takes time. The cards you found hard will appear again soon. That repetition is exactly how long-term memory forms." },
};

function getMotivation(pct) {
  if (pct >= 90) return MESSAGES.perfect;
  if (pct >= 70) return MESSAGES.great;
  if (pct >= 50) return MESSAGES.decent;
  return MESSAGES.keep_going;
}

function formatDuration(s) {
  if (!s) return '0s';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function SessionComplete({ sessionStats, deckName, onContinue, onViewDeck }) {
  const confettiFired = useRef(false);
  const {
    cardsReviewed = 0, correctCount = 0, againCount = 0,
    durationSeconds = 0,
  } = sessionStats || {};

  const accuracyPct = cardsReviewed > 0 ? Math.round((correctCount / cardsReviewed) * 100) : 0;
  const { headline, body } = getMotivation(accuracyPct);
  const isPerfect = accuracyPct >= 90 && cardsReviewed >= 3;

  // Ring stroke
  const R = 54, C = 2 * Math.PI * R;
  const strokeColor = accuracyPct >= 90 ? '#00C48C' : accuracyPct >= 70 ? '#FF6B35' : '#FFB800';

  useEffect(() => {
    if (isPerfect && !confettiFired.current) {
      confettiFired.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 }, colors: ['#FF6B35', '#6C47FF', '#00C48C', '#FFB800', '#FF4757'] });
        setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.5, x: 0.2 }, colors: ['#FF6B35', '#FFB800'] }), 400);
        setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.5, x: 0.8 }, colors: ['#6C47FF', '#00C48C'] }), 600);
      });
    }
  }, [isPerfect]);

  const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
  const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="session-complete">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: 'backOut' }}>
        <div className="sc-emoji">{isPerfect ? '🏆' : accuracyPct >= 70 ? '🎯' : '📚'}</div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="sc-headline">{headline}</div>
        <div className="sc-deck">{deckName}</div>
        <div className="sc-message">{body}</div>
      </motion.div>

      {/* Accuracy ring */}
      <motion.div
        className="sc-ring-wrap"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.45, ease: 'backOut' }}
      >
        <svg viewBox="0 0 120 120" width="140" height="140">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--cue-gray-100)" strokeWidth="11" />
          <circle
            cx="60" cy="60" r={R} fill="none"
            stroke={strokeColor} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - accuracyPct / 100)}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="sc-ring-label">
          <div className="sc-ring-pct">{accuracyPct}%</div>
          <div className="sc-ring-sub">accuracy</div>
        </div>
      </motion.div>

      {/* Metrics grid */}
      <motion.div className="sc-metrics" variants={stagger} initial="initial" animate="animate">
        {[
          { val: cardsReviewed,                  label: 'Cards Reviewed',   cls: '' },
          { val: `${accuracyPct}%`,              label: 'Accuracy',         cls: 'green' },
          { val: correctCount,                   label: 'Correct',          cls: 'orange' },
          { val: againCount,                     label: 'Retrying Soon',    cls: 'red' },
          { val: formatDuration(durationSeconds),label: 'Time Spent',       cls: '' },
          {
            val: cardsReviewed > 0 ? `${Math.round(durationSeconds / cardsReviewed)}s` : '—',
            label: 'Avg per Card', cls: '',
          },
        ].map(m => (
          <motion.div key={m.label} className={`sc-metric ${m.cls}`} variants={item}>
            <div className="sc-metric-val">{m.val}</div>
            <div className="sc-metric-lbl">{m.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* SM-2 explanation note */}
      <motion.div className="sc-sm2-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🧠</span>
        <p>
          <strong>SM-2 has scheduled your reviews.</strong> Cards you rated Easy won't appear for <strong>days or weeks</strong>.
          Cards you rated Again come back <strong>tomorrow</strong>. The algorithm is working — trust the process.
        </p>
      </motion.div>

      <motion.div className="sc-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
        <Button variant="primary" size="lg" onClick={onViewDeck}>View Deck Stats</Button>
        <Button variant="secondary" size="lg" onClick={onContinue}>Back to Dashboard</Button>
      </motion.div>

      <div className="sc-builder">Cuemath Assistant · Built by Uday Vimal</div>
    </div>
  );
}
