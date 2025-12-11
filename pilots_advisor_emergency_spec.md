# Specyfikacja: Emergency Response System - Automatic Agent Instructions

## Problem
Aktualnie system wykrywa sytuacje wymagające interwencji (przez Pilots Advisor), ale nie generuje automatycznych instrukcji dla agenta głosowego. Kiedy Gemini stwierdzi "yes" (potrzeba interwencji), system od razu pokazuje panic button bez kontekstu - brakuje:
1. Automatycznie wygenerowanej pierwszej wiadomości dla agenta głosowego
2. Podsumowania sytuacji dla kontekstu agenta
3. Zatrzymania dalszych analiz po wykryciu pierwszego zagrożenia

## Stan aktualny

### Backend Flow:
```
[Cockpit transcript co 2s] 
    ↓
[/api/voice/check-cockpit - Pilots Advisor]
    ↓
[Gemini: "yes" lub "no"]
    ↓
[Response: {needs_intervention: true/false}]
    ↓
[Frontend: pokazuje panic button jeśli true]
```

### Problemy:
- ❌ Brak szczegółowych instrukcji CO się stało
- ❌ Brak sugestii JAK temu zaradzić
- ❌ Agent głosowy nie ma kontekstu sytuacji
- ❌ Analiza działa dalej co 2s nawet po wykryciu zagrożenia

## Stan docelowy

### Enhanced Backend Flow:
```
[Cockpit transcript co 2s] 
    ↓
[/api/voice/check-cockpit - Pilots Advisor]
    ↓
[Gemini: "yes"]
    ↓
[STOP periodic analysis] ← NOWE
    ↓
[/api/voice/generate-emergency-instructions] ← NOWE
    ↓
[Gemini 2nd call: generuje summary + agent message]
    ↓
[Response: {
      needs_intervention: true,
      summary: "...",           ← Kontekst dla agenta
      agent_message: "..."       ← Pierwsza wiadomość do wypowiedzenia
    }]
    ↓
[Frontend: wyświetla panic button + instrukcje]
```

## Rozwiązanie techniczne

### Backend Changes

#### 1. Nowy endpoint: `/api/voice/generate-emergency-instructions`
**Lokalizacja:** `backend/routes/voice_routes.py`

**Request:**
```json
{
  "transcript": "cockpit conversation text"
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Pilots are discussing engine pressure drop but haven't initiated emergency checklist",
  "agent_message": "Attention: Engine pressure anomaly detected. Recommend immediate emergency checklist activation - refer to section 8.3 for engine failure procedure.",
  "error": null
}
```

**Opis:** 
- Wywołuje Gemini z promptem do generowania instrukcji
- Zwraca summary (dla kontekstu agenta) + agent_message (pierwsza wiadomość)

#### 2. Nowa metoda w VoiceService: `generate_emergency_instructions()`
**Lokalizacja:** `backend/services/voice_service.py`

**Prompt dla Gemini:**
```
You are an expert aviation safety assistant. Based on the cockpit conversation below, 
generate emergency response instructions for a voice agent.

Provide:
1. SUMMARY: Brief context of what went wrong (for agent's internal context)
2. AGENT_MESSAGE: First message the agent should say to pilots - short suggestion 
   of what went wrong and brief instruction how to address it

Respond in JSON format:
{
  "summary": "...",
  "agent_message": "..."
}

Cockpit conversation: {transcript}
```

**Funkcja:**
- Przyjmuje transcript
- Wywołuje Gemini 2.0 Flash
- Parsuje JSON response
- Zwraca structured data

#### 3. Modyfikacja endpoint: `/api/voice/check-cockpit`
**Zmiana:** Gdy wykryje needs_intervention=true, automatycznie wywołaj drugą metodę i zwróć rozszerzony response.

**Nowy response gdy intervention needed:**
```json
{
  "needs_intervention": true,
  "summary": "...",
  "agent_message": "...",
  "success": true
}
```

**Nowy response gdy no intervention:**
```json
{
  "needs_intervention": false,
  "success": true
}
```

### Frontend Changes

#### 1. Hook: `useRealtimeVoice.js`
**Modyfikacje:**
- Po otrzymaniu `needs_intervention: true` → **zatrzymaj periodic analysis**
- Zapisz `summary` i `agent_message` w state
- Pass data do parent component

**Nowy state:**
```javascript
const [emergencyData, setEmergencyData] = useState(null);
// emergencyData: { summary, agent_message, timestamp }
```

