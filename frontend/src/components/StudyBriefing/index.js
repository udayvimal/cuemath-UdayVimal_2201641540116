import React from 'react';
import { motion } from 'framer-motion';
import { computeDeckStats } from '../../utils/metrics';

const RATINGS = [
  {
    key: 'again', label: 'Again', key_hint: '1',
    bg: '#FFF0F1', border: '#FF4757', text: '#CC0015',
    desc: "Completely forgot. Card comes back today.",
    icon: '✗',
  },
  {
    key: 'hard', label: 'Hard', key_hint: '2',
    bg: '#FFFBEB', border: '#FFB800', text: '#B37D00',
    desc: "Remembered with difficulty. Short interval.",
    icon: '~',
  },
  {
    key: 'good', label: 'Good', key_hint: '3',
    bg: '#E6FAF5', border: '#00C48C', text: '#00755A',
    desc: "Got it with some effort. Normal interval.",
    icon: '✓',
  },
  {
    key: 'easy', label: 'Easy', key_hint: '4',
    bg: '#EBF4FF', border: '#2F80ED', text: '#1558C4',
    desc: "Perfect recall. Interval multiplied by ease factor.",
    icon: '★',
  },
];

const STEPS = [
  { icon: '👁️', title: 'See the question', desc: 'Read the front of the card carefully. Think of your answer before flipping.' },
  { icon: '🔄', title: 'Flip to reveal', desc: 'Press Space or tap the card. The answer appears on the back.' },
  { icon: '🎯', title: 'Rate your recall', desc: 'Honestly rate how well you knew it. This trains the SM-2 algorithm.' },
  { icon: '📅', title: 'SM-2 schedules next review', desc: 'Easy cards come back in days. Hard cards come back sooner. You always review at the optimal moment.' },
];

function deckEmoji(name = '') {
  const n = name.toLowerCase();
  if (/calcul|math|algebra|geometry|trigon/.test(n)) return '📐';
  if (/physic|mechanic|quantum/.test(n)) return '⚛️';
  if (/chemist|organic|molecule/.test(n)) return '🧪';
  if (/biolog|cell|dna|gene/.test(n)) return '🔬';
  if (/histor|war|ancient/.test(n)) return '📜';
  if (/computer|program|algorithm|code/.test(n)) return '💻';
  return '📚';
}

