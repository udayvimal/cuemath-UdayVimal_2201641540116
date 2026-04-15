import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Button from '../common/Button';
import {
  computeDeckStats, getRetentionChartData,
  getForgettingCurveData, estimateDaysToMaster,
} from '../../utils/metrics';
import { getCardStatus } from '../../utils/spacedRepetition';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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

const ALL_FILTERS = ['All', 'concept', 'why', 'how', 'example', 'relationship', 'edge_case', 'misconception', 'compare', 'mastered', 'due'];
const FILTER_LABELS = { All: 'All', mastered: 'Mastered ✓', due: 'Due Today ⚡', ...TYPE_LABELS };

function deckEmoji(name) {
  const n = name.toLowerCase();
  if (/calcul|math|algebra|geometry|trigon|statistic|differenti|integr|vector/.test(n)) return '📐';
  if (/physic|mechanic|thermodynam|quantum/.test(n)) return '⚛️';
  if (/chemist|organic|molecule|element/.test(n)) return '🧪';
  if (/biolog|cell|dna|gene|anatomy/.test(n)) return '🔬';
  if (/histor|war|civiliz|ancient/.test(n)) return '📜';
  if (/geograph|country|continent|climate/.test(n)) return '🌍';
  if (/literatur|novel|poem/.test(n)) return '📖';
  if (/computer|program|algorithm|code|software/.test(n)) return '💻';
  if (/econom|finance|business/.test(n)) return '📈';
  return '📚';
}