**Logika:**
```javascript
if (data.success && data.needs_intervention) {
  console.log('🚨 EMERGENCY DETECTED - stopping analysis');
  stopPeriodicAnalysis(); // ← NOWE: zatrzymaj dalsze analizy
  
  onAnalysisUpdate({
    needsIntervention: true,
    summary: data.summary,
    agentMessage: data.agent_message,
    timestamp: Date.now()
  });
}
```

#### 2. Component: Display emergency instructions
**Opcja A - Dodać do istniejącego komponentu PanicButton.jsx:**
```jsx
{analysisData?.needsIntervention && (
  <div className="emergency-panel">
    <button className="panic-button">⚠️ EMERGENCY</button>
    
    <div className="emergency-details">
      <h3>Agent Instructions</h3>
      <div className="agent-message">
        {analysisData.agentMessage}
      </div>
      
      <details>
        <summary>Context Summary</summary>
        <div className="summary-text">
          {analysisData.summary}
        </div>
      </details>
    </div>
  </div>
)}
```

**Opcja B - Nowy komponent EmergencyPanel.jsx:**
- Osobny komponent do wyświetlania
- Bardziej modularny
- Łatwiej stylizować

## TODO Lista - Implementacja

### Phase 1: Backend - Emergency Instructions Generator

- [ ] **1.1** Dodać metodę `generate_emergency_instructions()` do `VoiceService`
  - Lokalizacja: `backend/services/voice_service.py`
  - Prompt dla Gemini (jak opisany powyżej)
  - Response parsing (JSON: summary + agent_message)
  - Error handling

- [ ] **1.2** Zmodyfikować metodę `analyze_cockpit_conversation()` w `VoiceService`
  - Jeśli wykryje needs_intervention=true → wywołaj `generate_emergency_instructions()`
  - Zwróć rozszerzony response: `{needs_intervention, summary, agent_message}`
  - Jeśli needs_intervention=false → zwróć tylko `{needs_intervention: false}`

- [ ] **1.3** Zaktualizować endpoint `/api/voice/check-cockpit`
  - Lokalizacja: `backend/routes/voice_routes.py`
  - Obsłużyć nowy format response (z summary i agent_message)
  - Dodać logowanie gdy emergency detected
  - Update docs/comments

### Phase 2: Frontend - Stop Analysis & Display Instructions

- [ ] **2.1** Zmodyfikować `useRealtimeVoice.js` hook
  - State: dodać `emergencyData` do przechowania summary + agent_message
  - W `analyzeTranscript()`: gdy `needs_intervention: true`:
    - Wywołaj `stopPeriodicAnalysis()` **od razu**
    - Zapisz `summary` i `agent_message` w state
    - Pass data do `onAnalysisUpdate()`
  - Export `emergencyData` z hooka

- [ ] **2.2** Zmodyfikować komponent wyświetlający panic button
  - Lokalizacja: `frontend/src/components/PanicButton.jsx` (lub App.jsx)
  - Gdy `needsIntervention: true` wyświetl:
    - Panic button ⚠️
    - Agent message (duży, prominentny tekst)
    - Summary (opcjonalnie zwijany/rozwijany)
  
- [ ] **2.3** Dodać styling dla emergency instructions
  - Lokalizacja: `frontend/src/components/PanicButton.css` lub nowy plik
  - Stylizacja:
    - Panel z czerwonym/pomarańczowym tłem
    - Duży, czytelny font dla agent_message
    - Collapse/expand dla summary
    - Animacja pojawienia się (slide-in / fade-in)

### Phase 3: Testing & Refinement

- [ ] **3.1** Test end-to-end z rzeczywistym scenariuszem
  - Symuluj rozmowę w kokpicie z problemem
  - Sprawdź czy:
    - Pierwszy call wykrywa interwencję
    - Drugi call generuje sensowne instrukcje
    - Frontend wyświetla dane poprawnie
    - Periodic analysis się zatrzymuje

- [ ] **3.2** Test edge cases
  - Co jeśli Gemini nie zwróci JSON w drugim callu?
  - Co jeśli summary/agent_message są puste?
  - Co jeśli sieć zawiedzie między pierwszym a drugim callem?
  - Timeout handling dla drugiego calla

- [ ] **3.3** Walidacja promptu
  - Sprawdź czy wygenerowane instrukcje są:
    - Konkretne (nie ogólnikowe)
    - Krótkie (max 2-3 zdania dla agent_message)
    - Actionable (jasne co zrobić)
  - Iteruj nad promptem jeśli trzeba

- [ ] **3.4** UX Polish
  - Dodać loading state między pierwszym a drugim callem?
    - "⏳ Generating emergency instructions..."
  - Animacje wyświetlania
  - Responsywność na mobile
  - Accessibility (ARIA labels)

