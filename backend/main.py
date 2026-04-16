"""
FlashCard Engine — FastAPI Backend
Cuemath AI Builder Challenge, April 2026

Entry point: uvicorn main:app --reload --port 8000
"""

import os
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


@app.get("/")
async def root():
    return {
        "name": "FlashCard Engine API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
