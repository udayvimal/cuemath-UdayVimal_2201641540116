import os
from fastapi import APIRouter
from models.schemas import HealthResponse

router = APIRouter()

MODE_MODEL_MAP = {
    "ollama": os.getenv("OLLAMA_MODEL", "gemma3:1b"),
    "groq":   os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "gemini": "gemini-1.5-flash",
}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    mode = os.getenv("AI_MODE", "ollama")
    model = MODE_MODEL_MAP.get(mode, "unknown")
    return HealthResponse(
        status="ok",
        ai_mode=f"{mode} ({model})",
        version="1.0.0",
    )
