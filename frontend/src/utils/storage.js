/**
 * Storage utilities — all deck and progress data lives in localStorage.
 *
 * Why localStorage and not a database?
 * - Zero infrastructure cost
 * - Instant reads (no network round trips)
 * - Works offline
 * - Sufficient for a competition demo
 * - SM-2 state is per-user anyway — server sync would need auth
 *
 * Data shape in localStorage:
 * Key: "flashcard_decks"
 * Value: JSON array of Deck objects
 *
 * Deck shape:
 * {
 *   id: string (UUID),
 *   name: string,
 *   createdAt: ISO string,
 *   lastStudied: ISO string | null,
 *   cards: Card[],
 *   generationMetrics: GenerationMetrics | null,
 * }
 *
 * Card shape:
 * {
 *   id: string (UUID),
 *   front: string,
 *   back: string,
 *   type: CardType,
 *   difficulty: number (1-5),
 *   topic: string,
 *   sm2: SM2State,  // from spacedRepetition.js initCardState()
 * }
 *
 * Study history in localStorage:
 * Key: "flashcard_study_history"
 * Value: JSON array of SessionRecord objects
 * {
 *   date: YYYY-MM-DD,
 *   deckId: string,
 *   cardsReviewed: number,
 *   correctCount: number,
 *   sessionDurationSeconds: number,
 * }
 */

const DECKS_KEY = 'flashcard_decks';
const HISTORY_KEY = 'flashcard_study_history';
const SETTINGS_KEY = 'flashcard_settings';

// ─── Decks ────────────────────────────────────────────────────────────────

export function getAllDecks() {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDeckById(id) {
  const decks = getAllDecks();
  return decks.find(d => d.id === id) || null;
}

export function saveDeck(deck) {
  const decks = getAllDecks();
  const idx = decks.findIndex(d => d.id === deck.id);
  if (idx >= 0) {
    decks[idx] = deck;
  } else {
    decks.unshift(deck); // New decks go to the front
  }
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded — deck not saved');
      return false;
    }
    throw e;
  }
}

export function deleteDeck(id) {
  const decks = getAllDecks().filter(d => d.id !== id);
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function updateCardInDeck(deckId, cardId, updatedSm2State) {
  const deck = getDeckById(deckId);
  if (!deck) return;

  deck.cards = deck.cards.map(card =>
    card.id === cardId ? { ...card, sm2: updatedSm2State } : card
  );
  deck.lastStudied = new Date().toISOString();
  saveDeck(deck);
}

// ─── Study History ────────────────────────────────────────────────────────

export function getStudyHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordStudySession(sessionRecord) {
  const history = getStudyHistory();
  history.unshift(sessionRecord);
  // Keep last 365 days of history
  const trimmed = history.slice(0, 365);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

// ─── Settings ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  darkMode: false,
  maxCardsPerSession: 20,
  showCardType: true,
  soundEnabled: false,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Generate a simple UUID v4 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/** Format bytes to human-readable string */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Get total localStorage usage in bytes */
export function getStorageUsage() {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    total += (localStorage.getItem(key) || '').length * 2; // UTF-16 = 2 bytes per char
  }
  return total;
}
