/**
 * useDecks — manages all deck state, creation, deletion, and card updates.
 * Single source of truth for deck data throughout the app.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAllDecks, saveDeck, deleteDeck as deleteDeckFromStorage, generateId } from '../utils/storage';
import { initCardState } from '../utils/spacedRepetition';

export function useDecks() {
  const [decks, setDecks] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    setDecks(getAllDecks());
  }, []);

  /**
   * Create a new deck from API response data.
   * Initializes SM-2 state for every card.
   */
  const createDeck = useCallback((apiResponse) => {
    const newDeck = {
      id: generateId(),
      name: apiResponse.deck_name,
      createdAt: new Date().toISOString(),
      lastStudied: null,
      generationMetrics: apiResponse.metrics,
      cards: apiResponse.cards.map(card => ({
        id: generateId(),
        front: card.front,
        back: card.back,
        type: card.type,
        difficulty: card.difficulty,
        importance_score: card.importance_score || 3,
        topic: card.topic,
        sm2: initCardState(),
      })),
    };

    saveDeck(newDeck);
    setDecks(getAllDecks());
    return newDeck;
  }, []);

  /**
   * Delete a deck by ID.
   */
  const removeDeck = useCallback((deckId) => {
    deleteDeckFromStorage(deckId);
    setDecks(getAllDecks());
  }, []);

  /**
   * Update SM-2 state for a card after a review.
   * Re-reads from storage to ensure consistency.
   */
  const updateCardSm2 = useCallback((deckId, cardId, newSm2State) => {
    const allDecks = getAllDecks();
    const deckIdx = allDecks.findIndex(d => d.id === deckId);
    if (deckIdx === -1) return;

    const deck = allDecks[deckIdx];
    deck.cards = deck.cards.map(c =>
      c.id === cardId ? { ...c, sm2: newSm2State } : c
    );
    deck.lastStudied = new Date().toISOString();
    saveDeck(deck);
    setDecks(getAllDecks());
  }, []);

  /**
   * Get a single deck by ID from current state.
   */
  const getDeck = useCallback((deckId) => {
    return decks.find(d => d.id === deckId) || null;
  }, [decks]);

  /**
   * Refresh decks from storage (e.g. after a study session).
   */
  const refreshDecks = useCallback(() => {
    setDecks(getAllDecks());
  }, []);

  return {
    decks,
    createDeck,
    removeDeck,
    updateCardSm2,
    getDeck,
    refreshDecks,
  };
}
