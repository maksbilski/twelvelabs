# Specyfikacja: Pilots Advisor - Cockpit Safety Monitor

## Problem

Chcemy dodać do istniejącej aplikacji real-time voice transcription funkcjonalność **Pilots Advisor** - inteligentny system monitorowania rozmów w kokpicie samolotu. System będzie:

1. **Analizował transkrypcję rozmów pilotów w czasie rzeczywistym** (co 2 sekundy)
2. **Wykrywał sytuacje wymagające interwencji** - np. gdy piloci przeoczyli ważny fakt
3. **Wyświetlał "Panic Button"** gdy LLM uzna, że potrzebne jest ostrzeżenie (odpowiedź "yes")
4. **Zapisywał pełną historię transkrypcji** do późniejszego wykorzystania (gdy użytkownik kliknie panic button)

### Przykładowe scenariusze wymagające interwencji:
- Piloci nie zauważyli krytycznej informacji z wieży kontrolnej
- Pominięto ważny krok w checkliście
- Nieświadomość problemów technicznych
- Sprzeczne komunikaty/działania między pilotami

---

## Zmiany w stosunku do obecnej implementacji

### Co BYŁO (language detection):
- Analiza transkrypcji wykrywała język (polski/angielski/etc.)
- Panel pokazywał: "Wykryty język: Polski" + pewność
- Język transkrypcji: **polski** (`pl`)

### Co BĘDZIE (pilots advisor):
- Analiza transkrypcji sprawdza czy potrzebna interwencja
- **Panic Button** wyświetla się zamiast panelu językowego
- Język transkrypcji: **angielski** (`en`)
- Transkrypcja zapisywana w pamięci do przyszłego użycia

---

## Architektura rozwiązania

### Przepływ danych

```
[Mikrofon pilotów]
    ↓ (audio stream)
[Frontend - VoiceRecorder]
    ↓ (real-time transcription)
[ElevenLabs Scribe v2 - English]
    ↓ (transcript updates co ~100ms)
[Frontend - useRealtimeVoice hook]
    ↓ (periodic check co 2s)
[Backend - /api/voice/check-cockpit]
    ↓ (transcript analysis)
[Google Gemini 2.0 Flash]
    ↓ (yes/no decision)
[Backend response]
    ↓ (WebSocket/REST)
[Frontend - App.jsx]
    ↓ (conditional rendering)
[🚨 PANIC BUTTON 🚨] (if "yes")
```

---

## Komponenty do modyfikacji

### Backend Changes

#### 1. **voice_service.py** - nowa metoda
- Dodać metodę: `analyze_cockpit_conversation(transcript: str) -> dict`
- Prompt dla Gemini: System prompt z `decide.md`
- Zwraca: `{"needs_intervention": true/false, "success": true/false}`

#### 2. **voice_routes.py** - nowy endpoint
- Endpoint: `POST /api/voice/check-cockpit`
- Request: `{"transcript": "..."}`
- Response: `{"needs_intervention": true, "success": true}`
- Zastępuje obecny endpoint `/api/voice/analyze` (który wykrywa język)

### Frontend Changes

#### 3. **useRealtimeVoice.js** - modyfikacja hooka
- Zmienić `languageCode` z `'pl'` na `'en'`
- Zmienić endpoint analizy z `/analyze` na `/check-cockpit`
- Callback `onAnalysisUpdate` zwraca teraz: `{needsIntervention: true/false}`
- Zapisywać pełną transkrypcję w state (do przyszłego użycia)

#### 4. **App.jsx** - nowy UI
- Usunąć obecny panel analizy języka (linie 38-57)
- Dodać **Panic Button** component
- Panic Button wyświetla się gdy `needsIntervention === true`
- Button ma być widoczny dopóki nie zniknie (user nie kliknie lub nie zostanie zresetowany)

#### 5. **PanicButton.jsx** - nowy komponent
- Czerwony, pulsujący przycisk
- Tekst: "⚠️ ATTENTION REQUIRED" lub podobny
- Animacja: glow effect, pulsowanie
- onClick handler: póki co nic nie robi (placeholder na przyszłość)

