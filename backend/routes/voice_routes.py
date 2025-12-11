"""
Voice Routes - API endpoints for real-time voice transcription
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.voice_service import voice_service

router = APIRouter(prefix="/api/voice", tags=["voice"])


class AnalyzeRequest(BaseModel):
    transcript: str


@router.get("/token")
async def get_elevenlabs_token():
    """
    Generate a single-use token for ElevenLabs Real-time Scribe.
    Frontend will use this token to connect directly to ElevenLabs.
    
    Returns:
        {"token": "...", "success": true} or {"error": "...", "success": false}
    """
    result = await voice_service.get_elevenlabs_token()
    
    if result["error"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {
        "token": result["token"],
        "success": True
    }


@router.post("/analyze")
async def analyze_transcript(request: AnalyzeRequest):
    """
    Analyze transcript using Google Gemini 2.5 Flash to detect language
    
    Args:
        request: {"transcript": "text to analyze"}
        
    Returns:
        {"language": "...", "confidence": "...", "success": true}
    """
    result = await voice_service.analyze_transcript_language(request.transcript)
    
    if result.get("error"):
        # Return error but don't raise exception - frontend will handle
        return {
            "language": "Error",
            "confidence": "unknown",
            "error": result["error"],
            "success": False
        }
    
    return {
        "language": result["language"],
        "confidence": result["confidence"],
        "success": True
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for voice service
    """
    return {
        "status": "healthy",
        "service": "voice transcription"
    }
