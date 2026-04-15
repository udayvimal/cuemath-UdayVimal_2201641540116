import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import EmptyState from '../common/EmptyState';
import Button from '../common/Button';
import { computeGlobalStats, computeDeckStats, computeStreak, computeWeakAreas, computeUpcomingDue } from '../../utils/metrics';

// Auto-detect deck emoji from name
function deckEmoji(name) {
  const n = name.toLowerCase();
  if (/calcul|math|algebra|geometry|trigon|statistic|probabilit|differenti|integr|vector/.test(n)) return '📐';
  if (/physic|mechanic|thermodynam|electro|quantum|optic/.test(n)) return '⚛️';
  if (/chemist|organic|molecule|reaction|element|periodic/.test(n)) return '🧪';
  if (/biolog|cell|dna|gene|evolution|ecology|anatomy|physiol/.test(n)) return '🔬';
  if (/histor|war|civiliz|ancient|modern|revolution/.test(n)) return '📜';
  if (/geograph|country|continent|climate|map/.test(n)) return '🌍';
  if (/literatur|novel|poem|shakespear|author|fiction/.test(n)) return '📖';
  if (/computer|program|algorithm|code|software|data/.test(n)) return '💻';
  if (/econom|finance|market|business|trade/.test(n)) return '📈';
  if (/philosoph|logic|ethics|critical/.test(n)) return '🤔';
  if (/language|grammar|vocabular|english|spanish|french/.test(n)) return '🗣️';
  return '📚';
}

// Count-up animation hook
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    startRef.current = performance.now();
    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target, duration]);

  return value;
}

function CountUp({ value, suffix = '' }) {
  const animated = useCountUp(value);
  return <>{animated}{suffix}</>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning, ready to study?', icon: '☀️' };
  if (h < 17) return { text: 'Good afternoon! Time for a review?', icon: '📚' };
  return { text: 'Good evening! End the day strong', icon: '🌙' };
}