### Phase 4: Documentation & Cleanup

- [ ] **4.1** Zaktualizować komentarze w kodzie
  - Opisać flow dla emergency detection
  - Dodać przykłady response
  - Link do tego spec file

- [ ] **4.2** Dodać przykładowy test case
  - Przykładowy transcript który triggeruje emergency
  - Oczekiwany summary i agent_message
  - Do użycia podczas testowania

- [ ] **4.3** README update (opcjonalnie)
  - Dodać sekcję o Emergency Response System
  - Screenshoty UI
  - Opis jak to działa

---

## Przykładowy scenariusz działania

### Input (cockpit conversation):
```
Pilot 1: "We're at 35,000 feet, fuel pressure is dropping on engine 2"
Pilot 2: "Yeah I see that, let me check the gauge"
Pilot 1: "Should we do something about it?"
Pilot 2: "Hmm, not sure, maybe it's just a sensor glitch"
```

### Step 1 - Pilots Advisor (first call):
**Request:** `/api/voice/check-cockpit`
```json
{"transcript": "..."}
```

**Response:**
```json
{"needs_intervention": true}
```

**Reasoning:** Pilots notice fuel pressure drop but are not taking action, suggesting it's "just a sensor glitch" - dangerous assumption.

### Step 2 - Emergency Instructions (second call):
**Automatic trigger** po wykryciu intervention

**Response:**
```json
{
  "needs_intervention": true,
  "summary": "Engine 2 fuel pressure dropping at 35,000 feet. Pilots observed issue but dismissed it as possible sensor malfunction without verification. No emergency checklist initiated.",
  "agent_message": "Immediate attention required: Engine 2 fuel pressure anomaly detected. Recommend activating fuel system emergency checklist section 8.2 and prepare for possible engine shutdown procedure. Do not assume sensor failure without verification.",
  "success": true
}
```

### Step 3 - Frontend Display:
```
┌─────────────────────────────────────────┐
│  ⚠️ EMERGENCY - INTERVENTION REQUIRED   │
├─────────────────────────────────────────┤
│                                         │
│  Agent Instruction:                     │
│  "Immediate attention required: Engine  │
│   2 fuel pressure anomaly detected.     │
│   Recommend activating fuel system      │
│   emergency checklist section 8.2..."   │
│                                         │
│  ▼ Show Context Summary                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Uwagi techniczne

### Dlaczego zatrzymujemy periodic analysis?
- Po wykryciu pierwszego zagrożenia dalsze analizy co 2s są zbędne
- Oszczędzamy API calls do Gemini
- Lepszy UX - jeden jasny alert zamiast wielu
- Można później dodać funkcję "Resume monitoring" jeśli potrzeba

### Dlaczego dwa osobne calle zamiast jednego?
1. **Separation of concerns:** Advisor sprawdza CZY interwencja, generator tworzy JAK interweniować
2. **Performance:** Większość czasu nie ma zagrożenia - unikamy generowania instrukcji za każdym razem
3. **Lepsze prompty:** Każdy call ma wyspecjalizowany prompt
4. **Łatwiejsze debugowanie:** Widzimy osobno "decision" vs "instruction generation"

### Format JSON response
Używamy JSON dla consistency i łatwego parsowania. Alternatywnie można użyć:
- Structured output z Gemini
- Własny parsing tekstu
Ale JSON jest najbardziej reliable.

---

## Szacowany czas implementacji

- **Backend (Phase 1):** 1-2 godziny
- **Frontend (Phase 2):** 1-2 godziny  
- **Testing (Phase 3):** 1 godzina
- **Polish & Docs (Phase 4):** 30 minut

**Total MVP:** ~4-5 godzin

---

## Możliwe rozszerzenia (przyszłość)

1. **Multi-level alerts:** Warning / Caution / Emergency
2. **Agent voice synthesis:** TTS dla agent_message
3. **History log:** Zapisuj wszystkie emergency events
4. **Acknowledge button:** Pilot potwierdza że przeczytał instrukcję
5. **Resume monitoring:** Przycisk do wznowienia periodic analysis
6. **Real-time updates:** Jeśli sytuacja się zmienia, update instrukcji
7. **Multilingual:** Polski + angielski agent messages

---

## Dependencies

**Backend:**
- ✅ `google-generativeai` (already installed)
- ✅ Gemini API key (already configured)

**Frontend:**
- ✅ Existing components (PanicButton.jsx)
- ✅ Existing hook (useRealtimeVoice.js)

**No new dependencies needed!** 🎉
