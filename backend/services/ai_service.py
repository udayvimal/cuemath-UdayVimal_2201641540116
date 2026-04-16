"""
AI Service — generates flashcards from text chunks.

AI_MODE=ollama  → local Ollama (Gemma3:1b) for development
AI_MODE=gemini  → Google Gemini 1.5 Flash for production

Switching requires changing ONE environment variable. Nothing else changes.
"""

import os
import json
import re
import httpx
import asyncio
from typing import List, Dict, Any

AI_MODE        = os.getenv("AI_MODE", "ollama")

OLLAMA_URL     = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL   = os.getenv("OLLAMA_MODEL", "gemma3:1b")

GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL     = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_ENDPOINT  = "https://api.groq.com/openai/v1/chat/completions"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-1.5-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


# ─── Master Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = "You are an expert teacher who creates high-quality study flashcards. You always respond with valid JSON only — no markdown, no explanation."


def build_generation_prompt(chunk: str, count: int = 10) -> str:
    return f"""Create exactly {count} flashcards from the text below. Use a variety of card types.

Card types to use (mix them):
- "concept": definition or core idea
- "why": reasoning behind something
- "how": step-by-step process
- "example": worked example with specifics
- "relationship": connects two ideas
- "edge_case": boundary condition or exception
- "misconception": common wrong belief corrected
- "compare": contrast two methods or ideas

importance_score rules (CRITICAL — assign carefully):
5 = Fundamental principle, always on exams, core to understanding
4 = Important concept, frequently tested
3 = Useful to know, moderately important
2 = Supplementary detail, rarely tested
1 = Interesting but not critical

difficulty rules:
1 = Simple recall
2 = Basic understanding
3 = Application
4 = Analysis
5 = Synthesis or edge case

Rules:
- front: a clear question (at least 8 words)
- back: a complete answer with at least 2 sentences and 25+ words
- Never say "the text" or "the passage" — cards must be standalone
- Include numbers, formulas, or steps when the topic has them

Return ONLY this JSON array, nothing else:
[
  {{
    "front": "question here",
    "back": "complete answer here, at least two sentences",
    "type": "concept",
    "difficulty": 3,
    "importance_score": 4,
    "topic": "topic name"
  }}
]

TEXT:
{chunk}

JSON:"""


# ─── API callers ──────────────────────────────────────────────────────────────

async def generate_cards_for_chunk(chunk: str, client: httpx.AsyncClient, count: int = 10) -> List[Dict[str, Any]]:
    prompt = build_generation_prompt(chunk, count)
    if AI_MODE == "gemini":
        return await _generate_gemini(prompt, client)
    if AI_MODE == "groq":
        return await _generate_groq(prompt, client)
    return await _generate_ollama(prompt, client)


async def _generate_ollama(prompt: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        "stream": False,
        "options": {
            "temperature": 0.4,   # lower = more consistent JSON output
            "top_p": 0.9,
            "num_predict": 2500,  # ~230 tokens/card × 10 cards = 2300 needed
            "repeat_penalty": 1.1,
        },
    }
    try:
        response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=240.0)
        response.raise_for_status()
        raw = response.json()["message"]["content"]
        print(f"[DEBUG] Ollama raw output length: {len(raw)} chars")
        return _parse_json(raw)
    except httpx.ConnectError:
        raise ConnectionError("Cannot connect to Ollama. Run: ollama serve")
    except Exception as e:
        raise RuntimeError(f"Ollama error: {e}")


