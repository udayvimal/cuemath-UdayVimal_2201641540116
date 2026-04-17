# FlashCard Engine — Submission Write-up

**Uday Vimal** | Problem 1: The Flashcard Engine | Cuemath AI Builder Challenge 2026

---

## Problem Statement

Most flashcard apps are glorified text editors. You make cards manually, study them randomly, and retain very little. The two things that actually determine whether flashcard study works — **what cards get generated** and **when you review each card** — are either missing entirely or treated as afterthoughts.

I built a system that does both correctly, and built it in a way where the algorithm is the product, not a feature checkbox.

---

## Why I Picked This Problem

Spaced repetition has 40 years of cognitive science behind it. SM-2 is a real algorithm with a real formula — not just "show cards you got wrong more often." Most flashcard apps either ignore it or implement a crude approximation. I wanted to build something where every technical decision had a reason rooted in how memory actually works.

The other reason: the delta between a mediocre flashcard app and a great one lives entirely in the prompt. The same AI model with a lazy prompt gives you 90% definition cards — shallow, forgettable, useless. With a carefully engineered prompt, you get cards that feel like they were written by a teacher who actually cares. That was the most interesting problem to solve.

---

## My Approach

### Day 1 — The Prompt Is Everything

My first generation attempt used a simple prompt: *"Generate flashcards from this text."* The result was 90% definition cards — "What is X? X is defined as..." No examples, no reasoning, no edge cases. The model was surface-scanning for nouns.

I rewrote the prompt to name all 8 card types explicitly with descriptions of what makes each type valuable. I also added one rule that eliminated an entire category of useless output: *"Never reference 'the text' or 'the passage' — every card must be standalone."* The improvement was immediate and visible.

### Day 2 — SM-2 From Scratch

I implemented the spaced repetition algorithm by hand, referencing the original Wozniak paper. The ease factor formula is a parabola in quality rating q:

```
EF' = EF + 0.1 − (5−q) × (0.08 + (5−q) × 0.02)
```

At q=4 (Good), EF is unchanged. At q=5 (Easy), it grows. At q=1 (Again), it drops by 0.32. I got the formula wrong on the first try and unit-tested every value by hand before trusting it.

### Day 2 — PDF Chunking

A fixed-size character split breaks mid-sentence. The AI then generates cards about half-concepts. I built a paragraph-aware chunker: split on double newlines, filter noise under 150 characters, merge short paragraphs, split oversized ones at sentence boundaries. The 2,500-character limit is empirical — above it, the model loses focus and quality drops noticeably.

### Day 3 — UI Philosophy

Design direction: *Calm Intelligence.* Rejected gamification (trivializes the science) and dark mode default (hard to demo). Chose clean, warm, typography-forward. Outfit for headings, Source Serif 4 for card content — serif feels like a book, appropriate for educational material, and visually differentiates card text from UI chrome.

---

## What I Built

| Feature | Details |
|---------|---------|
| **PDF → Cards** | PyMuPDF extraction → paragraph chunker → Groq Llama 3.3 70B → quality filter → Pydantic-validated output |
| **8 Card Types** | concept, why, how, example, relationship, edge_case, misconception, compare |
| **SM-2 Algorithm** | Hand-coded in JavaScript. Per-card ease factor (1.3–4.0), interval, and next review date |
| **Study Session** | 3D CSS flip animation, keyboard shortcuts (Space / 1–4), combo streak |
| **Dashboard** | Weak area detection, due schedule, study streak, forgetting curve |
| **Sample Notes** | One-click Calculus PDF — evaluators generate cards with zero upload |
| **Three AI Backends** | Groq (production) · Gemini (fallback) · Ollama (local dev) — one env var switches |

---

## Trade-offs

| Decision | What I Gave Up | Why It Was Worth It |
|----------|---------------|---------------------|
| 10 cards per chunk max | Fewer cards per PDF | Quality drops above 10 — the model loses focus |
| localStorage, no database | Cross-device sync | SM-2 state is inherently per-device, exactly like Anki |
| Free Render hosting | Zero cold starts | 3-layer retry (startup warmup + backend retry + frontend silent retry) handles it completely |
| No card editing UI | Users can't fix AI mistakes | Quality filter rejects most bad output; reduces scope significantly |
| Single PDF at a time | Bulk upload | Keeps UX simple and generation time predictable |

---

## Performance Metrics

| Metric | Result |
|--------|--------|
| Generation time | ~3 seconds (Groq) |
| Cards per chunk | 10 |
| Quality filter pass rate | 85–91% |
| Dedup threshold | Jaccard similarity > 0.65 → dropped |
| SM-2 ease factor range | 1.3 – 4.0, adapts per card |
| Card types in output | All 8 present in every deck |
| AI output tokens | 1,500 max per chunk |

---

## How I Used Claude Code

I used **Claude Code** (Anthropic's AI coding assistant) as a pair programmer throughout — not a code generator. I drove every architectural decision; Claude handled first drafts and boilerplate. The most valuable moments were in debugging:

**CORS errors on 500 responses** — FastAPI's CORS middleware doesn't attach headers to unhandled exceptions. I described the error, Claude identified the exact cause and added a global exception handler in `main.py`. Fixed in five minutes.

**JSON control character crashes** — Small AI models copy PDF math symbols verbatim into JSON strings as bare control characters. A global regex fix broke structural newlines. Claude designed a character-by-character parser that escapes control characters only inside JSON string values. I wouldn't have arrived at that approach independently.

**First upload always failing** — Groq cold connection combined with Render's free-tier spin-down. Claude added three layers: a startup warmup call to Groq when the server initializes, backend retry with exponential backoff, and silent frontend retry. The user never sees a failure.

**What I didn't use it for:** SM-2 formula verification (checked the Wozniak paper myself), deployment platform decisions, and the reasoning in this write-up.

---

## What I'd Build Next

1. **Cross-device sync** — A Supabase table for SM-2 state. Schema: card_id, ease_factor, interval, next_review. One afternoon of work.
2. **Card editing** — The data model supports it. The UI doesn't yet.
3. **Export to Anki** — Generate `.apkg` files. The card data is already in the right format.
4. **Better weak area detection** — Replace ease-factor averaging with a proper forgetting curve model (exponential decay per card).
5. **Image support** — PDFs with diagrams lose visual context. OCR + image embedding would fix this.

---

## Final Thought

The algorithm is the easy part. The pedagogy is the hard part.

The same model with a lazy prompt gives you cards that are useless. With a carefully engineered prompt that specifies card types, enforces standalone answers, and assigns importance scores — you get cards that feel like they were written by a teacher who actually cares.

That realization was the most interesting thing I built here, and it cost nothing but thinking.

---

*Built with Claude Code · FastAPI · React · Groq Llama 3.3 70B · SM-2 Spaced Repetition*
*[Live Demo](https://cuemath-uday-vimal-2201641540116.vercel.app/) · [GitHub](https://github.com/udayvimal/cuemath-UdayVimal_2201641540116)*
