from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class CardType(str, Enum):
    concept       = "concept"
    why           = "why"
    how           = "how"
    example       = "example"
    relationship  = "relationship"
    edge_case     = "edge_case"
    misconception = "misconception"
    compare       = "compare"


class Flashcard(BaseModel):
    front:            str      = Field(..., description="The question side of the card")
    back:             str      = Field(..., description="The answer side of the card")
    type:             CardType = Field(..., description="Pedagogical type of the card")
    difficulty:       int      = Field(..., ge=1, le=5, description="Difficulty 1 (easy) to 5 (hard)")
    importance_score: int      = Field(3,   ge=1, le=5, description="How important this card is (5=must know)")
    topic:            str      = Field(..., description="Topic extracted from source text")


class GenerationMetrics(BaseModel):
    total_cards:              int
    pages_processed:          int
    words_extracted:          int
    cards_by_type:            dict
    avg_difficulty:           float
    avg_importance:           float
    generation_time_seconds:  float
    cards_per_page:           float


class GenerateResponse(BaseModel):
    success:    bool
    deck_name:  str
    cards:      List[Flashcard]
    metrics:    GenerationMetrics
    message:    Optional[str] = None


class HealthResponse(BaseModel):
    status:   str
    ai_mode:  str
    version:  str
