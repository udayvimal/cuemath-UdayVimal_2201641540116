/**
 * API utilities — all backend calls go through here.
 * Base URL is set via REACT_APP_API_URL environment variable.
 * Switching from local dev to production = change one env var.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Upload a PDF and get back generated flashcards.
 * @param {File} file - the PDF file object
 * @param {string} deckName - optional custom deck name
 * @param {function} onProgress - optional progress callback (not supported by fetch, UI uses polling)
 */
export async function generateFlashcards(file, deckName = '') {
  const formData = new FormData();
  formData.append('file', file);
  if (deckName) {
    formData.append('deck_name', deckName);
  }

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
    throw new Error(errorMessage);
  }

  return response.json();
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
