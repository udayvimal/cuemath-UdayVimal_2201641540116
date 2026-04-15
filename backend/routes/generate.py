"""
Generate route — receives PDF upload, extracts text, calls AI, returns flashcards.
"""

import time
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional

from models.schemas import GenerateResponse, GenerationMetrics, Flashcard, CardType
from services.pdf_service import extract_text_from_pdf
from services.ai_service import generate_all_cards
from services.card_quality import validate_and_filter, compute_type_breakdown, compute_avg_difficulty, compute_avg_importance

router = APIRouter()

MAX_FILE_SIZE  = 20 * 1024 * 1024  # 20MB
MAX_CHUNKS     = 20   # process up to 20 chunks
CARDS_PER_CHUNK = 10  # ask model for 10 cards per chunk


@router.post("/generate", response_model=GenerateResponse)
async def generate_flashcards(
    file: UploadFile = File(...),
    deck_name: Optional[str] = Form(None),
):
    """
    Main endpoint: PDF → flashcards.

    Process:
    1. Validate file (size, type)
    2. Extract text with PyMuPDF
    3. Chunk text intelligently
    4. Generate cards with AI (concurrently)
    5. Filter and deduplicate cards
    6. Return cards with generation metrics
    """
    start_time = time.time()

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Read and check file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Extract text from PDF
    try:
        chunks, pdf_metadata = extract_text_from_pdf(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any readable text from the PDF. "
                   "Ensure the PDF contains selectable text (not a scanned image)."
        )

    # Limit chunks to prevent runaway costs/time
    chunks_to_process = chunks[:MAX_CHUNKS]

    # Generate flashcards with AI
    try:
        raw_cards = await generate_all_cards(chunks_to_process, cards_per_chunk=CARDS_PER_CHUNK)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Card generation failed: {str(e)}")

    if not raw_cards:
        raise HTTPException(
            status_code=500,
            detail="AI generated no cards. This may be a temporary issue — please try again."
        )

    # Quality filter
    clean_cards = validate_and_filter(raw_cards)

    if not clean_cards:
        raise HTTPException(
            status_code=500,
            detail="All generated cards failed quality checks. Please try a different PDF."
        )

    # Build metrics
    generation_time = round(time.time() - start_time, 2)
    type_breakdown  = compute_type_breakdown(clean_cards)
    avg_difficulty  = compute_avg_difficulty(clean_cards)
    avg_importance  = compute_avg_importance(clean_cards)
    pages           = pdf_metadata["pages_processed"]

    metrics = GenerationMetrics(
        total_cards=len(clean_cards),
        pages_processed=pages,
        words_extracted=pdf_metadata["words_extracted"],
        cards_by_type=type_breakdown,
        avg_difficulty=avg_difficulty,
        avg_importance=avg_importance,
        generation_time_seconds=generation_time,
        cards_per_page=round(len(clean_cards) / max(pages, 1), 1),
    )

    # Convert to Pydantic models
    flashcards = []
    for card in clean_cards:
        try:
            flashcards.append(Flashcard(
                front=card["front"],
                back=card["back"],
                type=CardType(card["type"]),
                difficulty=card["difficulty"],
                importance_score=card.get("importance_score", 3),
                topic=card["topic"],
            ))
        except Exception:
            continue  # Skip malformed cards

    # Determine deck name from filename if not provided
    if not deck_name:
        deck_name = os.path.splitext(file.filename)[0].replace("_", " ").replace("-", " ").title()

    return GenerateResponse(
        success=True,
        deck_name=deck_name,
        cards=flashcards,
        metrics=metrics,
        message=f"Generated {len(flashcards)} cards from {pages} pages in {generation_time}s",
    )