async def _generate_groq(prompt: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in .env")
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 1500,
        "top_p": 0.9,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        response = await client.post(GROQ_ENDPOINT, json=payload, headers=headers, timeout=60.0)
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
        print(f"[DEBUG] Groq raw output length: {len(raw)} chars")
        return _parse_json(raw)
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Groq API error {e.response.status_code}: {e.response.text}")
    except Exception as e:
        raise RuntimeError(f"Groq error: {e}")


async def _generate_gemini(prompt: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set. Add it in Render dashboard environment variables.")
    payload = {
        "contents": [{"parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]}],
        "generationConfig": {"temperature": 0.4, "topP": 0.9, "maxOutputTokens": 1500},
    }
    try:
        response = await client.post(f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}", json=payload, timeout=60.0)
        response.raise_for_status()
        raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return _parse_json(raw)
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Gemini API error {e.response.status_code}: {e.response.text}")
    except Exception as e:
        raise RuntimeError(f"Gemini error: {e}")


def _escape_control_chars_in_strings(s: str) -> str:
    """Escape bare control characters ONLY inside JSON string values.

    Small models often copy source text verbatim into back/front fields,
    including math symbols and arrows that become bare control chars.
    A simple global regex also corrupts structural newlines — this parser
    walks the JSON character by character and only touches chars inside strings.
    """
    result = []
    in_string = False
    escape_next = False
    for ch in s:
        if escape_next:
            result.append(ch)
            escape_next = False
        elif ch == '\\' and in_string:
            result.append(ch)
            escape_next = True
        elif ch == '"':
            in_string = not in_string
            result.append(ch)
        elif in_string and ord(ch) < 32:
            # Escape control characters inside string values
            if ch == '\n':   result.append('\\n')
            elif ch == '\r': result.append('\\r')
            elif ch == '\t': result.append('\\t')
            # Drop all other control chars (NUL, BEL, ESC, etc.)
        else:
            result.append(ch)
    return ''.join(result)


def _parse_json(raw: str) -> List[Dict[str, Any]]:
    """Strip markdown fences and extract the first valid JSON array."""
    text = re.sub(r'```(?:json)?\s*', '', raw)
    text = re.sub(r'```\s*$', '', text).strip()

    match = re.search(r'\[[\s\S]*\]', text)
    if not match:
        raise ValueError(f"No JSON array in response. Got: {raw[:200]}")

    json_str = match.group(0)

    # Step 1: strip illegal C0 control chars from the raw text (outside strings too)
    json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', json_str)

    # Step 2: fix bare control chars that survived inside JSON string values
    json_str = _escape_control_chars_in_strings(json_str)

    try:
        cards = json.loads(json_str)
    except json.JSONDecodeError:
        # Fix trailing commas (common AI output issue)
        json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
        cards = json.loads(json_str)

    if not isinstance(cards, list):
        raise ValueError("AI returned JSON but not an array")
    return cards


async def generate_all_cards(chunks: List[str], cards_per_chunk: int = 10) -> List[Dict[str, Any]]:
    """Generate cards for all chunks sequentially (Ollama is single-threaded)."""
    # Ollama: serial (CPU-bound). Groq/Gemini: parallel (cloud, rate-limited to 4)
    semaphore = asyncio.Semaphore(1 if AI_MODE == "ollama" else 4)

    async def bounded(chunk: str, client: httpx.AsyncClient):
        async with semaphore:
            for attempt in range(3):
                try:
                    prompt = build_generation_prompt(chunk, cards_per_chunk)
                    if AI_MODE == "gemini":
                        cards = await _generate_gemini(prompt, client)
                    elif AI_MODE == "groq":
                        cards = await _generate_groq(prompt, client)
                    else:
                        cards = await _generate_ollama(prompt, client)
                    print(f"[INFO] chunk produced {len(cards)} cards (attempt {attempt+1})")
                    return cards
                except Exception as e:
                    if attempt < 2:
                        wait = 1.5 * (attempt + 1)  # 1.5s, then 3s
                        print(f"[WARN] attempt {attempt+1} failed, retrying in {wait}s: {e}")
                        await asyncio.sleep(wait)
                    else:
                        print(f"[WARN] chunk skipped after 3 attempts: {e}")
                        return []

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[bounded(c, client) for c in chunks])

    all_cards = [card for batch in results for card in batch]
    print(f"[INFO] total raw cards before filtering: {len(all_cards)}")
    return all_cards
