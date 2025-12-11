# ✈️ Aircraft Callsign Feature - Context-Aware Instructions

## Problem
Agent generował instrukcje dla WSZYSTKICH samolotów w konwersacji, zamiast skupić się na TWOIM samolocie.

**Przykład problemu:**
```
Konwersacja:
- "Coastal 115, line up and wait runway 28"
- "Skyline 24 Alpha, cleared to land runway 28"

Agent mówił do obu:
"Coastal 115 is holding on runway, Skyline is landing..."
```

## Rozwiązanie
Dodano **input field dla callsign Twojego samolotu** w navbarze.

Teraz agent generuje instrukcje **TYLKO dla Ciebie**! 🎯

---

## Changes Made

### Frontend

#### 1. App.jsx
**Nowy state:**
```javascript
const [aircraftCallsign, setAircraftCallsign] = useState('')
```

**Nowy input w headerze:**
```jsx
<div className="callsign-input-container">
  <label>Your Aircraft Callsign:</label>
  <input
    type="text"
    value={aircraftCallsign}
    onChange={handleCallsignChange}
    placeholder="e.g., Skyline 24 Alpha"
  />
</div>
```

**Przekazanie do VoiceRecorder:**
```jsx
<VoiceRecorder 
  aircraftCallsign={aircraftCallsign}
  ...
/>
```

#### 2. App.css
Nowe style dla callsign input:
- `.callsign-input-container` - container z label
- `.callsign-input` - input field z focus styling
- Blue border, center-aligned, min-width 250px
- Focus effect z box-shadow

#### 3. VoiceRecorder.jsx
Przyjmuje `aircraftCallsign` i przekazuje do hooka:
```javascript
export function VoiceRecorder({ ..., aircraftCallsign }) {
  const {...} = useRealtimeVoice(onAnalysisUpdate, aircraftCallsign);
```

#### 4. useRealtimeVoice.js
**Przyjmuje callsign:**
```javascript
export function useRealtimeVoice(onAnalysisUpdate, aircraftCallsign)
```

**Wysyła w request:**
```javascript
body: JSON.stringify({ 
  transcript: text,
  aircraft_callsign: aircraftCallsign || null
})
```

**Loguje:**
```javascript
console.log('✈️ [Pilots Advisor] Aircraft:', aircraftCallsign || 'Not specified');
```

---

### Backend

#### 1. voice_routes.py
**Rozszerzony request model:**
```python
class AnalyzeRequest(BaseModel):
    transcript: str
    aircraft_callsign: str = None  # ← NEW
```

**Przekazanie do service:**
```python
result = await voice_service.analyze_cockpit_conversation(
    request.transcript, 
    request.aircraft_callsign  # ← NEW
)
```

#### 2. voice_service.py

**Metoda `analyze_cockpit_conversation`:**
```python
async def analyze_cockpit_conversation(
    self, 
    transcript: str, 
    aircraft_callsign: str = None  # ← NEW
):
```

**Updated prompt:**
```python
callsign_context = f"\nMONITORING AIRCRAFT: {aircraft_callsign}\nFocus on safety issues that affect THIS aircraft.\n" if aircraft_callsign else ""

system_prompt = f"""You are an expert aviation safety advisor...
{callsign_context}
..."""
```

**Przekazanie do instruction generator:**
```python
instructions = await self.generate_emergency_instructions(
    transcript, 
    aircraft_callsign  # ← NEW
)
```

**Metoda `generate_emergency_instructions`:**
```python
async def generate_emergency_instructions(
    self, 
    transcript: str, 
    aircraft_callsign: str = None  # ← NEW
):
```

**Updated prompt:**
```python
callsign_context = f"YOUR AIRCRAFT: {aircraft_callsign}\n" if aircraft_callsign else "YOUR AIRCRAFT: Not specified (address all pilots)\n"

prompt = f"""...
{callsign_context}

2. AGENT_MESSAGE:
   - Clear, direct message for pilots IN YOUR AIRCRAFT ({aircraft_callsign or "your aircraft"})
   - IMPORTANT: Focus ONLY on instructions relevant to YOUR aircraft
   - DO NOT give instructions to other aircraft mentioned in the conversation
   ...
"""
```

---

## How It Works

### Step-by-Step Flow