export default function DeckDetail({ deck, onStartStudy, onBack }) {
  const [filter, setFilter] = useState('All');
  const stats = useMemo(() => computeDeckStats(deck), [deck]);
  const retentionData = useMemo(() => getRetentionChartData(deck.id, 7), [deck.id]);
  const avgInterval = useMemo(
    () => deck.cards.reduce((s, c) => s + (c.sm2?.interval || 1), 0) / Math.max(1, deck.cards.length),
    [deck.cards]
  );
  const forgettingData = useMemo(
    () => getForgettingCurveData(avgInterval, stats.avgEaseFactor),
    [avgInterval, stats.avgEaseFactor]
  );
  const daysToMaster = useMemo(() => estimateDaysToMaster(deck), [deck]);

  const filteredCards = useMemo(() => {
    if (filter === 'All') return deck.cards;
    if (filter === 'mastered') return deck.cards.filter(c => getCardStatus(c.sm2 || {}) === 'mastered');
    if (filter === 'due')      return deck.cards.filter(c => getCardStatus(c.sm2 || {}) === 'due');
    return deck.cards.filter(c => c.type === filter);
  }, [deck.cards, filter]);

  const topicStats = stats.topicStats || [];

  const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
  const item = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>

      {/* Hero */}
      <div className="deck-detail-hero">
        <span className="deck-detail-emoji">{deckEmoji(deck.name)}</span>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="deck-detail-title">{deck.name}</div>
            {deck.generationMetrics && (
              <div className="deck-detail-meta">
                Generated from {deck.generationMetrics.pages_processed} pages &nbsp;·&nbsp;
                {deck.generationMetrics.total_cards} cards &nbsp;·&nbsp;
                {deck.generationMetrics.cards_per_page} cards/page &nbsp;·&nbsp;
                {deck.generationMetrics.generation_time_seconds}s generation time
              </div>
            )}
          </div>
          <div className="deck-detail-actions">
            <Button variant="primary" size="lg" onClick={onStartStudy} disabled={stats.dueCount === 0}>
              {stats.dueCount > 0 ? `Study Now  ${stats.dueCount} due` : 'All caught up ✓'}
            </Button>
            <Button variant="secondary" size="lg" onClick={onStartStudy} disabled={stats.dueCount === 0}>
              Quick Review
            </Button>
          </div>
        </div>
      </div>

      {/* 8 metric boxes */}
      <motion.div className="deck-stats-8" variants={stagger} initial="initial" animate="animate">
        {[
          { val: stats.total,        label: 'Total Cards',   sub: 'in this deck',        color: 'var(--cue-orange)' },
          { val: stats.masteredCount,label: 'Mastered',      sub: 'long-term memory',    color: 'var(--cue-green)' },
          { val: stats.learningCount,label: 'Learning',      sub: 'in progress',          color: 'var(--cue-yellow)' },
          { val: stats.dueCount,     label: 'Due Today',     sub: 'review now',           color: 'var(--cue-red)' },
          {
            val: stats.retentionRate !== null ? `${stats.retentionRate}%` : '—',
            label: 'Review Accuracy', sub: 'correct / total attempts', color: 'var(--cue-purple)',
          },
          {
            val: stats.avgEaseFactor,
            label: 'Avg Ease Factor', sub: 'higher = easier for you', color: 'var(--cue-blue)',
          },
          {
            val: daysToMaster > 0 ? `~${daysToMaster}d` : 'Done!',
            label: 'Est. to Master', sub: 'at 20 cards/day', color: 'var(--cue-purple)',
          },
          {
            val: deck.generationMetrics?.cards_per_page || '—',
            label: 'Cards / Page', sub: 'generation density', color: 'var(--cue-teal)',
          },
        ].map(m => (
          <motion.div key={m.label} className="stat-box" variants={item}>
            <div className="stat-box-value" style={{ color: m.color }}>{m.val}</div>
            <div className="stat-box-label">{m.label}</div>
            <div className="stat-box-sublabel">{m.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="charts-2col">
        <div className="chart-card">
          <div className="chart-title">Review Accuracy — Last 7 Sessions</div>
          {retentionData.length > 0 ? (
            <RetentionChart data={retentionData} />
          ) : (
            <div className="chart-empty">
              Accuracy data appears after your first study session. Start studying to see your progress!
            </div>
          )}
        </div>
        <div className="chart-card">
          <div className="chart-title">Forgetting Curve (Ebbinghaus)</div>
          <ForgettingChart data={forgettingData} />
          <div style={{ fontSize: '0.72rem', color: 'var(--cue-gray-400)', marginTop: 8, textAlign: 'center' }}>
            R(t) = e^(-t/S) — SM-2 fights this curve with optimal review timing
          </div>
        </div>
      </div>

      {/* Topic mastery */}
      {topicStats.length > 0 && (
        <div className="chart-card" style={{ marginBottom: 20 }}>
          <div className="chart-title">Mastery by Topic</div>
          <div className="topic-section">
            {topicStats.map(t => {
              const pctClass = t.percent < 30 ? 'topic-pct-red' : t.percent < 70 ? 'topic-pct-yellow' : 'topic-pct-green';
              const barColor = t.percent < 30 ? 'var(--cue-red)' : t.percent < 70 ? 'var(--cue-yellow)' : 'var(--cue-green)';
              return (
                <div key={t.name} className="topic-row">
                  <div className="topic-name">{t.name}</div>
                  <div className="topic-bar-wrap">
                    <div className="progress-track" style={{ height: 8 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${t.percent}%`, height: '100%', borderRadius: 99,
                          background: barColor, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cue-gray-400)', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {t.mastered}/{t.total}
                    {t.due > 0 && <span style={{ color: 'var(--cue-red)', marginLeft: 6, fontWeight: 700 }}>{t.due} due</span>}
                  </div>
                  <span className={`topic-pct-badge ${pctClass}`}>{t.percent}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card grid with filter */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="section-title">
            All Cards
            <span className="section-count">{filteredCards.length}</span>
          </div>
        </div>

        {/* Filter chips */}
        <div className="card-filter-bar">
          {ALL_FILTERS.filter(f => {
            if (f === 'All') return true;
            if (f === 'mastered') return stats.masteredCount > 0;
            if (f === 'due') return stats.dueCount > 0;
            return deck.cards.some(c => c.type === f);
          }).map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f] || f}
            </button>
          ))}
        </div>

        {filteredCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--cue-gray-400)' }}>
            No cards match this filter.
          </div>
        ) : (
          <motion.div className="card-mini-grid" variants={stagger} initial="initial" animate="animate">
            {filteredCards.map(card => (
              <motion.div key={card.id} variants={item}>
                <CardMini card={card} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CardMini({ card }) {
  const [expanded, setExpanded] = useState(false);
  const status = getCardStatus(card.sm2 || {});
  const statusColors = { new: 'var(--cue-gray-300)', learning: 'var(--cue-yellow)', mastered: 'var(--cue-green)', due: 'var(--cue-red)' };
  const color = TYPE_COLORS[card.type] || '#aaa';

  return (
    <div
      className={`card-mini ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(e => !e)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
    >
      <div className="card-mini-type-badge" style={{ background: color }}>
        {TYPE_LABELS[card.type] || card.type}
      </div>

      <div className={`card-mini-front ${expanded ? 'expanded' : ''}`}>
        {card.front}
      </div>

      {expanded && (
        <>
          <div className="card-mini-divider" />
          <div className="card-mini-back">{card.back}</div>
        </>
      )}

      <div className="card-mini-footer">
        <div className="card-mini-diff">
          {[1,2,3,4,5].map(d => (
            <div key={d} className={`diff-dot ${d <= (card.difficulty || 1) ? 'filled' : ''}`} />
          ))}
        </div>
        <div className="card-mini-status" style={{ background: statusColors[status] || statusColors.new }} title={status} />
      </div>
    </div>
  );
}

function RetentionChart({ data }) {
  const chartData = {
    labels: data.map(d => d.date.slice(5)),
    datasets: [{
      label: 'Accuracy %',
      data: data.map(d => d.accuracy),
      borderColor: '#FF6B35',
      backgroundColor: 'rgba(255,107,53,0.08)',
      fill: true, tension: 0.4, pointRadius: 5,
      pointBackgroundColor: '#FF6B35',
      borderWidth: 2.5,
    }],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: v => `${v}%`, font: { size: 11 } }, grid: { color: '#F0F2F8' } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };
  return <div style={{ height: 180 }}><Line data={chartData} options={opts} /></div>;
}

function ForgettingChart({ data }) {
  const chartData = {
    labels: data.map(d => `Day ${d.day}`),
    datasets: [{
      label: 'Retention %',
      data: data.map(d => d.retention),
      borderColor: '#FF4757',
      backgroundColor: 'rgba(255,71,87,0.07)',
      fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2.5,
    }],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: v => `${v}%`, font: { size: 11 } }, grid: { color: '#F0F2F8' } },
      x: { grid: { display: false }, ticks: { maxTicksLimit: 7, font: { size: 11 } } },
    },
  };
  return <div style={{ height: 180 }}><Line data={chartData} options={opts} /></div>;
}
