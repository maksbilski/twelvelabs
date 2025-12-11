"""
Voice Service - ElevenLabs integration for real-time transcription + Gemini analysis
"""
import os
import httpx
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


class VoiceService:
    """Service for handling voice transcription with ElevenLabs and AI analysis with Gemini"""
    
    def __init__(self):
        self.gemini_model = None
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    async def get_elevenlabs_token(self) -> dict:
        """
        Generate a single-use token for ElevenLabs Real-time Scribe
        
        Returns:
            dict: {"token": "...", "error": None} or {"token": None, "error": "..."}
        """
        if not ELEVENLABS_API_KEY:
            return {"token": None, "error": "ELEVENLABS_API_KEY not configured"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
                    headers={
                        "xi-api-key": ELEVENLABS_API_KEY
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get("token")
                    print(f"✅ Generated ElevenLabs token")
                    return {"token": token, "error": None}
                else:
                    error_msg = f"Failed to get token: {response.status_code}"
                    print(f"❌ {error_msg}: {response.text}")
                    return {"token": None, "error": error_msg}
                    
        except Exception as e:
            error_msg = f"Token generation error: {str(e)}"
            print(f"❌ {error_msg}")
            return {"token": None, "error": error_msg}
    
    async def analyze_transcript_language(self, transcript: str) -> dict:
        """
        Analyze transcript using Gemini 2.5 Flash to detect language
        
        Args:
            transcript: Text to analyze
            
        Returns:
            dict: {"language": "...", "confidence": "...", "error": None} or {"error": "..."}
        """
        if not self.gemini_model:
            return {"error": "GEMINI_API_KEY not configured"}
        
        if not transcript or len(transcript.strip()) < 5:
            return {"error": "Transcript too short to analyze"}
        
        try:
            print(f"🤖 Analyzing transcript with Gemini: '{transcript[:100]}...'")
            
            prompt = f"""Analyze this transcript and detect the language. 
Respond ONLY with JSON format (no markdown, no code blocks):
{{"language": "language name in English", "confidence": "high/medium/low"}}

Transcript: {transcript}"""
            
            response = self.gemini_model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                # Extract JSON from code block
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            print(f"🤖 Gemini response: {response_text}")
            
            # Parse JSON response
            import json
            try:
                result = json.loads(response_text)
                return {
                    "language": result.get("language", "Unknown"),
                    "confidence": result.get("confidence", "unknown"),
                    "error": None
                }
            except json.JSONDecodeError:
                # Fallback - extract language from text
                return {
                    "language": response_text,
                    "confidence": "unknown",
                    "error": None
                }
                
        except Exception as e:
            error_msg = f"Analysis error: {str(e)}"
            print(f"❌ {error_msg}")
            return {"error": error_msg}


# Singleton instance
voice_service = VoiceService()