#### 6. **PanicButton.css** - style
- Czerwony kolor (#ff0000 lub podobny)
- Pulsowanie (CSS animation)
- Glow effect (box-shadow)
- Responsywność

---

## TODO Lista - Implementacja

### Phase 1: Backend - Pilots Advisor Logic

- [ ] **1.1** Zaktualizować `backend/services/voice_service.py`
  - Dodać metodę `analyze_cockpit_conversation(transcript: str)`
  - Prompt Gemini (z decide.md):
    ```
    You are expert pilots advisor. Based on conversation in the cockpit 
    you will classify whether there is a need to advise pilots on something. 
    For example they missed an important fact and are not aware of it. 
    Answer yes or no.
    ```
  - Parsować odpowiedź: "yes" → `needs_intervention: true`, "no" → `false`
  - Zwracać JSON: `{"needs_intervention": bool, "success": bool, "error": str|None}`

- [ ] **1.2** Zaktualizować `backend/routes/voice_routes.py`
  - Dodać nowy endpoint `POST /api/voice/check-cockpit`
  - Request model: `CockpitCheckRequest(transcript: str)`
  - Wywołać `voice_service.analyze_cockpit_conversation()`
  - Response: `{"needs_intervention": bool, "success": bool}`
  - Opcjonalnie: można zostawić stary endpoint `/analyze` dla backwards compatibility

- [ ] **1.3** Testowanie backendu
  - Test z przykładową transkrypcją: "Pilot: Check flaps. Co-pilot: Roger."
  - Test z problematyczną transkrypcją: "Pilot: Did we check fuel? Co-pilot: I thought you did."
  - Sprawdzić czy Gemini zwraca "yes"/"no" poprawnie

### Phase 2: Frontend - Hook & Transcript Management

- [ ] **2.1** Zaktualizować `frontend/src/hooks/useRealtimeVoice.js`
  - **Zmienić język**: `languageCode: 'en'` (zamiast `'pl'`)
  - **Zmienić endpoint**: `/api/voice/check-cockpit` (zamiast `/api/voice/analyze`)
  - **Zmienić callback format**:
    ```javascript
    onAnalysisUpdate({
      needsIntervention: data.needs_intervention,
      timestamp: Date.now()
    });
    ```
  - **Dodać state/ref** do przechowywania pełnej transkrypcji:
    ```javascript
    const fullTranscriptHistory = useRef([]);
    // Aktualizuj przy każdym committed transcript
    ```

- [ ] **2.2** Eksportować transkrypcję z hooka
  - Dodać do returna: `fullTranscriptHistory: fullTranscriptHistory.current`
  - Będzie potrzebne gdy user kliknie panic button w przyszłości

### Phase 3: Frontend - Panic Button UI

- [ ] **3.1** Stworzyć `frontend/src/components/PanicButton.jsx`
  ```jsx
  export function PanicButton({ visible, onClick }) {
    if (!visible) return null;
    
    return (
      <div className="panic-button-container">
        <button className="panic-button" onClick={onClick}>
          <span className="panic-icon">⚠️</span>
          <span className="panic-text">ATTENTION REQUIRED</span>
        </button>
      </div>
    );
  }
  ```

- [ ] **3.2** Stworzyć `frontend/src/components/PanicButton.css`
  - Czerwony kolor (#dc2626 lub #ef4444)
  - Pulsowanie animacja:
    ```css
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.6); }
      50% { box-shadow: 0 0 40px rgba(220, 38, 38, 1); }
    }
    ```
  - Duży, widoczny przycisk (padding, font-size)
  - Hover effects
  - Responsywność

- [ ] **3.3** Zaktualizować `frontend/src/App.jsx`
  - Usunąć stary panel analizy (linie 38-57):
    ```jsx
    {/* USUŃ:
    {analysis && (
      <div className="analysis-panel">
        ...language detection...
      </div>
    )}
    */}
    ```
  - Dodać state dla panic button:
    ```jsx
    const [showPanicButton, setShowPanicButton] = useState(false);
    ```
  - Dodać handler dla analizy:
    ```jsx
    const handleAnalysisUpdate = (analysis) => {
      if (analysis.needsIntervention) {
        setShowPanicButton(true);
      }
    };
    ```
  - Dodać PanicButton component:
    ```jsx
    <PanicButton 
      visible={showPanicButton}
      onClick={() => {
        console.log('Panic button clicked!');
        // TODO: Future implementation
      }}
    />
    ```

- [ ] **3.4** Import PanicButton w App.jsx
  ```jsx
  import { PanicButton } from './components/PanicButton';
  ```

### Phase 4: Testing & Polish

- [ ] **4.1** Test end-to-end w języku angielskim
  - Uruchomić backend: `make run-backend`
  - Uruchomić frontend: `make run-frontend`
  - Mówić po angielsku do mikrofonu
  - Sprawdzić czy transkrypcja działa (English)
  - Sprawdzić czy analiza co 2s działa
  - Zasymulować sytuację wymagającą interwencji:
    - "Did we check the fuel?"
    - "I thought you were doing that"
    - Panic button powinien się pojawić

- [ ] **4.2** Edge cases
  - Co jeśli transkrypcja jest za krótka? (< 10 znaków)
  - Co jeśli Gemini zwróci błąd?
  - Co jeśli połączenie z backendem się urwie?
  - Sprawdzić czy panic button nie spamuje (tylko raz się pojawia)

- [ ] **4.3** UX improvements
  - Komunikat gdy panic button się pojawi (opcjonalnie)
  - Dźwięk alertu? (opcjonalnie)
  - Vibration API na mobile? (opcjonalnie)

- [ ] **4.4** Documentation
  - Zaktualizować README.md z nową funkcjonalnością
  - Dodać komentarze w kodzie
  - Dodać `.env.example` z `GEMINI_API_KEY`

### Phase 5: Future Enhancements (Optional)

- [ ] **5.1** Panic Button Click Handler
  - Gdy user kliknie panic button:
    - Wyświetlić modal z pełną transkrypcją
    - Wyświetlić powód interwencji (jeśli LLM zwróci uzasadnienie)
    - Opcje: "Dismiss", "Show More", "Contact ATC"

- [ ] **5.2** Multiple Warnings
  - Historia ostrzeżeń (lista)
  - Licznik ostrzeżeń (badge)
  - Timestamp każdego ostrzeżenia

- [ ] **5.3** Advanced Analysis
  - Gemini zwraca nie tylko "yes/no" ale też:
    - `reason`: dlaczego potrzebna interwencja
    - `severity`: "low"/"medium"/"high"
    - `suggested_action`: co piloci powinni zrobić

---

## Szczegóły techniczne

### Gemini Prompt Details

**System Prompt** (z decide.md):
```
You are expert pilots advisor. Based on conversation in the cockpit 
you will classify whether there is a need to advise pilots on something. 
For example they missed an important fact and are not aware of it. 
Answer yes or no.
```

**User Message**:
```
Transcript: [transkrypcja z ostatnich X sekund]

Is there a need to advise the pilots?
```

**Expected Response**:
- "yes" → panic button
- "no" → no action

**Parsing Strategy**:
```python
response_text = gemini_response.text.strip().lower()
needs_intervention = "yes" in response_text
```

### Transcript Management

**Storage Strategy**:
- `fullTranscriptRef.current` - pełna transkrypcja (string)
- `fullTranscriptHistory.current` - array z segmentami:
  ```javascript
  [
    {text: "...", timestamp: 1234567890, type: "committed"},
    {text: "...", timestamp: 1234567891, type: "partial"}
  ]
  ```

**Why?**
- Potrzebujemy historii gdy user kliknie panic button
- Możemy pokazać context (co było mówione przed/po ostrzeżeniu)

### Panic Button Visibility Logic

**Opcja 1: Persist until dismissed**
```javascript
const [showPanicButton, setShowPanicButton] = useState(false);

// Przy nowej analizie "yes"
if (analysis.needsIntervention) {
  setShowPanicButton(true);
}

// User dismisses
onClick={() => setShowPanicButton(false)}
```

**Opcja 2: Auto-hide after timeout** (NOT IMPLEMENTED)
```javascript
// Panic button znika po 30s
setTimeout(() => setShowPanicButton(false), 30000);
```

**WYBRANA**: Opcja 1 - button zostaje dopóki user nie kliknie (lub nie zrestartuje sesji)

### Language Change Impact

**BYŁO**: `languageCode: 'pl'` → transkrypcja polska
**TERAZ**: `languageCode: 'en'` → transkrypcja angielska

**Impact**:
- Wszystkie transkrypcje będą po angielsku
- Gemini będzie analizować angielskie rozmowy
- UI messages mogą zostać po polsku (to tylko display text)

---

## Environment Variables

### Wymagane klucze API (`.env`):

```bash
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

### Model Gemini:
- `gemini-2.0-flash-exp` (już używany w projekcie)
- Szybki, dobry do real-time analysis

---

## Uproszczona wersja (MVP)

Jeśli chcesz **minimalna implementację** (1-2h):

### Backend (1 plik):
1. `voice_service.py` - dodać metodę `analyze_cockpit_conversation()`
2. `voice_routes.py` - dodać endpoint `/check-cockpit`

### Frontend (3 pliki):
1. `useRealtimeVoice.js` - zmienić język + endpoint
2. `PanicButton.jsx` + `PanicButton.css` - nowy komponent
3. `App.jsx` - usunąć language panel, dodać panic button

**Estimated time**: 2-3 godziny

---

## Testing Scenarios

### Scenario 1: Normal Operation (No Intervention)
**Input**:
```
Pilot: Tower, this is Flight 123, requesting takeoff clearance.
Tower: Flight 123, cleared for takeoff runway 27.
Pilot: Cleared for takeoff runway 27, Flight 123.
```

**Expected**: Panic button **NIE** pojawia się (normal communication)

### Scenario 2: Missed Critical Info (Intervention Needed)
**Input**:
```
Tower: Flight 123, caution, wind shear reported on final approach.
Pilot: Roger, continuing descent.
Co-pilot: Did they say something about wind?
Pilot: I think we're good.
```

**Expected**: Panic button **POJAWIA SIĘ** (pilots nie zareagowali na wind shear warning)

### Scenario 3: Checklist Skipped (Intervention Needed)
**Input**:
```
Pilot: Ready for takeoff.
Co-pilot: All set.
[Tower clears them]
[Takes off]
Co-pilot: Wait, did we do the flaps check?
Pilot: Oh no, I forgot.
```

**Expected**: Panic button **POJAWIA SIĘ** (pominięto checklist)

---

## Możliwe rozszerzenia (Future)

1. **Severity Levels** - panic button w różnych kolorach (yellow/orange/red)
2. **Sound Alerts** - dźwięk gdy pojawi się panic button
3. **Transcript Highlights** - podświetlić fragment który wywołał alert
4. **AI Suggestions** - co piloci powinni zrobić
5. **Multi-language** - obsługa innych języków (francuski, hiszpański)
6. **Offline Mode** - local LLM dla prywatności/latency
7. **Integration z ATC** - automatyczne powiadomienie wieży kontrolnej

---

## File Structure (After Implementation)

```
twelvelabs/
├── backend/
│   ├── services/
│   │   └── voice_service.py          [MODIFIED: +analyze_cockpit_conversation]
│   └── routes/
│       └── voice_routes.py           [MODIFIED: +/check-cockpit endpoint]
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceRecorder.jsx     [NO CHANGE]
│   │   │   ├── PanicButton.jsx       [NEW]
│   │   │   └── PanicButton.css       [NEW]
│   │   ├── hooks/
│   │   │   └── useRealtimeVoice.js   [MODIFIED: lang=en, new endpoint]
│   │   └── App.jsx                   [MODIFIED: panic button instead of language panel]
│
└── pilots_advisor_spec.md            [THIS FILE]
```

---

## Summary

**What we're building**:
- Real-time cockpit conversation monitoring
- AI-powered safety advisor using Gemini
- Panic button that appears when pilots miss something critical
- English language support (was Polish before)

**Key changes**:
- Backend: New endpoint + Gemini prompt for pilot safety
- Frontend: Panic button UI replacing language detection panel
- Hook: English transcription + new analysis endpoint

**Timeline**: 2-3 hours for MVP, 5-6 hours for polished version

---

## Questions / Decisions Made

✅ **Q1**: Jak często analiza? → **A**: Co 2 sekundy (periodic)
✅ **Q2**: Gdzie panic button? → **A**: Zamiast language panel
✅ **Q3**: Jaki LLM? → **A**: Google Gemini 2.0 Flash
✅ **Q4**: Auto-hide? → **A**: NIE, zostaje dopóki user nie kliknie
✅ **Q5**: Zapisywać historię? → **A**: TAK, w memory (ref)
✅ **Q6**: Format odpowiedzi LLM? → **A**: Tylko "yes"/"no"
✅ **Q7**: Wielokrotne "yes"? → **A**: Ignorować (nie inkrementować)
✅ **Q8**: Język? → **A**: Angielski (`en`)

---

**Ready to implement!** 🚀