1. **User wpisuje callsign:**
   ```
   Input: "Skyline 24 Alpha"
   ```

2. **User mówi do mikrofonu:**
   ```
   "Coastal 115, line up and wait runway 28.
    Taxi via Bravo, line up and wait runway 28, Coastal 115.
    Skyline 24 Alpha, cleared to land runway 28.
    Cleared to land 28, Skyline 24 Alpha."
   ```

3. **Frontend wysyła request:**
   ```json
   {
     "transcript": "...",
     "aircraft_callsign": "Skyline 24 Alpha"
   }
   ```

4. **Backend analizuje:**
   ```
   ✈️ [Pilots Advisor] Monitoring aircraft: Skyline 24 Alpha
   ✈️ [Pilots Advisor] Analyzing: ...
   ✈️ [Pilots Advisor] Gemini response: 'yes'
   🚨 [Pilots Advisor] INTERVENTION NEEDED - generating instructions...
   ```

5. **Gemini generuje instrukcje TYLKO dla Skyline 24 Alpha:**
   ```json
   {
     "summary": "Coastal 115 is holding on runway 28 while Skyline 24 Alpha is cleared to land on the same runway. This is a runway conflict.",
     "agent_message": "Attention Skyline 24 Alpha: Coastal 115 is currently holding on runway 28. Verify runway is clear before continuing approach or execute go-around."
   }
   ```

6. **Frontend wyświetla:**
   ```
   ⚠️ EMERGENCY - INTERVENTION REQUIRED
   
   🎙️ Agent Instructions:
   Attention Skyline 24 Alpha: Coastal 115 is currently holding 
   on runway 28. Verify runway is clear before continuing approach 
   or execute go-around.
   
   ▶ Context Summary
   ```

---

## Before vs After

### ❌ Before (Without Callsign)

**Agent Message:**
```
Alert: Runway 28 conflict detected. Coastal 115 is holding while 
Skyline 24 Alpha is cleared to land. Both aircraft need to verify 
runway clearance.
```
❌ Mówi do obu samolotów
❌ Niejasne do kogo jest adresowane

### ✅ After (With Callsign: "Skyline 24 Alpha")

**Agent Message:**
```
Attention Skyline 24 Alpha: Coastal 115 is currently holding on 
runway 28. Verify runway is clear before continuing approach or 
execute go-around.
```
✅ Adresowane konkretnie do Skyline 24 Alpha
✅ Jasna instrukcja dla Twojego samolotu
✅ Nie myli z instrukcjami dla innych samolotów

---

## UI/UX

### Callsign Input Field

**Location:** Header, centered pod tytułem

**Styling:**
- Modern rounded input (12px border-radius)
- Blue border (`#3b82f6` on focus)
- Center-aligned text
- Bold font weight (600)
- Placeholder: "e.g., Skyline 24 Alpha"
- Min-width: 250px

**States:**
- **Normal:** Light blue border, white background
- **Focus:** Bright blue border + box-shadow glow
- **Empty:** Agent generuje ogólne instrukcje ("your aircraft")
- **Filled:** Agent generuje instrukcje dla konkretnego samolotu

### Visual Example

```
┌────────────────────────────────────────────┐
│        ✈️ Cockpit Safety Monitor           │
│                                            │
│  Your Aircraft Callsign: [Skyline 24 Alpha]│
│                                            │
│  Click microphone and start speaking...   │
└────────────────────────────────────────────┘
```

---

## Testing

### Test Case 1: With Callsign

**Setup:**
1. Wpisz callsign: `Skyline 24 Alpha`
2. Click microphone
3. Powiedz:
   ```
   Coastal 115, line up and wait runway 28.
   Skyline 24 Alpha, cleared to land runway 28.
   ```

**Expected:**
- ✅ Agent message zaczyna się od "Attention Skyline 24 Alpha:"
- ✅ Instrukcje dotyczą TYLKO Skyline 24 Alpha
- ✅ Nie ma instrukcji dla Coastal 115

### Test Case 2: Without Callsign

**Setup:**
1. NIE wpisuj callsign (zostaw puste)
2. Click microphone
3. Powiedz tę samą konwersację

**Expected:**
- ✅ Agent message używa "your aircraft" zamiast konkretnego callsign
- ✅ Instrukcje są ogólne ale nadal fokus na samolocie, którym się znajdujesz

