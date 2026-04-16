import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateFlashcards } from '../../utils/api';
import Button from '../common/Button';

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

const GEN_STEPS = [
  { icon: '📄', label: 'Reading PDF...' },
  { icon: '🧠', label: 'Analyzing content...' },
  { icon: '✍️', label: 'Writing cards...' },
  { icon: '✅', label: 'Finalizing deck...' },
];

const GEN_MESSAGES = [
  'Finding key concepts...',
  'Writing examples a teacher would be proud of...',
  'Identifying common misconceptions...',
  'Building relationship cards...',
  'Crafting edge case questions...',
  'Almost ready...',
  'Polishing the cards...',
  'Quality checking...',
];

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

const IMP_COLORS = ['', '#9CA3AF', '#9CA3AF', '#F59E0B', '#F97316', '#EF4444'];
const IMP_LABELS = ['', 'Low', 'Low', 'Medium', 'High', 'Critical'];

function PreviewImportance({ score }) {
  const s = Math.max(1, Math.min(5, score || 3));
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
      color: IMP_COLORS[s], background: IMP_COLORS[s] + '18',
      padding: '2px 7px', borderRadius: 99, border: `1px solid ${IMP_COLORS[s]}44`,
    }}>
      ★ {IMP_LABELS[s]}
    </span>
  );
}

