"""
Card Quality Filter — validates, normalises, and deduplicates AI-generated cards.
"""

from typing import List, Dict, Any
import re

VALID_TYPES = {
    "concept", "why", "how", "example",
    "relationship", "edge_case", "misconception", "compare",
}

MIN_FRONT_LEN  = 8    # chars
MIN_BACK_LEN   = 15   # chars
MIN_BACK_WORDS = 5    # words — loosened for small models
MAX_BACK_LEN   = 900
DUP_THRESHOLD  = 0.65  # was 0.82 — less aggressive deduplication


def validate_and_filter(raw_cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    validated = [c for c in (_validate_schema(r) for r in raw_cards) if c]
    quality   = [c for c in validated if _passes_quality(c)]
    unique    = _deduplicate(quality)
    print(f"[INFO] quality filter: {len(raw_cards)} raw → {len(validated)} valid schema → {len(quality)} quality → {len(unique)} unique")
    return unique


def _validate_schema(card: Dict[str, Any]) -> Dict[str, Any] | None:
    if not isinstance(card, dict):
        return None

    front = str(card.get("front", "")).strip()
    back  = str(card.get("back",  "")).strip()
    if not front or not back:
        return None

    card_type = card.get("type", "concept")
    if card_type not in VALID_TYPES:
        card_type = "concept"

    try:
        difficulty = max(1, min(5, int(card.get("difficulty", 3))))
    except (ValueError, TypeError):
        difficulty = 3

    try:
        importance_score = max(1, min(5, int(card.get("importance_score", 3))))
    except (ValueError, TypeError):
        importance_score = 3

    topic = str(card.get("topic", "General")).strip() or "General"

    return {
        "front": front,
        "back": back,
        "type": card_type,
        "difficulty": difficulty,
        "importance_score": importance_score,
        "topic": topic,
    }


def _passes_quality(card: Dict[str, Any]) -> bool:
    front, back = card["front"], card["back"]

    if len(front) < MIN_FRONT_LEN:
        return False
    if len(back) < MIN_BACK_LEN:
        return False
    if len(back) > MAX_BACK_LEN:
        # Truncate at sentence boundary rather than discard
        card["back"] = back[:MAX_BACK_LEN].rsplit('. ', 1)[0] + '.'

    # Reject cards that reference the source text
    if re.search(r'\b(the text|the passage|the document|above|this excerpt|as mentioned)\b',
                 back, re.IGNORECASE):
        return False

    # Reject trivially identical front/back
    if front.lower().strip('?.! ') == back.lower().strip('?.! '):
        return False

    # Reject very short answers
    if len(back.split()) < MIN_BACK_WORDS:
        return False

    return True


def _deduplicate(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    kept = []
    for card in cards:
        fw = _words(card["front"])
        duplicate = False
        for existing in kept:
            if _jaccard(fw, _words(existing["front"])) > DUP_THRESHOLD:
                # Keep whichever has higher importance, then longer answer
                if card.get("importance_score", 3) > existing.get("importance_score", 3) or \
                   (card.get("importance_score", 3) == existing.get("importance_score", 3) and
                    len(card["back"]) > len(existing["back"])):
                    kept.remove(existing)
                    kept.append(card)
                duplicate = True
                break
        if not duplicate:
            kept.append(card)
    return kept


def _words(text: str) -> set:
    return set(re.findall(r'\w+', text.lower()))


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def compute_type_breakdown(cards: List[Dict[str, Any]]) -> Dict[str, int]:
    breakdown = {t: 0 for t in VALID_TYPES}
    for card in cards:
        t = card.get("type", "concept")
        if t in breakdown:
            breakdown[t] += 1
    return breakdown


def compute_avg_difficulty(cards: List[Dict[str, Any]]) -> float:
    if not cards:
        return 0.0
    return round(sum(c.get("difficulty", 3) for c in cards) / len(cards), 2)


def compute_avg_importance(cards: List[Dict[str, Any]]) -> float:
    if not cards:
        return 0.0
    return round(sum(c.get("importance_score", 3) for c in cards) / len(cards), 2)
