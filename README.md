# 🧠 FlashCard Engine — Cuemath AI Builder Challenge 2026

> Turn any PDF into a smart, practice-ready flashcard deck powered by the SM-2 spaced repetition algorithm.
> Built by **Uday Vimal** for Problem 1: The Flashcard Engine.

---

## Live Demo
**[→ Click here to use the app](https://flashcard-engine.vercel.app)**

## Video Walkthrough
**[→ Watch 3-minute demo on Loom](https://loom.com/share/YOUR_LINK)**

---

## Problem Statement

Students waste time rereading textbooks. Cognitive science has known for 40 years that **active recall + spaced repetition** is the most efficient path to long-term retention — yet most study tools either ignore this (basic flashcard apps) or bury it in complexity (Anki's steep learning curve).

This app bridges that gap: **upload any PDF, get teacher-quality flashcards, study with a provably optimal algorithm.** No setup. No exports. No account required.

---

## What I Built

### Core Features
- **PDF → Flashcard generation**: PyMuPDF extracts clean text, chunked intelligently by paragraph structure (not fixed-size splits). AI generates 8 types of flashcards per chunk with an **importance score** (1–5) on every card.
- **Multi-AI support**: Groq Llama 3.3 70B, Google Gemini 1.5 Flash, or local Ollama (Gemma3:1b) — switched with one env var (`AI_MODE`).
- **SM-2 Spaced Repetition**: Hand-coded from scratch in JavaScript. Every card has its own ease factor, interval, and next review date. Adapts per-card to your performance.
- **Study Briefing Screen**: Before every session, a full-screen guide explains rating buttons (Again/Hard/Good/Easy), keyboard shortcuts, the SM-2 formula, and estimated session time. Zero confusion for new users.
- **Study Session**: Full-focus mode. 3D CSS flip animation. Keyboard shortcuts (Space to flip, 1–4 to rate). Importance and difficulty indicators on every card.
- **Dashboard Insights**: Weak area detection (topics with lowest ease factor), next review schedule ("3 due today · 5 tomorrow"), study streak, forgetting curve.

### Card Types (8 types)
| Type | Purpose |
|------|---------|
| Concept | Core definition |
| Why | Deep reasoning |
| How | Step-by-step process |
| Example | Worked example with numbers |
| Relationship | Connects two concepts |
| Edge Case | Boundary conditions |
| Misconception | Corrects common wrong beliefs |
| Compare | Contrasts two methods |

### Importance Score
| Score | Label | Meaning |
|-------|-------|---------|
| 5 | Critical | Fundamental — always on exams |
| 4 | High | Frequently tested |
| 3 | Medium | Useful to know |
| 2 | Low | Supplementary |
| 1 | Low | Interesting but not critical |

---

## Architecture

```
Browser (React + localStorage)
    │
    ├── localStorage ←── All deck & SM-2 progress (no database)
    │
    └── POST /api/generate ──► FastAPI
                                   │
                                   ├── PyMuPDF: paragraph-based chunking
                                   ├── AI (Groq / Gemini / Ollama)
                                   ├── JSON parser with control-char sanitization
                                   ├── Quality filter + Jaccard deduplication
                                   └── Returns cards with importance_score
```

---

## Key Technical Decisions

### Why Groq (Llama 3.3 70B)?
Free tier: 14,400 req/day, 500k tokens/min. Switching to Gemini or local Ollama = one env var. For local dev, Ollama Gemma3:1b works with the hardened JSON parser.

### Why SM-2 over Leitner Boxes?
Per-card ease factor, exponential interval growth (1→6→15→40… days), 30+ years of research. Used by Duolingo, Anki, Memrise. Formula: `EF' = EF + 0.1 - (5-q) × (0.08 + (5-q) × 0.02)`

### Why paragraph-based chunking?
Fixed-size splits break mid-sentence — AI generates cards about half-concepts. Paragraph chunking preserves semantic units → much higher card quality.

### JSON parsing hardening
Small models emit raw control characters inside JSON strings. The parser strips C0 range (`\x00–\x08`, `\x0b`, `\x0c`, `\x0e–\x1f`) before parsing, then escapes bare newlines as a fallback.

### Why a Study Briefing screen?
Every entry path (sidebar "Study Now", deck detail, upload complete) goes through a full-screen instructions page. No user is left wondering what "Again" or "Easy" means.

---

## The SM-2 Algorithm

```
q = {Again:1, Hard:3, Good:4, Easy:5}  // SM-2 quality scale

if q < 3:  // incorrect
    repetitions = 0 ; interval = 1
else:
    if rep==0: interval=1
    if rep==1: interval=6
    if rep>1:  interval=round(interval × EF)
    repetitions += 1

EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))
EF' = clamp(EF', 1.3, 4.0)
nextReview = today + interval days
```

| Rating | EF delta |
|--------|----------|
| Easy   | +0.10 |
| Good   | 0.00 |
| Hard   | −0.14 |
| Again  | −0.32 |

---

## Prompt Engineering

The master prompt names all 8 card types explicitly and adds importance scoring:

```
Create exactly 10 flashcards. Use a variety of card types:
- "concept", "why", "how", "example", "relationship",
  "edge_case", "misconception", "compare"

importance_score: 5=Critical, 4=High, 3=Medium, 2=Low, 1=Supplementary

Return ONLY a JSON array. No markdown, no explanation.
```

Without explicit type names, AI produces 85% concept cards. Naming types forces it to find relationships, examples, and edge cases — the cards that actually build understanding.

---

## Dashboard Enhancements (Latest)

| Feature | Description |
|---------|-------------|
| **Weak Areas** | Topics with ease factor < 2.2 shown after sessions — pure SM-2 data, no manual tagging |
| **Next Review** | "⚡ 3 due today · 5 tomorrow" — compact, always visible |
| **Micro delight** | "Ready to practice smarter, not harder ✦" — subtle motivational line |
| **Better labels** | "Avg Difficulty" → "Learning Difficulty", "Avg Importance" → "Concept Importance" |

---

## Challenges & Fixes

| Problem | Fix |
|---------|-----|
| Small models emit invalid control chars | Strip C0 range before `json.loads()`, escape bare newlines as fallback |
| Only 1 card generated | Simplified prompt, `temperature: 0.4`, `num_predict: 4096`, serial Ollama |
| Dedup too aggressive | Jaccard threshold 0.82 → 0.65 |
| Quality filter rejecting small-model output | `MIN_BACK_WORDS` 8 → 5 |
| Upload result showing only 4 preview cards | Removed `.slice(0,4)` — all cards shown with type-filter pills |
| No instructions before study session | Added StudyBriefing — every entry path goes through it |
| Sidebar "Study Now" with no deck selected | Auto-picks deck with highest due count |
| Groq key stored in `GEMINI_API_KEY` | Added proper `GROQ_API_KEY` + `GROQ_MODEL` env vars |

---

## Deployment

### Backend → Render

1. New **Web Service** on Render, connect GitHub repo
2. **Root directory**: `backend`
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment variables** (set in Render dashboard — never in code):

| Variable | Value |
|----------|-------|
| `AI_MODE` | `groq` |
| `GROQ_API_KEY` | your Groq key (`gsk_...`) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | your Gemini key (if `AI_MODE=gemini`) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

→ Get your backend URL: `https://your-backend.onrender.com`

### Frontend → Vercel

1. Import repo to Vercel, **Root directory**: `frontend`
2. Framework: Create React App (auto-detected)
3. **Environment variable**:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://your-backend.onrender.com` |

All API calls already use this via `src/utils/api.js`:
```js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

### Switching AI backends (one variable)
```
AI_MODE=groq    → Groq Llama 3.3 70B  (free, fast, default)
AI_MODE=gemini  → Google Gemini 1.5 Flash
AI_MODE=ollama  → Local Ollama (dev only)
```

---

## Local Setup

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Set GROQ_API_KEY in .env (already created)
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install && npm start
```

- App: `http://localhost:3000` · API docs: `http://localhost:8000/docs`

### Local AI (no API key)
```bash
ollama pull gemma3:1b && ollama serve
# Set AI_MODE=ollama in backend/.env
```

---

## Project Structure

```
cuemath2/
├── backend/
│   ├── main.py                    # FastAPI entry point + CORS
│   ├── routes/
│   │   ├── generate.py            # POST /api/generate
│   │   └── health.py              # GET /api/health (shows active AI mode)
│   ├── services/
│   │   ├── ai_service.py          # Groq / Gemini / Ollama callers + prompt builder
│   │   ├── pdf_service.py         # PyMuPDF + paragraph chunking
│   │   └── card_quality.py        # Schema validation, quality filter, Jaccard dedup
│   ├── models/schemas.py          # Pydantic: Flashcard, GenerationMetrics
│   └── .env                       # Local only — gitignored
│
└── frontend/
    └── src/
        ├── App.js                 # Screen router, splash, all navigation state
        ├── components/
        │   ├── Dashboard/         # Stats, weak areas, next review, deck grid
        │   ├── Upload/            # Drop zone + full card preview with filters
        │   ├── StudyBriefing/     # Full instructions screen before every session
        │   ├── StudySession/      # Focus mode — flip, rate, importance badge
        │   ├── DeckDetail/        # Charts, topic mastery bars, card browser
        │   ├── SessionComplete/   # Post-session summary + confetti
        │   └── Sidebar/           # Nav with due-count badge
        ├── hooks/
        │   ├── useDecks.js        # Deck CRUD + localStorage sync
        │   └── useStudySession.js # SM-2 session state machine
        └── utils/
            ├── api.js             # Backend fetch (uses REACT_APP_API_URL)
            ├── spacedRepetition.js # SM-2 hand-coded from scratch
            ├── metrics.js         # Stats, weak areas, forgetting curve, upcoming due
            └── storage.js         # localStorage helpers + UUID generator
```

---

## Security

- All API keys set **only** in deployment dashboard env vars — never in source code
- Frontend never touches an API key — all AI calls are backend-only
- `.env` is gitignored on both frontend and backend
- CORS restricted to specific Vercel domain in production (`ALLOWED_ORIGINS`)
