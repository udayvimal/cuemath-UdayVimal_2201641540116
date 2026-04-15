import React from 'react';
import { getSettings, saveSettings } from '../../utils/storage';

export default function Settings({ onBack }) {
  const [settings, setSettings] = React.useState(getSettings);

  const update = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <div className="settings-page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="settings-title">Settings</div>

      <div className="settings-group">
        <SettingsRow label="Dark Mode" desc="Switch to a dark colour theme">
          <Toggle checked={settings.darkMode} onChange={v => update('darkMode', v)} />
        </SettingsRow>
        <SettingsRow label="Max Cards per Session" desc="Limit how many cards to review per study session">
          <select
            className="settings-select"
            value={settings.maxCardsPerSession}
            onChange={e => update('maxCardsPerSession', Number(e.target.value))}
          >
            {[10, 15, 20, 30, 50].map(n => <option key={n} value={n}>{n} cards</option>)}
          </select>
        </SettingsRow>
        <SettingsRow label="Show Card Type" desc="Display the card type badge during study sessions">
          <Toggle checked={settings.showCardType} onChange={v => update('showCardType', v)} />
        </SettingsRow>
        <SettingsRow label="Sound Effects" desc="Play a subtle flip sound when reviewing cards">
          <Toggle checked={settings.soundEnabled} onChange={v => update('soundEnabled', v)} />
        </SettingsRow>
      </div>

      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--cue-gray-400)', marginBottom: 10 }}>
        About
      </div>
      <div className="settings-group">
        <div style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--cue-gray-500)', lineHeight: 1.8 }}>
          <p><strong style={{ color: 'var(--cue-orange)' }}>Cuemath Assistant</strong> v1.0.0</p>
          <p>Cuemath AI Builder Challenge 2026 · Problem 1: The Flashcard Engine</p>
          <p>Built by <strong>Uday Vimal</strong></p>
          <br />
          <p>Uses the <strong>SM-2</strong> spaced repetition algorithm by Piotr Wozniak (1987), implemented from scratch in JavaScript. All progress stored locally in your browser — no account required.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ label, desc, children }) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-label">{label}</div>
        <div className="settings-desc">{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch" aria-checked={checked}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
