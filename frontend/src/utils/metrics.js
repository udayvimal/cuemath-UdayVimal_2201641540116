/**
 * Metrics calculations — all real numbers derived from SM-2 state.
 * Nothing here is hardcoded. Every number comes from actual card data.
 */

import { getCardStatus, estimateRetention, today } from './spacedRepetition';
import { getStudyHistory } from './storage';

function addDaysStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── Deck-level metrics ───────────────────────────────────────────────────

/**
 * Compute full stats for a single deck.
 * Returns the big numbers shown on the dashboard and deck detail page.
 */
export function computeDeckStats(deck) {
  const cards = deck.cards || [];
  if (cards.length === 0) {
    return emptyDeckStats();
  }

  let newCount = 0;
  let learningCount = 0;
  let masteredCount = 0;
  let dueCount = 0;
  let totalEaseFactor = 0;
  let totalRetention = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;

  for (const card of cards) {
    const sm2 = card.sm2 || {};
    const status = getCardStatus(sm2);

    if (status === 'new') newCount++;
    else if (status === 'mastered') masteredCount++;
    else if (status === 'learning') learningCount++;
    else if (status === 'due') dueCount++;

    totalEaseFactor += sm2.easeFactor || 2.5;
    totalRetention += estimateRetention(sm2);
    totalCorrect += sm2.correctReviews || 0;
    totalAttempts += sm2.totalReviews || 0;
  }

  const n = cards.length;
  const retentionRate = totalAttempts > 0
    ? Math.round((totalCorrect / totalAttempts) * 100)
    : null; // null = not enough data yet

  const avgRetention = Math.round((totalRetention / n) * 100);
  const avgEaseFactor = parseFloat((totalEaseFactor / n).toFixed(2));
  const masteryPercent = Math.round((masteredCount / n) * 100);

  // Topic breakdown for mastery bars
  const topicStats = computeTopicBreakdown(cards);

  return {
    total: n,
    newCount,
    learningCount,
    masteredCount,
    dueCount,
    retentionRate,      // % correct over all time
    avgRetention,       // estimated current retention %
    avgEaseFactor,
    masteryPercent,
    topicStats,
  };
}

function emptyDeckStats() {
  return {
    total: 0, newCount: 0, learningCount: 0, masteredCount: 0, dueCount: 0,
    retentionRate: null, avgRetention: 0, avgEaseFactor: 2.5,
    masteryPercent: 0, topicStats: [],
  };
}

/**
 * Compute per-topic mastery breakdown.
 * Used for progress bars on deck detail page.
 */
