/**
 * useStudySession — manages all state for an active study session.
 *
 * Session flow:
 * 1. Filter due cards from deck (sorted by due date, then difficulty)
 * 2. Show cards one at a time
 * 3. After user rates card: apply SM-2, persist, move to next
 * 4. When all cards reviewed: return session summary
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { isDue, applyReview } from '../utils/spacedRepetition';
import { recordStudySession } from '../utils/storage';
import { today } from '../utils/spacedRepetition';

export function useStudySession(deck, maxCards, onCardUpdate) {
  const [sessionCards, setSessionCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsReviewed: 0,
    correctCount: 0,
    againCount: 0,
    startTime: null,
    endTime: null,
    ratings: [], // [{cardId, rating}]
  });

  // Track session start time
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!deck || !deck.cards) return;

    // Get due cards
    let due = deck.cards.filter(card => isDue(card.sm2 || {}));

    // Sort: cards with lowest ease factor first (hardest cards reviewed first)
    due.sort((a, b) => (a.sm2?.easeFactor || 2.5) - (b.sm2?.easeFactor || 2.5));

    // Respect session limit
    const limit = maxCards || 20;
    const selected = due.slice(0, limit);

    setSessionCards(selected);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(selected.length === 0);
    startTimeRef.current = Date.now();
    setSessionStats({
      cardsReviewed: 0,
      correctCount: 0,
      againCount: 0,
      startTime: Date.now(),
      endTime: null,
      ratings: [],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id, maxCards]);

  const currentCard = sessionCards[currentIndex] || null;

  /**
   * Flip the current card to reveal the answer.
   */
  const flipCard = useCallback(() => {
    setIsFlipped(true);
  }, []);

  /**
   * Rate the current card, apply SM-2, and advance to next card.
   */
  const rateCard = useCallback((rating) => {
    if (!currentCard || !isFlipped) return;

    // Apply SM-2 algorithm
    const newSm2 = applyReview(currentCard.sm2 || {}, rating);

    // Persist the update
    if (onCardUpdate) {
      onCardUpdate(currentCard.id, newSm2);
    }

    // Update session stats
    const isCorrect = rating >= 3; // GOOD or EASY counts as correct
    setSessionStats(prev => ({
      ...prev,
      cardsReviewed: prev.cardsReviewed + 1,
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      againCount: prev.againCount + (rating === 1 ? 1 : 0),
      ratings: [...prev.ratings, { cardId: currentCard.id, rating }],
    }));

    // Advance to next card or end session
    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionCards.length) {
      // Session complete
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTimeRef.current) / 1000);

      const finalStats = {
        cardsReviewed: sessionStats.cardsReviewed + 1,
        correctCount: sessionStats.correctCount + (isCorrect ? 1 : 0),
        againCount: sessionStats.againCount + (rating === 1 ? 1 : 0),
        startTime: startTimeRef.current,
        endTime,
        durationSeconds,
        ratings: [...sessionStats.ratings, { cardId: currentCard.id, rating }],
      };

      // Persist session to history
      recordStudySession({
        date: today(),
        deckId: deck.id,
        deckName: deck.name,
        cardsReviewed: finalStats.cardsReviewed,
        correctCount: finalStats.correctCount,
        sessionDurationSeconds: durationSeconds,
      });

      setSessionStats(finalStats);
      setIsComplete(true);
    } else {
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
    }
  }, [currentCard, isFlipped, currentIndex, sessionCards.length, sessionStats, deck, onCardUpdate]);

  const progress = sessionCards.length > 0
    ? { current: currentIndex + 1, total: sessionCards.length }
    : { current: 0, total: 0 };

  const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

  return {
    currentCard,
    isFlipped,
    isComplete,
    sessionStats,
    progress,
    elapsedSeconds,
    dueCount: sessionCards.length,
    flipCard,
    rateCard,
  };
}