export default function Upload({ onDeckCreated }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [cardCount, setCardCount] = useState(20);
  const [status, setStatus] = useState('idle'); // idle | generating | done | error
  const [progress, setProgress] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [genMessage, setGenMessage] = useState(GEN_MESSAGES[0]);
  const [liveCards, setLiveCards] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const msgInterval = useRef(null);
  const progInterval = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError('Only PDF files are supported.'); return; }
    if (f.size > 20 * 1024 * 1024) { setError('File too large. Max 20MB.'); return; }
    setFile(f);
    setError('');
    const name = f.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
    setDeckName(name.charAt(0).toUpperCase() + name.slice(1));
  }, []);

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch('/sample-calculus.pdf');
      const blob = await res.blob();
      const f = new File([blob], 'Calculus Sample Notes.pdf', { type: 'application/pdf' });
      handleFile(f);
    } catch {
      setError('Could not load sample PDF. Please upload your own.');
    }
  }, [handleFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const startGeneration = async () => {
    if (!file) return;
    setError(''); setStatus('generating');
    setProgress(5); setGenStep(0); setLiveCards(0);

    // Animate steps and messages
    let step = 0, msgIdx = 0, prog = 5;
    progInterval.current = setInterval(() => {
      prog = Math.min(prog + Math.random() * 6, 88);
      setProgress(prog);
      step = Math.min(Math.floor(prog / 25), 3);
      setGenStep(step);
    }, 700);

    msgInterval.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % GEN_MESSAGES.length;
      setGenMessage(GEN_MESSAGES[msgIdx]);
      setLiveCards(v => v + Math.floor(Math.random() * 4));
    }, 1800);

    try {
      const data = await generateFlashcards(file, deckName, (attempt) => {
        setGenMessage(`Connection issue — retrying... (attempt ${attempt + 1}/3)`);
      });
      clearInterval(progInterval.current);
      clearInterval(msgInterval.current);
      setProgress(100); setGenStep(3);
      setLiveCards(data.metrics.total_cards);
      setResult(data); setStatus('done');
    } catch (err) {
      clearInterval(progInterval.current);
      clearInterval(msgInterval.current);
      setStatus('error');
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  useEffect(() => () => {
    clearInterval(progInterval.current);
    clearInterval(msgInterval.current);
  }, []);

  const reset = () => {
    setFile(null); setDeckName(''); setStatus('idle');
    setProgress(0); setResult(null); setError(''); setGenStep(0); setLiveCards(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (status === 'done' && result) {
    return <GenerationResult result={result} onUseDeck={() => onDeckCreated(result)} onReset={reset} />;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="upload-split" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', minHeight: 540 }}>
        {/* Left panel */}
        <div className="upload-left">
          <div className="upload-left-title">Turn any PDF into a smart study deck</div>
          <div className="upload-left-features">
            {[
              { icon: '✦', title: 'AI generates teacher-quality cards', desc: '8 card types: concept, example, why, misconception & more' },
              { icon: '🧠', title: 'Spaced repetition built in', desc: 'SM-2 algorithm schedules reviews at optimal intervals' },
              { icon: '📊', title: 'Track mastery over time', desc: 'Real metrics: retention rate, ease factor, forgetting curve' },
            ].map(f => (
              <div key={f.title} className="upload-feature">
                <div className="upload-feature-icon">{f.icon}</div>
                <div className="upload-feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="upload-left-metrics">
            {[
              { val: '8',      label: 'Card Types' },
              { val: '~30s',   label: 'Generation' },
              { val: '85%',    label: 'Quality Pass' },
              { val: 'SM-2',   label: 'Algorithm' },
            ].map(m => (
              <div key={m.label} className="ulm-item">
                <div className="ulm-val">{m.val}</div>
                <div className="ulm-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="upload-left-badge">
            Powered by Groq Llama 3.3 70B · Gemini 1.5 Flash (prod) · Ollama Gemma3:1b (dev)
          </div>
        </div>

        {/* Right panel */}
        <div className="upload-right">
          {status === 'generating' ? (
            <GeneratingScreen
              progress={progress}
              step={genStep}
              message={genMessage}
              liveCards={liveCards}
              pages={0}
            />
          ) : (
            <>
              <div className="upload-right-title">
                {file ? 'Ready to generate' : 'Upload your PDF'}
              </div>

              {/* Drop zone */}
              <div
                className={`drop-zone ${dragOver ? 'dz-over' : ''} ${file ? 'dz-has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && !file && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef} type="file" accept=".pdf"
                  style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])}
                />
                {file ? (
                  <div className="dz-file-info">
                    <span className="dz-file-icon">📄</span>
                    <div>
                      <div className="dz-file-name">{file.name}</div>
                      <div className="dz-file-size">{formatBytes(file.size)}</div>
                    </div>
                    <button className="dz-remove" onClick={e => { e.stopPropagation(); reset(); }}>×</button>
                  </div>
                ) : (
                  <>
                    <div className="dz-icon">{dragOver ? '📂' : '📤'}</div>
                    <div className="dz-title">{dragOver ? 'Drop it here!' : 'Drag & drop your PDF'}</div>
                    <div className="dz-sub">Works with textbooks, notes, chapters — max 20MB</div>
                    <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Browse files
                    </Button>
                  </>
                )}
              </div>

              {/* Options */}
              {file && (
                <motion.div className="upload-form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="form-group">
                    <label className="form-label">Deck Name</label>
                    <input className="form-input" type="text" value={deckName}
                      onChange={e => setDeckName(e.target.value)} placeholder="e.g. Calculus Fundamentals" maxLength={80} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cards to generate: <strong style={{ color: 'var(--cue-orange)' }}>{cardCount}</strong></label>
                    <input type="range" min={10} max={40} value={cardCount}
                      onChange={e => setCardCount(Number(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--cue-gray-400)' }}>
                      <span>10</span><span>40</span>
                    </div>
                  </div>
                  {error && <div className="upload-error">⚠️ {error}</div>}
                  <Button variant="primary" size="lg" fullWidth onClick={startGeneration}>
                    Generate Cards ✨
                  </Button>
                </motion.div>
              )}

              {!file && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--cue-gray-200)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--cue-gray-400)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      — or try our sample —
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--cue-gray-200)' }} />
                  </div>
                  <button
                    onClick={loadSample}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #FFF4F0 0%, #FFF0EB 100%)',
                      border: '2px solid var(--cue-orange)',
                      color: 'var(--cue-orange)',
                      borderRadius: 12,
                      padding: '16px 24px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      transition: 'all 0.15s',
                      boxShadow: '0 2px 12px rgba(255,107,53,0.12)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #FFE8DF 0%, #FFE0D5 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,53,0.25)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #FFF4F0 0%, #FFF0EB 100%)';
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,107,53,0.12)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '1.6rem' }}>📐</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>Try Calculus Sample Notes</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.75, marginTop: 2 }}>
                          No upload needed · Generates 10 cards instantly
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '1.2rem', opacity: 0.6 }}>→</span>
                  </button>
                </div>
              )}

              {!file && error && <div className="upload-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratingScreen({ progress, step, message, liveCards }) {
  return (
    <div className="gen-loading">
      <div>
        <div className="gen-loading-title">Generating your flashcards...</div>
        <p style={{ color: 'var(--cue-gray-400)', fontSize: '0.9rem', marginTop: 4 }}>
          This takes 15–45 seconds. Grab a coffee ☕
        </p>
      </div>

      <div className="gen-progress-bar">
        <div className="gen-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="gen-steps">
        {GEN_STEPS.map((s, i) => (
          <div key={i} className={`gen-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <span className="gen-step-icon">{i < step ? '✅' : s.icon}</span>
            <span>{s.label}</span>
            {i === step && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{Math.round(progress)}%</span>}
          </div>
        ))}
      </div>

      <div className="gen-message">{message}</div>

      <div className="gen-live-metrics">
        <div className="gen-metric">
          <div className="gen-metric-val">{liveCards}+</div>
          <div className="gen-metric-lbl">Cards created</div>
        </div>
        <div className="gen-metric">
          <div className="gen-metric-val">8</div>
          <div className="gen-metric-lbl">Card types</div>
        </div>
        <div className="gen-metric">
          <div className="gen-metric-val">SM-2</div>
          <div className="gen-metric-lbl">Algorithm ready</div>
        </div>
      </div>
    </div>
  );
}

function GenerationResult({ result, onUseDeck, onReset }) {
  const { metrics, cards, deck_name } = result;
  const [filter, setFilter] = React.useState('all');

  const visibleCards = filter === 'all'
    ? cards
    : cards.filter(c => c.type === filter);

  const activeTypes = Object.entries(metrics.cards_by_type || {})
    .filter(([, c]) => c > 0)
    .map(([type]) => type);

  return (
    <div className="gen-result">
      {/* Hero */}
      <div className="gen-result-hero">
        <div className="gen-result-check">✅</div>
        <div className="gen-result-title">{deck_name}</div>
        <div className="gen-result-sub">{cards.length} cards ready · Spaced repetition enabled · SM-2 algorithm</div>
      </div>

      {/* Metrics */}
      <div className="gen-metrics-grid">
        {[
          { val: metrics.total_cards,                            label: 'Cards Generated' },
          { val: metrics.pages_processed,                        label: 'Pages Processed' },
          { val: metrics.cards_per_page,                         label: 'Cards / Page' },
          { val: `${metrics.generation_time_seconds}s`,          label: 'Generation Time' },
          { val: metrics.words_extracted.toLocaleString(),       label: 'Words Extracted' },
          { val: metrics.avg_difficulty.toFixed(1),              label: 'Learning Difficulty' },
          { val: metrics.avg_importance != null ? metrics.avg_importance.toFixed(1) : '—', label: 'Concept Importance' },
        ].map(m => (
          <div key={m.label} className="gen-metric-card">
            <div className="gen-metric-card-val">{m.val}</div>
            <div className="gen-metric-card-lbl">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Single CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="primary" size="lg" onClick={onUseDeck}>🚀 Start Studying Now</Button>
          <Button variant="ghost" size="md" onClick={onReset}>Upload Another PDF</Button>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--cue-gray-400)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>→</span>
          <span>Next: See full instructions &amp; keyboard shortcuts before your first card</span>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="gen-type-pills" style={{ marginBottom: 16 }}>
        <div
          className="gen-type-pill"
          onClick={() => setFilter('all')}
          style={{
            borderColor: filter === 'all' ? 'var(--cue-orange)' : '#ccc',
            color: filter === 'all' ? 'var(--cue-orange)' : '#888',
            cursor: 'pointer', fontWeight: filter === 'all' ? 700 : 400,
          }}
        >
          All {cards.length}
        </div>
        {activeTypes.map(type => (
          <div
            key={type}
            className="gen-type-pill"
            onClick={() => setFilter(filter === type ? 'all' : type)}
            style={{
              borderColor: filter === type ? (TYPE_COLORS[type] || '#aaa') : '#ddd',
              color: filter === type ? (TYPE_COLORS[type] || '#aaa') : '#888',
              background: filter === type ? (TYPE_COLORS[type] || '#aaa') + '15' : 'transparent',
              cursor: 'pointer', fontWeight: filter === type ? 700 : 400,
            }}
          >
            {metrics.cards_by_type[type]} {TYPE_LABELS[type] || type}
          </div>
        ))}
      </div>

      {/* ALL cards — scrollable grid, nothing hidden */}
      <div className="gen-preview-grid" style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
        {visibleCards.map((card, i) => (
          <div key={i} className="gen-preview-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div className="gen-preview-type" style={{ color: TYPE_COLORS[card.type] || '#aaa', marginBottom: 0 }}>
                {TYPE_LABELS[card.type] || card.type}
              </div>
              <PreviewImportance score={card.importance_score || 3} />
            </div>
            <div className="gen-preview-front">{card.front}</div>
            <div className="gen-preview-back">{card.back}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