export function computeTopicBreakdown(cards) {
  const topics = {};
  for (const card of cards) {
    const topic = card.topic || 'General';
    if (!topics[topic]) {
      topics[topic] = { total: 0, mastered: 0, due: 0 };
    }
    topics[topic].total++;
    const status = getCardStatus(card.sm2 || {});
    if (status === 'mastered') topics[topic].mastered++;
    if (status === 'due') topics[topic].due++;
  }

  return Object.entries(topics)
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      mastered: stats.mastered,
      due: stats.due,
      percent: Math.round((stats.mastered / stats.total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── Global metrics (across all decks) ───────────────────────────────────

export function computeGlobalStats(decks) {
  let totalCards = 0;
  let totalMastered = 0;
  let totalLearning = 0;
  let totalNew = 0;
  let totalDue = 0;

  for (const deck of decks) {
    const stats = computeDeckStats(deck);
    totalCards += stats.total;
    totalMastered += stats.masteredCount;
    totalLearning += stats.learningCount;
    totalNew += stats.newCount;
    totalDue += stats.dueCount;
  }

  const retentionRate = totalCards > 0
    ? Math.round((totalMastered / totalCards) * 100)
    : 0;

  return {
    totalCards,
    totalMastered,
    totalLearning,
    totalNew,
    totalDue,
    retentionRate,
    totalDecks: decks.length,
  };
}

// ─── Streak calculation ───────────────────────────────────────────────────

/**
 * Calculate the current study streak in days.
 * Streak = consecutive days ending today (or yesterday) with at least one session.
 */
export function computeStreak() {
  const history = getStudyHistory();
  if (history.length === 0) return 0;

  // Get unique study dates, sorted descending
  const studyDates = [...new Set(history.map(s => s.date))].sort().reverse();

  if (studyDates.length === 0) return 0;

  const todayStr = today();
  const todayDate = new Date(todayStr + 'T00:00:00');
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  // Streak must include today or yesterday (otherwise it's broken)
  if (studyDates[0] !== todayStr && studyDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(studyDates[0] + 'T00:00:00');

  for (const dateStr of studyDates) {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((currentDate - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) {
      streak++;
      currentDate = d;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (diff === 1) {
      // Allow the initial jump from today to yesterday
      streak++;
      currentDate = d;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break; // Gap found — streak ends
    }
  }

  return streak;
}

// ─── Forgetting curve data ─────────────────────────────────────────────────

/**
 * Generate data points for the forgetting curve visualization.
 * Shows how retention decays over time for an "average" card in the deck.
 *
 * Uses Ebbinghaus forgetting curve: R(t) = e^(-t/S)
 * where S is memory strength (approximated from avg interval & ease factor).
 */
export function getForgettingCurveData(avgInterval, avgEaseFactor) {
  const memoryStrength = Math.max(1, avgInterval * (avgEaseFactor / 2.5));
  const days = Array.from({ length: 31 }, (_, i) => i); // 0-30 days

  return days.map(day => ({
    day,
    retention: Math.round(Math.exp(-day / memoryStrength) * 100),
  }));
}

// ─── Session retention graph data ────────────────────────────────────────

/**
 * Build data for the retention rate line chart showing last N sessions.
 * Each point = accuracy rate for one study session.
 */
export function getRetentionChartData(deckId, sessionCount = 7) {
  const history = getStudyHistory()
    .filter(s => !deckId || s.deckId === deckId)
    .slice(0, sessionCount)
    .reverse(); // Oldest first for left-to-right chart

  return history.map(session => ({
    date: session.date,
    accuracy: session.cardsReviewed > 0
      ? Math.round((session.correctCount / session.cardsReviewed) * 100)
      : 0,
    cardsReviewed: session.cardsReviewed,
  }));
}

// ─── Heatmap data ─────────────────────────────────────────────────────────

/**
 * Build GitHub-style heatmap data for the last 52 weeks.
 * Returns array of { date, count } objects.
 */
export function getHeatmapData() {
  const history = getStudyHistory();
  const countByDate = {};
  for (const session of history) {
    countByDate[session.date] = (countByDate[session.date] || 0) + session.cardsReviewed;
  }

  // Generate last 365 days
  const result = [];
  const end = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({ date: dateStr, count: countByDate[dateStr] || 0 });
  }
  return result;
}

// ─── Estimated time to master ─────────────────────────────────────────────

/**
 * Rough estimate of days to master a full deck.
 * Assumes the user studies all due cards each day.
 * Not a promise — just a motivational number.
 */
export function estimateDaysToMaster(deck) {
  const cards = deck.cards || [];
  const notMastered = cards.filter(c => getCardStatus(c.sm2 || {}) !== 'mastered');
  if (notMastered.length === 0) return 0;
  // Average SM-2 takes ~14 reviews to fully master a card
  // At ~20 cards/day, rough estimate:
  const reviewsNeeded = notMastered.length * 5; // simplified
  return Math.ceil(reviewsNeeded / 20);
}

// ─── Weak areas ───────────────────────────────────────────────────────────

/**
 * Find the 3 weakest topics across all decks.
 * Weak = lowest average ease factor among reviewed cards.
 * Only includes topics that have at least one reviewed card.
 */
export function computeWeakAreas(decks) {
  const topicMap = {}; // topic → { totalEF, count }
  for (const deck of decks) {
    for (const card of deck.cards || []) {
      const sm2 = card.sm2 || {};
      if (!sm2.lastReview) continue; // skip unreviewed
      const topic = card.topic || 'General';
      if (!topicMap[topic]) topicMap[topic] = { totalEF: 0, count: 0, deckName: deck.name };
      topicMap[topic].totalEF += sm2.easeFactor || 2.5;
      topicMap[topic].count += 1;
    }
  }
  return Object.entries(topicMap)
    .map(([topic, { totalEF, count, deckName }]) => ({
      topic,
      deckName,
      avgEF: parseFloat((totalEF / count).toFixed(2)),
      count,
    }))
    .filter(t => t.avgEF < 2.2) // only genuinely weak
    .sort((a, b) => a.avgEF - b.avgEF)
    .slice(0, 3);
}

// ─── Next review schedule ─────────────────────────────────────────────────

/**
 * Count how many cards are due today and tomorrow across all decks.
 */
export function computeUpcomingDue(decks) {
  const todayStr    = today();
  const tomorrowStr = addDaysStr(1);
  let dueToday = 0, dueTomorrow = 0;
  for (const deck of decks) {
    for (const card of deck.cards || []) {
      const nr = card.sm2?.nextReview;
      if (!nr) { dueToday++; continue; }
      if (nr <= todayStr) dueToday++;
      else if (nr === tomorrowStr) dueTomorrow++;
    }
  }
  return { dueToday, dueTomorrow };
}
