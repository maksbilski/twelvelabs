"""
Voice Service - ElevenLabs integration for real-time transcription + Gemini analysis
"""
import os
import httpx
import re
from dotenv import load_dotenv
from typing import List, Dict
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
    
    def parse_transcript(self, transcript: str) -> List[Dict[str, str]]:
        """
        Parse transcript to identify speakers (ATC vs Aircraft)
        
        Aviation radio protocol:
        - ATC speaks first, addressing aircraft: "Coastal 115, line up and wait..."
        - Aircraft responds, ending with callsign: "Line up and wait, Coastal 115"
        
        Args:
            transcript: Raw transcript text
            
        Returns:
            List of messages: [{"speaker": "ATC/Aircraft", "callsign": "...", "text": "..."}]
        """
        if not transcript or len(transcript.strip()) < 5:
            return []
        
        # Split by sentence endings or natural pauses
        sentences = re.split(r'[.!?]\s+|\n', transcript)
        messages = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 5:
                continue
            
            # Common callsign patterns (letters + numbers)
            # Examples: "Coastal 115", "United 234", "Delta 456", "N12345"
            callsign_pattern = r'\b([A-Z][a-z]+\s+\d+[A-Za-z]*|[A-Z]{2,}\s+\d+|N\d{3,}[A-Z]*)\b'
            
            # Check if sentence STARTS with callsign (ATC speaking)
            start_match = re.match(r'^' + callsign_pattern, sentence)
            
            # Check if sentence ENDS with callsign (Aircraft speaking)
            end_match = re.search(callsign_pattern + r'[,.]?\s*$', sentence)
            
            if start_match:
                # ATC speaking TO aircraft
                callsign = start_match.group(1)
                messages.append({
                    "speaker": "ATC",
                    "target_callsign": callsign,
                    "text": sentence
                })
            elif end_match:
                # Aircraft speaking, confirms with callsign at end
                callsign = end_match.group(1)
                messages.append({
                    "speaker": callsign,
                    "text": sentence
                })
            else:
                # Unknown speaker - could be pilot conversation in cockpit
                messages.append({
                    "speaker": "Unknown",
                    "text": sentence
                })
        
        return messages
    
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
    
    async def generate_emergency_instructions(self, transcript: str, aircraft_callsign: str = None) -> dict:
        """
        Generate emergency response instructions for voice agent
        Called when intervention is needed - creates summary and agent message
        
        Args:
            transcript: Cockpit conversation that triggered emergency
            
        Returns:
            dict: {
                "summary": "Context for agent",
                "agent_message": "First message agent should say to pilots",
                "success": bool,
                "error": None
            }
        """
        if not self.gemini_model:
            return {"error": "GEMINI_API_KEY not configured", "success": False}
        
        if not transcript or len(transcript.strip()) < 10:
            return {"error": "Transcript too short", "success": False}
        
        try:
            print(f"🚨 [Emergency Generator] Generating instructions for: '{transcript[:100]}...'")
            
            callsign_context = f"YOUR AIRCRAFT: {aircraft_callsign}\n" if aircraft_callsign else "YOUR AIRCRAFT: Not specified (address all pilots)\n"
            
            prompt = f"""You are an expert aviation safety assistant analyzing cockpit communications.

{callsign_context}
Based on the conversation below, generate emergency response instructions for a voice agent.

CONTEXT: A safety-critical situation has been detected. This could be:
- Runway conflict (multiple aircraft on same runway)
- Missed critical ATC clearance
- Technical issue being ignored
- Procedural violation
- Communication error

YOUR TASK:
Generate two pieces of information:

1. SUMMARY: 
   - Concise description of what safety issue was detected
   - What the pilots may have missed or misunderstood
   - Why this is dangerous
   - For agent's internal context (2-3 sentences max)

2. AGENT_MESSAGE:
   - Clear, direct message the voice agent should say to pilots IN YOUR AIRCRAFT ({aircraft_callsign or "your aircraft"})
   - IMPORTANT: Focus ONLY on instructions relevant to YOUR aircraft ({aircraft_callsign or "your aircraft"})
   - DO NOT give instructions to other aircraft mentioned in the conversation
   - Start with "Alert:" or "Attention:" or "Caution:"
   - State the specific problem detected that affects YOUR aircraft
   - Provide immediate actionable instruction for YOUR pilots
   - Be specific with runway numbers, altitudes if mentioned
   - Keep it concise but urgent (2-3 sentences max)

TONE: Professional, urgent but not alarming. Focus on facts and actions relevant to YOUR aircraft.

Respond ONLY with JSON format (no markdown, no code blocks):
{{
  "summary": "...",
  "agent_message": "..."
}}

Cockpit conversation: {transcript}"""
            
            response = self.gemini_model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            print(f"🚨 [Emergency Generator] Raw response: {response_text[:200]}...")
            
            # Parse JSON response
            import json
            try:
                result = json.loads(response_text)
                summary = result.get("summary", "")
                agent_message = result.get("agent_message", "")
                
                if not summary or not agent_message:
                    return {
                        "error": "Generated instructions incomplete",
                        "success": False
                    }
                
                print(f"✅ [Emergency Generator] Success!")
                print(f"   Summary: {summary[:100]}...")
                print(f"   Agent Message: {agent_message[:100]}...")
                
                return {
                    "summary": summary,
                    "agent_message": agent_message,
                    "success": True,
                    "error": None
                }
                
            except json.JSONDecodeError as je:
                error_msg = f"Failed to parse JSON: {str(je)}"
                print(f"❌ {error_msg}")
                return {"error": error_msg, "success": False}
                
        except Exception as e:
            error_msg = f"Emergency instruction generation error: {str(e)}"
            print(f"❌ {error_msg}")
            return {"error": error_msg, "success": False}
    
    async def analyze_cockpit_conversation(self, transcript: str, aircraft_callsign: str = None) -> dict:
        """
        Analyze cockpit conversation to determine if pilots need intervention
        If intervention needed, automatically generates emergency instructions
        Uses expert pilots advisor system prompt
        
        Args:
            transcript: Cockpit conversation to analyze
            
        Returns:
            If intervention needed:
                {"needs_intervention": True, "summary": "...", "agent_message": "...", "success": True}
            If no intervention:
                {"needs_intervention": False, "success": True}
        """
        if not self.gemini_model:
            return {"error": "GEMINI_API_KEY not configured", "success": False}
        
        if not transcript or len(transcript.strip()) < 10:
            return {"needs_intervention": False, "success": True, "error": None}
        
        try:
            print(f"✈️ [Pilots Advisor] Analyzing cockpit conversation: '{transcript[:100]}...'")
            if aircraft_callsign:
                print(f"✈️ [Pilots Advisor] Monitoring aircraft: {aircraft_callsign}")
            
            # Enhanced system prompt for safety-critical aviation monitoring
            callsign_context = f"\nMONITORING AIRCRAFT: {aircraft_callsign}\nFocus on safety issues that affect THIS aircraft.\n" if aircraft_callsign else ""
            
            system_prompt = f"""You are an expert aviation safety advisor monitoring cockpit communications and ATC interactions.
{callsign_context}
Your role is to detect safety-critical situations that pilots may have missed or not fully appreciated.

UNDERSTANDING AVIATION RADIO PROTOCOL:
- When ATC speaks: They START with the aircraft callsign they're addressing
  Example: "Coastal 115, line up and wait runway 28"
- When Aircraft responds: They END with their own callsign
  Example: "Line up and wait runway 28, Coastal 115"
- Cockpit crew conversations: Usually no callsign mentioned, internal discussion

IMPORTANT: "Line up and wait" on a runway is a NORMAL procedure. It only becomes a safety issue if:
- Another aircraft is ALSO cleared to land/takeoff on the SAME runway
- There are conflicting clearances for the same runway

CRITICAL SITUATIONS TO DETECT:

1. RUNWAY CONFLICTS (ONLY if multiple aircraft involved):
   - TWO OR MORE aircraft cleared for same runway simultaneously (one landing + one taking off, or one landing + one holding)
   - Aircraft cleared to "line up and wait" WHILE another aircraft is also cleared to land/takeoff on SAME runway
   - Runway incursion risks with multiple aircraft
   - Conflicting runway assignments between two or more aircraft
   
   NOTE: Single aircraft "line up and wait" is NORMAL - not a safety issue!

2. CLEARANCE CONFLICTS:
   - Contradictory ATC instructions
   - Altitude conflicts with other traffic
   - Heading conflicts
   - Speed restrictions missed

3. MISSED CRITICAL INFORMATION:
   - Pilots acknowledging but not acting on critical instructions
   - Important safety warnings ignored or minimized
   - Weather hazards (windshear, turbulence) downplayed
   - System failures not properly addressed

4. COMMUNICATION ERRORS:
   - Incorrect readback of critical information
   - Callsign confusion
   - Misunderstood clearances

5. PROCEDURAL VIOLATIONS:
   - Skipped checklists in critical phases
   - Stabilized approach criteria not met
   - Standard Operating Procedures not followed

6. TECHNICAL ISSUES DOWNPLAYED:
   - Engine anomalies dismissed as "sensor glitches"
   - Pressure/temperature warnings ignored
   - System malfunctions not properly investigated

ANALYZE THE TRANSCRIPT:
Look for any of the above situations. If pilots are unaware of a safety risk, missed critical information, 
or are making potentially dangerous assumptions, answer 'yes'.

If everything appears normal and safe, answer 'no'.

Answer ONLY 'yes' or 'no'."""
            
            prompt = f"""{system_prompt}

Transcript: {transcript}

Is there a need to advise the pilots? Answer only 'yes' or 'no'."""
            
            response = self.gemini_model.generate_content(prompt)
            response_text = response.text.strip().lower()
            
            print(f"✈️ [Pilots Advisor] Gemini response: '{response_text}'")
            
            # Parse yes/no response
            needs_intervention = "yes" in response_text
            
            # If intervention needed, generate emergency instructions
            if needs_intervention:
                print(f"🚨 [Pilots Advisor] INTERVENTION NEEDED - generating instructions...")
                instructions = await self.generate_emergency_instructions(transcript, aircraft_callsign)
                
                if instructions.get("success"):
                    return {
                        "needs_intervention": True,
                        "summary": instructions["summary"],
                        "agent_message": instructions["agent_message"],
                        "success": True,
                        "error": None
                    }
                else:
                    # Even if instruction generation fails, still report intervention needed
                    return {
                        "needs_intervention": True,
                        "summary": "Emergency detected but failed to generate detailed instructions",
                        "agent_message": "Attention: Potential safety issue detected in cockpit conversation. Please review current situation.",
                        "success": True,
                        "error": instructions.get("error")
                    }
            else:
                # No intervention needed
                return {
                    "needs_intervention": False,
                    "success": True,
                    "error": None
                }
                
        except Exception as e:
            error_msg = f"Cockpit analysis error: {str(e)}"
            print(f"❌ {error_msg}")
            return {"error": error_msg, "success": False, "needs_intervention": False}


# Singleton instance
voice_service = VoiceService()
