/**
 * API utilities — all backend calls go through here.
 * Base URL is set via REACT_APP_API_URL environment variable.
 * Switching from local dev to production = change one env var.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Upload a PDF and get back generated flashcards.
 * Retries up to 2 times on 5xx / network errors (handles Render cold-start).
 * @param {File} file - the PDF file object
 * @param {string} deckName - optional custom deck name
 * @param {function} onRetry - called with attempt number when retrying
 */
export async function generateFlashcards(file, deckName = '', onRetry = null) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      if (onRetry) onRetry(attempt);
      await sleep(3000);
    }

    const formData = new FormData();
    formData.append('file', file);
    if (deckName) formData.append('deck_name', deckName);

    try {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        body: formData,
        // Note: Do NOT set Content-Type header — browser sets it with boundary for multipart
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Response wasn't JSON
        }
        const err = new Error(errorMessage);
        err.status = response.status;
        // Don't retry client errors (4xx) — bad PDF, too large, etc.
        if (response.status < 500) throw err;
        lastError = err;
        continue; // retry on 5xx
      }

      return response.json();
    } catch (err) {
      if (err.status && err.status < 500) throw err; // don't retry 4xx
      lastError = err; // network error — retry
    }
  }

  throw lastError;
}

/**
 * Check backend health.
 */
export async function checkHealth() {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Backend health check failed');
  }
  return response.json();
}