export default function StudyBriefing({ deck, onBegin, onBack }) {
  const stats = computeDeckStats(deck);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 8px' }}>
      {onBack && (
        <button className="back-btn" onClick={onBack}>← Back</button>
      )}

      {/* Deck hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(135deg, var(--cue-orange) 0%, #FF9A6C 100%)',
          borderRadius: 'var(--radius-xl)', padding: '28px 32px', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20, marginBottom: 28,
          boxShadow: '0 8px 32px rgba(255,107,53,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontSize: '3rem' }}>{deckEmoji(deck.name)}</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
              {deck.name}
            </div>
            <div style={{ opacity: 0.9, fontSize: '0.92rem', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>⚡ <strong>{stats.dueCount}</strong> cards due</span>
              <span>📚 <strong>{stats.total}</strong> total</span>
              <span>✅ <strong>{stats.masteredCount}</strong> mastered</span>
              <span>🔄 <strong>{stats.learningCount}</strong> learning</span>
            </div>
          </div>
        </div>

        <button
          onClick={onBegin}
          style={{
            background: 'white', color: 'var(--cue-orange)', border: 'none',
            borderRadius: 'var(--radius-lg)', padding: '14px 32px',
            fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-heading)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'scale(1.04)'; e.target.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'; }}
          onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; }}
        >
          Begin Session →
        </button>
      </motion.div>

      {/* How it works steps */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
        style={{ marginBottom: 28 }}
      >
        <div className="section-title" style={{ marginBottom: 14 }}>How a study session works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              background: 'var(--cue-surface)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--cue-border)', padding: '16px 18px',
            }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{step.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 5, color: 'var(--cue-gray-800)' }}>
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--cue-orange)', color: 'white',
                  fontSize: '0.7rem', fontWeight: 800, textAlign: 'center', lineHeight: '20px',
                  marginRight: 6,
                }}>{i + 1}</span>
                {step.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--cue-gray-500)', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rating guide */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}
        style={{ marginBottom: 28 }}
      >
        <div className="section-title" style={{ marginBottom: 14 }}>Rating buttons — be honest, the algorithm adapts</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {RATINGS.map(r => (
            <div key={r.key} style={{
              background: r.bg, border: `2px solid ${r.border}`,
              borderRadius: 'var(--radius-lg)', padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{
                  fontWeight: 800, fontSize: '1rem', color: r.text,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: r.border, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800,
                  }}>{r.icon}</span>
                  {r.label}
                </div>
                <kbd style={{
                  background: r.border + '22', color: r.text, border: `1px solid ${r.border}`,
                  borderRadius: 5, padding: '2px 7px', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  {r.key_hint}
                </kbd>
              </div>
              <div style={{ fontSize: '0.78rem', color: r.text, lineHeight: 1.5, opacity: 0.85 }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Keyboard shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
        style={{ marginBottom: 32 }}
      >
        <div className="section-title" style={{ marginBottom: 14 }}>Keyboard shortcuts</div>
        <div style={{
          background: 'var(--cue-surface)', border: '1px solid var(--cue-border)',
          borderRadius: 'var(--radius-lg)', padding: '18px 24px',
          display: 'flex', gap: 32, flexWrap: 'wrap',
        }}>
          {[
            { key: 'Space', action: 'Flip card to reveal answer' },
            { key: '1', action: 'Rate: Again (forgot)' },
            { key: '2', action: 'Rate: Hard (struggled)' },
            { key: '3', action: 'Rate: Good (got it)' },
            { key: '4', action: 'Rate: Easy (perfect)' },
          ].map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <kbd style={{
                background: 'var(--cue-gray-100)', color: 'var(--cue-gray-700)',
                border: '1px solid var(--cue-border)', borderRadius: 6,
                padding: '4px 10px', fontSize: '0.82rem', fontWeight: 700,
                fontFamily: 'monospace', boxShadow: '0 2px 0 var(--cue-border)',
                whiteSpace: 'nowrap',
              }}>
                {s.key}
              </kbd>
              <span style={{ fontSize: '0.82rem', color: 'var(--cue-gray-600)' }}>{s.action}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* SM-2 explainer */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }}
        style={{
          background: 'linear-gradient(135deg, #f0e6ff 0%, #e6f0ff 100%)',
          border: '1px solid #C4B5FD', borderRadius: 'var(--radius-lg)',
          padding: '20px 24px', marginBottom: 32,
          display: 'flex', gap: 16, alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: '2rem', flexShrink: 0 }}>🧠</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--cue-purple)', fontSize: '0.95rem', marginBottom: 6 }}>
            SM-2 Spaced Repetition Algorithm
          </div>
          <div style={{ fontSize: '0.82rem', color: '#5B4A8A', lineHeight: 1.65 }}>
            Every rating updates the card's <strong>ease factor</strong> and <strong>interval</strong>.
            Easy cards are shown again in weeks. Hard cards come back tomorrow.
            The formula: <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: 4 }}>
              EF' = EF + 0.1 − (5−q) × (0.08 + (5−q) × 0.02)
            </code><br />
            After just a few sessions, the algorithm knows your memory profile and schedules reviews at the exact moment before you'd forget.
          </div>
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.28 }}
        style={{ textAlign: 'center', paddingBottom: 40 }}
      >
        <button
          onClick={onBegin}
          style={{
            background: 'linear-gradient(135deg, var(--cue-orange) 0%, #FF9A6C 100%)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-lg)',
            padding: '16px 48px', fontWeight: 800, fontSize: '1.15rem',
            cursor: 'pointer', boxShadow: '0 6px 24px rgba(255,107,53,0.4)',
            fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(255,107,53,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,107,53,0.4)'; }}
        >
          Begin Session — {stats.dueCount} cards due →
        </button>
        <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--cue-gray-400)' }}>
          Estimated time: ~{Math.ceil(stats.dueCount * 0.5)} minutes
        </div>
      </motion.div>
    </div>
  );
}
