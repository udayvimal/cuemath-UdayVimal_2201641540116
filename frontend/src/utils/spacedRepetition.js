/**
 * SM-2 Spaced Repetition Algorithm — Hand-coded from scratch.
 *
 * Based on the SuperMemo-2 algorithm by Piotr Wozniak (1987).
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * The fundamental insight: memory retention follows a forgetting curve (Ebbinghaus, 1885).
 * By reviewing information just as you're about to forget it, each review
 * strengthens the memory trace more efficiently than massed practice.
 *
 * Core variables per card:
 *   n           - repetition count (how many times reviewed successfully)
 *   easeFactor  - "E-Factor": how easy this card is for THIS user (starts at 2.5)
 *   interval    - days until next review
 *   nextReview  - ISO date string of next scheduled review
 */

// Rating scale (shown as buttons in study session)
export const RATINGS = {
  AGAIN: 1,  // Complete blackout — didn't know it
  HARD: 2,   // Incorrect with serious difficulty
  GOOD: 3,   // Correct with effort
  EASY: 4,   // Perfect recall, effortless
};

// Starting ease factor — cards begin at 2.5 (average difficulty)
const INITIAL_EASE_FACTOR = 2.5;

// Ease factor bounds — prevent cards from becoming impossibly hard or trivially easy
const MIN_EASE_FACTOR = 1.3;  // Never below 1.3 — prevents interval collapse
const MAX_EASE_FACTOR = 4.0;  // Practical upper bound

/**
 * Initialize SM-2 state for a brand new card.
 * Called once when a card is first added to a deck.
 */
export function initCardState() {
  return {
    repetitions: 0,         // n: number of successful repetitions
    easeFactor: INITIAL_EASE_FACTOR,
    interval: 1,            // days until next review (starts at 1)
    nextReview: today(),    // due today immediately
    lastReview: null,       // ISO string of last review date
    totalReviews: 0,        // for metrics: total review attempts
    correctReviews: 0,      // for metrics: correct attempts (rating >= GOOD)
    history: [],            // [{date, rating, interval}, ...] for forgetting curve
  };
}

/**
 * Apply SM-2 algorithm after a review.
 *
 * SM-2 formulas:
 *
 * For rating >= GOOD (correct recall):
 *   if n == 0: I(1) = 1
 *   if n == 1: I(2) = 6
 *   if n > 1:  I(n+1) = I(n) * EF
 *   EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *
 * For rating < GOOD (incorrect):
 *   Reset n to 0, interval to 1
 *   EF is unchanged (only reduces on quality < 3, but not to below 1.3)
 *
 * Where:
 *   q   = quality of response (our rating 1-4, mapped to SM-2's 0-5 scale)
 *   EF  = ease factor
 *   I(n) = interval after n-th repetition
 *
 * @param {Object} cardState - current SM-2 state of the card
 * @param {number} rating - user's rating (1=AGAIN, 2=HARD, 3=GOOD, 4=EASY)
 * @returns {Object} updated SM-2 state
 */
export function applyReview(cardState, rating) {
  const state = { ...cardState };
  const now = today();

  // Map our 1-4 scale to SM-2's quality scale (0-5)
  // SM-2 uses: 0-1 = blackout, 2 = incorrect but recognized, 3-5 = correct with varying ease
  const qualityMap = {
    [RATINGS.AGAIN]: 1,  // SM-2 quality 1: blackout
    [RATINGS.HARD]: 3,   // SM-2 quality 3: correct with serious difficulty
    [RATINGS.GOOD]: 4,   // SM-2 quality 4: correct after hesitation
    [RATINGS.EASY]: 5,   // SM-2 quality 5: perfect recall
  };
  const q = qualityMap[rating] || 3;

  // Update review counts (for metrics)
  state.totalReviews = (state.totalReviews || 0) + 1;
  if (rating >= RATINGS.GOOD) {
    state.correctReviews = (state.correctReviews || 0) + 1;
  }

  // Record review in history (for forgetting curve visualization)
  state.history = [
    ...(state.history || []),
    { date: now, rating, interval: state.interval, quality: q }
  ].slice(-50); // Keep last 50 reviews per card

  state.lastReview = now;

  if (rating === RATINGS.AGAIN) {
    // Incorrect response: reset to beginning of learning phase
    // DO NOT reduce easeFactor here — SM-2 only reduces EF on quality < 3 CORRECT responses
    state.repetitions = 0;
    state.interval = 1;  // Review again tomorrow
    // Ease factor adjustment for poor performance (SM-2 spec)
    // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    state.easeFactor = Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, state.easeFactor + efDelta));
  } else {
    // Correct response (HARD, GOOD, or EASY)
    // Step 1: Calculate new interval
    if (state.repetitions === 0) {
      state.interval = 1;         // First successful review: review tomorrow
    } else if (state.repetitions === 1) {
      state.interval = 6;         // Second successful review: review in 6 days
    } else {
      // Subsequent reviews: multiply by ease factor
      // I(n+1) = I(n) * EF
      state.interval = Math.round(state.interval * state.easeFactor);
    }

    // Step 2: Update ease factor
    // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    // This formula:
    //   - Increases EF when quality is 5 (easy): +0.1
    //   - Leaves EF unchanged when quality is 4 (good): 0
    //   - Decreases EF when quality is 3 (hard): -0.14
    const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    state.easeFactor = Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, state.easeFactor + efDelta));

    // Step 3: Increment repetition count
    state.repetitions += 1;
  }

  // Calculate next review date
  state.nextReview = addDays(today(), state.interval);

  return state;
}

/**
 * Check if a card is due for review today.
 * A card is due if its nextReview date is today or in the past.
 */
export function isDue(cardState) {
  if (!cardState.nextReview) return true;
  return cardState.nextReview <= today();
}

/**
 * Determine the mastery status of a card.
 *
 * States:
 *   "new"      - never reviewed (repetitions === 0, no lastReview)
 *   "learning" - reviewed but not yet mastered (repetitions < 3 OR easeFactor < 2.0)
 *   "mastered" - reviewed 3+ times with good ease factor (repetitions >= 3 AND EF >= 2.0)
 *   "due"      - any status but the card is due today
 */
export function getCardStatus(cardState) {
  if (!cardState.lastReview) return 'new';
  if (isDue(cardState)) return 'due';
  if (cardState.repetitions >= 3 && cardState.easeFactor >= 2.0) return 'mastered';
  return 'learning';
}

/**
 * Compute the theoretical retention percentage for a card
 * based on Ebbinghaus forgetting curve: R = e^(-t/S)
 *
 * Where:
 *   R = retention (0-1)
 *   t = time since last review (days)
 *   S = memory strength (approximated by interval × easeFactor)
 *
 * This is a simplified model — SM-2 doesn't use this directly,
 * but it's useful for visualization.
 */
export function estimateRetention(cardState) {
  if (!cardState.lastReview) return 1.0; // Assume 100% for new cards

  const daysSinceReview = daysBetween(cardState.lastReview, today());
  // Memory strength: higher interval and ease = stronger memory
  const memoryStrength = Math.max(1, cardState.interval * (cardState.easeFactor / 2.5));
  const retention = Math.exp(-daysSinceReview / memoryStrength);
  return Math.max(0, Math.min(1, retention));
}

// ─── Date utilities ────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD string (local timezone) */
export function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/** Returns a date N days from the given date as YYYY-MM-DD string */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns number of days between two YYYY-MM-DD date strings */
function daysBetween(from, to) {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
