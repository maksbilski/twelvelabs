"""
Voice Routes - API endpoints for real-time voice transcription
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.voice_service import voice_service

router = APIRouter(prefix="/api/voice", tags=["voice"])


class AnalyzeRequest(BaseModel):
    transcript: str
    aircraft_callsign: str = None


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


@router.post("/check-cockpit")
async def check_cockpit_conversation(request: AnalyzeRequest):
    """
    Analyze cockpit conversation to determine if pilots need intervention.
    Expert pilots advisor - detects if pilots missed important facts.
    
    Args:
        request: {"transcript": "cockpit conversation text"}
        
    Returns:
        If intervention needed:
            {"needs_intervention": true, "summary": "...", "agent_message": "...", "success": true}
        If no intervention:
            {"needs_intervention": false, "success": true}
    """
    result = await voice_service.analyze_cockpit_conversation(
        request.transcript, 
        request.aircraft_callsign
    )
    
    if result.get("error"):
        # Return error but don't raise exception - frontend will handle
        return {
            "needs_intervention": False,
            "error": result["error"],
            "success": False
        }
    
    # Build response - include summary and agent_message if intervention needed
    response = {
        "needs_intervention": result["needs_intervention"],
        "success": True
    }
    
    # Add emergency data if intervention is needed
    if result.get("needs_intervention"):
        response["summary"] = result.get("summary")
        response["agent_message"] = result.get("agent_message")
    
    return response


@router.post("/parse-transcript")
async def parse_transcript(request: AnalyzeRequest):
    """
    Parse transcript to identify speakers (ATC vs Aircraft)
    
    Args:
        request: {"transcript": "conversation text"}
        
    Returns:
        {"messages": [{"speaker": "ATC/Aircraft", "text": "..."}], "success": true}
    """
    try:
        messages = voice_service.parse_transcript(request.transcript)
        return {
            "messages": messages,
            "success": True
        }
    except Exception as e:
        return {
            "messages": [],
            "error": str(e),
            "success": False
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