function formatRelDate(iso) {
  if (!iso) return 'Never studied';
  const d = new Date(iso), now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return 'Studied today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

export default function Dashboard({ decks, onUpload, onDeckSelect, onDeleteDeck, showAllDecks }) {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const greeting = useMemo(() => getGreeting(), []);
  const globalStats = useMemo(() => computeGlobalStats(decks), [decks]);
  const streak = useMemo(() => computeStreak(), []);

  const topDueDeck = useMemo(() => {
    return decks
      .map(d => ({ deck: d, stats: computeDeckStats(d) }))
      .filter(({ stats }) => stats.dueCount > 0)
      .sort((a, b) => b.stats.dueCount - a.stats.dueCount)[0] || null;
  }, [decks]);

  const recentDecks = useMemo(() => decks.slice(0, 4), [decks]);
  const weakAreas   = useMemo(() => computeWeakAreas(decks), [decks]);
  const upcoming    = useMemo(() => computeUpcomingDue(decks), [decks]);

  const filtered = useMemo(() => {
    if (!search.trim()) return decks;
    return decks.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  }, [decks, search]);

  const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
  const item = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <div>
      {/* Competition banner */}
      <div className="comp-banner">
        <div className="comp-banner-left">
          <div className="comp-banner-trophy">🏆</div>
          <div>
            <div className="comp-banner-title">Cuemath AI Builder Challenge 2026</div>
            <div className="comp-banner-sub">Problem 1: The Flashcard Engine · Built by Uday Vimal</div>
          </div>
        </div>
        <div className="comp-banner-badge">SM-2 Spaced Repetition</div>
      </div>

      {/* Greeting + streak */}
      <div className="greeting-row">
        <div className="greeting-text">
          <h2>{greeting.text} {greeting.icon}</h2>
          <p style={{ marginBottom: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          {/* Micro delight */}
          <p style={{ fontSize: '0.8rem', color: 'var(--cue-orange)', fontStyle: 'italic', margin: 0, opacity: 0.85 }}>
            Ready to practice smarter, not harder ✦
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {/* Next review insight */}
          {decks.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--cue-gray-500)', textAlign: 'right', lineHeight: 1.5 }}>
              <span style={{ color: upcoming.dueToday > 0 ? 'var(--cue-red)' : 'var(--cue-green)', fontWeight: 600 }}>
                {upcoming.dueToday > 0 ? `⚡ ${upcoming.dueToday} due today` : '✓ All caught up today'}
              </span>
              {upcoming.dueTomorrow > 0 && (
                <span style={{ color: 'var(--cue-gray-400)' }}> · {upcoming.dueTomorrow} tomorrow</span>
              )}
            </div>
          )}
          {streak > 0 && (
            <div className="streak-badge">
              <span>🔥</span>
              <div>
                <div className="streak-count">{streak}</div>
                <div className="streak-label">day streak</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glassmorphism stats row */}
      <motion.div className="stats-row" variants={stagger} initial="initial" animate="animate">
        {[
          { icon: '📚', val: globalStats.totalCards,   label: 'Total Cards',  cls: 'glass-stat-border-orange', color: 'stat-orange' },
          { icon: '✅', val: globalStats.totalMastered, label: 'Mastered',     cls: 'glass-stat-border-green',  color: 'stat-green' },
          { icon: '🔄', val: globalStats.totalLearning, label: 'Learning',     cls: 'glass-stat-border-yellow', color: 'stat-yellow' },
          { icon: '⚡', val: globalStats.totalDue,      label: 'Due Today',    cls: 'glass-stat-border-red',    color: 'stat-red' },
          { icon: '🔥', val: streak,                   label: 'Day Streak',   cls: 'glass-stat-border-purple', color: 'stat-purple' },
        ].map(s => (
          <motion.div key={s.label} className={`glass-stat ${s.cls}`} variants={item}>
            <div className="glass-stat-icon">{s.icon}</div>
            <div className={`glass-stat-value ${s.color}`}>
              <CountUp value={s.val} />
            </div>
            <div className="glass-stat-label">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Weak areas insight */}
      {weakAreas.length > 0 && (
        <div style={{
          background: 'var(--cue-surface)', border: '1px solid #FED7AA',
          borderRadius: 'var(--radius-lg)', padding: '10px 16px',
          marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: '6px 24px',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B45309', flexShrink: 0 }}>
            ⚠️ Needs work
          </span>
          {weakAreas.map(w => (
            <span key={w.topic} style={{ fontSize: '0.75rem', color: 'var(--cue-gray-600)' }}>
              <strong style={{ color: 'var(--cue-gray-800)' }}>{w.topic}</strong>
              <span style={{ color: 'var(--cue-gray-400)', marginLeft: 4 }}>
                (ease {w.avgEF} · {w.deckName})
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Two-column: Continue + Recent Decks */}
      {decks.length > 0 && !showAllDecks && (
        <div className="dashboard-cols">
          {/* Continue studying */}
          <div className="dash-col-card">
            <div className="dash-col-title">Continue Studying</div>
            {topDueDeck ? (
              <>
                <div className="mini-deck-emoji" style={{ fontSize: '1.5rem', marginBottom: 6 }}>
                  {deckEmoji(topDueDeck.deck.name)}
                </div>
                <div className="continue-deck-name">{topDueDeck.deck.name}</div>
                <div className="continue-deck-meta">
                  {topDueDeck.stats.dueCount} cards due · {topDueDeck.stats.masteryPercent}% mastered
                </div>
                <div className="continue-progress-row">
                  <span>Progress</span>
                  <span>{topDueDeck.stats.masteredCount}/{topDueDeck.stats.total}</span>
                </div>
                <ProgressBar percent={topDueDeck.stats.masteryPercent} color="orange" height={8} animated />
                <div style={{ marginTop: 16 }}>
                  <Button variant="primary" size="md" fullWidth onClick={() => onDeckSelect(topDueDeck.deck.id)}>
                    Resume → {topDueDeck.stats.dueCount} cards
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--cue-gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                All caught up! 🎉<br />
                <span style={{ fontSize: '0.8rem' }}>No cards due right now.</span>
              </div>
            )}
          </div>

          {/* Recent decks 2x2 */}
          <div className="dash-col-card">
            <div className="dash-col-title">Recent Decks</div>
            {recentDecks.length === 0 ? (
              <div style={{ color: 'var(--cue-gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                No decks yet. Upload a PDF to get started!
              </div>
            ) : (
              <>
                <div className="mini-deck-grid">
                  {recentDecks.map(deck => {
                    const s = computeDeckStats(deck);
                    return (
                      <div key={deck.id} className="mini-deck-card" onClick={() => onDeckSelect(deck.id)}>
                        <div className="mini-deck-top">
                          <div className="mini-deck-emoji">{deckEmoji(deck.name)}</div>
                          <div className="mini-deck-name">{deck.name}</div>
                        </div>
                        <div className="mini-deck-bottom">
                          <span className="mini-deck-due">{s.dueCount > 0 ? `${s.dueCount} due` : 'Up to date ✓'}</span>
                          <span className="mini-deck-study">Study →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {decks.length > 4 && (
                  <div className="view-all-link" onClick={() => onDeckSelect && null}>
                    View all {decks.length} decks →
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Full decks grid */}
      <div>
        <div className="section-header">
          <div className="section-title">
            {showAllDecks ? 'All Decks' : 'Your Decks'}
            {decks.length > 0 && <span className="section-count">{decks.length}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {decks.length > 0 && (
              <input
                className="search-input"
                type="search"
                placeholder="Search decks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            )}
            <Button variant="primary" size="md" onClick={onUpload}>+ New Deck</Button>
          </div>
        </div>

        {decks.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Your journey starts here"
            description="Upload any PDF — textbook, notes, or article — and get a smart flashcard deck with spaced repetition scheduling."
            action={<Button variant="primary" size="lg" onClick={onUpload}>Upload your first PDF</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🔍" title="No decks match" description={`Nothing found for "${search}"`} />
        ) : (
          <motion.div className="decks-grid" variants={stagger} initial="initial" animate="animate">
            {filtered.map(deck => (
              <motion.div key={deck.id} variants={item}>
                <DeckCard
                  deck={deck}
                  onSelect={() => onDeckSelect(deck.id)}
                  isDeleting={deletingId === deck.id}
                  onDeleteRequest={() => setDeletingId(deck.id)}
                  onDeleteConfirm={() => { onDeleteDeck(deck.id); setDeletingId(null); }}
                  onDeleteCancel={() => setDeletingId(null)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DeckCard({ deck, onSelect, isDeleting, onDeleteRequest, onDeleteConfirm, onDeleteCancel }) {
  const stats = useMemo(() => computeDeckStats(deck), [deck]);

  if (isDeleting) {
    return (
      <div className="deck-card">
        <div className="deck-confirm-delete">
          <p>Delete <strong>{deck.name}</strong>?</p>
          <p className="deck-confirm-warning">All progress will be lost. This cannot be undone.</p>
          <div className="deck-confirm-actions">
            <Button variant="danger" size="sm" onClick={onDeleteConfirm}>Delete</Button>
            <Button variant="ghost" size="sm" onClick={onDeleteCancel}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-card">
      <div className="deck-card-top" onClick={onSelect}>
        <span className="deck-emoji">{deckEmoji(deck.name)}</span>
        <div className="deck-name">{deck.name}</div>
        <div className="deck-meta">
          {stats.total} cards ·{' '}
          <span style={{ color: stats.dueCount > 0 ? 'var(--cue-red)' : 'var(--cue-green)', fontWeight: 600 }}>
            {stats.dueCount > 0 ? `${stats.dueCount} due` : 'All caught up ✓'}
          </span>
        </div>
      </div>
      <div className="deck-card-body" onClick={onSelect}>
        <div className="deck-mini-stats">
          {[
            { val: stats.masteredCount, lbl: 'Mastered', color: 'var(--cue-green)' },
            { val: stats.learningCount, lbl: 'Learning', color: 'var(--cue-yellow)' },
            { val: stats.newCount,      lbl: 'New',      color: 'var(--cue-gray-400)' },
            { val: stats.dueCount,      lbl: 'Due',      color: 'var(--cue-red)' },
          ].map(s => (
            <div key={s.lbl} className="dms">
              <span className="dms-val" style={{ color: s.color }}>{s.val}</span>
              <span className="dms-lbl">{s.lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 4 }}>
          <ProgressBar percent={stats.masteryPercent} color="green" height={6} animated />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--cue-gray-400)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{stats.masteryPercent}% mastered</span>
          <span>{formatRelDate(deck.lastStudied)}</span>
        </div>
      </div>
      <div className="deck-card-footer">
        <Button
          variant="primary" size="sm"
          onClick={onSelect}
          disabled={stats.dueCount === 0}
        >
          {stats.dueCount > 0 ? `Study (${stats.dueCount})` : 'Up to date'}
        </Button>
        <button className="deck-delete" onClick={e => { e.stopPropagation(); onDeleteRequest(); }}>🗑</button>
      </div>
    </div>
  );
}

function ProgressBar({ percent, color, height }) {
  const colors = {
    orange: 'linear-gradient(90deg, var(--cue-orange), #FF9A6C)',
    green:  'linear-gradient(90deg, var(--cue-green), #00E4A8)',
    purple: 'linear-gradient(90deg, var(--cue-purple), #9B7EFF)',
  };
  return (
    <div className="progress-track" style={{ height }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, percent || 0))}%`,
        background: colors[color] || colors.orange,
        transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%', borderRadius: 99,
      }} />
    </div>
  );
}