### Test Case 3: Change Callsign Mid-Session

**Setup:**
1. Wpisz: `United 123`
2. Start recording
3. Zmień callsign na: `Delta 456`
4. Continue recording

**Expected:**
- ✅ Nowy callsign jest używany od następnej analizy
- ✅ Instrukcje są teraz dla Delta 456

---

## Console Logs

### Frontend Logs (with callsign):
```
✈️ [Pilots Advisor] Analyzing: Coastal 115, line up and wait...
✈️ [Pilots Advisor] Aircraft: Skyline 24 Alpha
🚨 [Pilots Advisor] INTERVENTION NEEDED - STOPPING ANALYSIS
📋 Summary: Coastal 115 is holding on runway 28...
📢 Agent Message: Attention Skyline 24 Alpha: Coastal 115 is...
```

### Backend Logs (with callsign):
```
✈️ [Pilots Advisor] Analyzing cockpit conversation: 'Coastal 115, line up...'
✈️ [Pilots Advisor] Monitoring aircraft: Skyline 24 Alpha
✈️ [Pilots Advisor] Gemini response: 'yes'
🚨 [Pilots Advisor] INTERVENTION NEEDED - generating instructions...
🚨 [Emergency Generator] Generating instructions for: 'Coastal 115...'
✅ [Emergency Generator] Success!
   Summary: Coastal 115 is holding on runway 28 while Skyline...
   Agent Message: Attention Skyline 24 Alpha: Coastal 115 is...
```

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `frontend/src/App.jsx` | Added callsign state + input + handler | +15 |
| `frontend/src/App.css` | Callsign input styling | +35 |
| `frontend/src/components/VoiceRecorder.jsx` | Pass callsign to hook | +1 |
| `frontend/src/hooks/useRealtimeVoice.js` | Accept callsign + send in request | +5 |
| `backend/routes/voice_routes.py` | Add aircraft_callsign to request model | +2 |
| `backend/services/voice_service.py` | Add callsign param + update prompts | +15 |
| **TOTAL** | | **~73 lines** |

---

## Benefits

1. **🎯 Precision:** Instrukcje tylko dla Twojego samolotu
2. **🔒 Safety:** Brak mylących instrukcji dla innych samolotów
3. **⚡ Clarity:** Jasne adresowanie "Attention [YOUR CALLSIGN]:"
4. **🧠 Context-Aware:** AI rozumie kto jest kim w konwersacji
5. **🎨 UX:** Prosty, intuicyjny input field
6. **🔄 Flexible:** Możliwość zmiany callsign w każdej chwili

---

## Edge Cases

### Empty Callsign
- ✅ Handled: Agent używa "your aircraft"
- ✅ Instrukcje są nadal generowane
- ✅ Fokus na pilotach w kokpicie (nie na innych samolotach)

### Invalid Callsign Format
- ✅ No validation - user can type anything
- ✅ Backend/AI rozumie różne formaty
- ✅ Works with: "United 123", "N12345", "Delta Four Five Six"

### Multiple Aircraft in Conversation
- ✅ AI focuses on YOUR aircraft
- ✅ Mentions other aircraft only for context
- ✅ Instructions are specific to YOU

### Callsign Not Mentioned in Conversation
- ✅ AI still generates relevant instructions
- ✅ Uses callsign in agent message anyway
- ✅ Focuses on YOUR cockpit situation

---

## Future Enhancements

1. **Callsign Autocomplete**
   - Detect callsign from transcript
   - Suggest auto-fill

2. **Callsign Validation**
   - Validate format (optional)
   - Show suggestions for proper format

3. **Multiple Crew Members**
   - Different callsigns for different roles
   - Pilot Flying vs Pilot Monitoring

4. **Callsign History**
   - Remember last used callsigns
   - Dropdown with recent callsigns

5. **Voice Recognition**
   - Auto-detect YOUR callsign from conversation
   - Pre-fill automatically

---

## Status: ✅ COMPLETE & READY TO TEST

**Test scenario:**
1. Wpisz callsign: `Skyline 24 Alpha`
2. Powiedz konwersację z dwoma samolotami na tym samym pasie
3. Zobacz że instrukcje są TYLKO dla Skyline 24 Alpha! 🎯

Backend automatycznie się zrestartował - gotowe do testowania! 🚀
