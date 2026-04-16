"""
FlashCard Engine — FastAPI Backend
Cuemath AI Builder Challenge, April 2026

Entry point: uvicorn main:app --reload --port 8000
"""

import os
import asyncio
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from routes.generate import router as generate_router
from routes.health import router as health_router

app = FastAPI(
    title="FlashCard Engine API",
    description="Converts PDFs into smart flashcard decks using spaced repetition",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — restrict to configured origins in production
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Global exception handler — ensures CORS headers are present on all 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

# Register routes
app.include_router(generate_router, prefix="/api")
app.include_router(health_router, prefix="/api")


async def _warmup_groq():
    """Pre-warm the Groq HTTP connection on startup.
    Costs 1 token. Ensures the first real user request never hits a cold connection."""
    await asyncio.sleep(3)  # let server finish initializing first
    api_key = os.getenv("GROQ_API_KEY", "")
    model   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    ai_mode = os.getenv("AI_MODE", "ollama")
    if ai_mode != "groq" or not api_key:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 1,
                },
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
        print("[INFO] Groq connection warmed up")
    except Exception as e:
        print(f"[INFO] Groq warmup skipped: {e}")


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(_warmup_groq())


@app.get("/")
async def root():
    return {
        "name": "FlashCard Engine API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
