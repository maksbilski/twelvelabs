# ElevenLabs Conversational Agent Integration - Specyfikacja Techniczna

## 📋 Przegląd

Integracja komponentu konwersacyjnego agenta ElevenLabs z istniejącym frontendem aplikacji Cockpit Safety Monitor. Agent ma być wywoływany automatycznie po wykryciu sytuacji zagrożenia i kliknięciu panic button, zapewniając pilotom natychmiastową pomoc głosową.

---

## 🎯 Cel

Gdy system wykryje sytuację wymagającą interwencji (`needsIntervention: true`):
1. Pokazuje się **Panic Button** z informacją o zagrożeniu
2. Po kliknięciu Panic Button otwiera się **modal z agentem ElevenLabs**
3. Agent otrzymuje kontekst sytuacji przez **dynamic variables**
4. Agent automatycznie rozpoczyna rozmowę z pilotami
5. Po zakończeniu rozmowy użytkownik wraca do głównego ekranu

---

## 🏗️ Architektura Rozwiązania

### Obecny Flow:
```
VoiceRecorder 
  → nagrywa rozmowę kokpitu
  → wysyła do backend: POST /api/voice/check-cockpit
  → backend zwraca: { needsIntervention, summary, agentMessage }
  → jeśli needsIntervention = true
    → pokazuje PanicButton
    → onClick: dismissuje button (TODO)
```

### Nowy Flow:
```
VoiceRecorder 
  → nagrywa rozmowę kokpitu
  → wysyła do backend: POST /api/voice/check-cockpit
  → backend zwraca: { needsIntervention, summary, agentMessage }
  → jeśli needsIntervention = true
    → pokazuje PanicButton z emergencyData
    → onClick PanicButton:
      ✨ OTWIERA MODAL z agentem ElevenLabs
      ✨ przekazuje dynamic variables:
         - transcript_analysis = transcript + "\n\n" + summary
         - first_prompt = agentMessage
      ✨ agent automatycznie rozpoczyna rozmowę
    → po zakończeniu rozmowy:
      → zamyka modal
      → wraca do głównego ekranu
```

---

## 📦 Komponenty do Stworzenia/Zmodyfikowania

### 1. **Nowy Komponent: `VoiceAgentModal.jsx`**
   - Modal wrapper na całym ekranie
   - Zawiera komponent agenta konwersacyjnego
   - Przyjmuje dynamic variables
   - Ma przyciski: "End Conversation" i "X" (zamknij)

### 2. **Nowy Komponent: `ConversationAgent.jsx`**
   - Port z `NEW_FRONT/frontend/src/pages/ConversationPage.jsx`
   - Inicjalizuje agenta ElevenLabs
   - Przyjmuje props: `transcriptAnalysis`, `firstPrompt`
   - Przekazuje je jako dynamic variables do ElevenLabs

### 3. **Modyfikacja: `App.jsx`**
   - Dodanie stanu `showAgentModal`
   - Przekazywanie emergencyData i transkryptu do modala
   - Handler dla zamknięcia modala

### 4. **Modyfikacja: `PanicButton.jsx`**
   - onClick wywołuje callback z parent (App.jsx)
   - Zamiast dismissować, otwiera modal z agentem

### 5. **Nowy CSS: `VoiceAgentModal.css`**
   - Style dla modala
   - Overlay z tłem
   - Animacje otwarcia/zamknięcia

---

## 🔧 Implementacja Krok Po Kroku

### Krok 1: Instalacja Zależności

W głównym folderze `frontend/`:

```bash
npm install @elevenlabs/client
```

**Plik:** `frontend/package.json`
- Dodaje: `"@elevenlabs/client": "latest"`

---

### Krok 2: Stworzenie Komponentu `ConversationAgent.jsx`

**Lokalizacja:** `frontend/src/components/ConversationAgent.jsx`

**Props:**
- `transcriptAnalysis` (string) - Połączony transkrypt + summary
- `firstPrompt` (string) - Pierwsza wiadomość agenta
- `onEnd` (function) - Callback gdy rozmowa się kończy

**Funkcjonalność:**
1. Inicjalizuje połączenie z ElevenLabs agent
2. Przekazuje dynamic variables:
   ```javascript
   dynamicVariables: {
     transcript_analysis: transcriptAnalysis,
     first_prompt: firstPrompt
   }
   ```
3. **NIE wysyła** `sendContextualUpdate` - wszystko przez dynamic variables
4. Wyświetla status połączenia (connecting, active, error)
5. Pokazuje wizualizację rozmowy (agent speaking/listening)
6. Przycisk "End Conversation" wywołuje `onEnd()`

**Agent ID:** `agent_4401kc79jma5e189ep8as6wm64mp` (hardcoded lub z .env)

**Kluczowe fragmenty kodu:**

```javascript
const conv = await Conversation.startSession({
  agentId: 'agent_4401kc79jma5e189ep8as6wm64mp',
  connectionType: 'websocket',
  
  // DYNAMIC VARIABLES - tutaj przekazujemy kontekst
  dynamicVariables: {
    transcript_analysis: transcriptAnalysis,
    first_prompt: firstPrompt
  },
  
  onConnect: () => {
    console.log('✅ Connected to safety agent');
    setStatus('connected');
    // NIE wysyłamy sendContextualUpdate!
  },
  
  onDisconnect: (reason) => {
    console.log('❌ Disconnected:', reason);
    setStatus('disconnected');
  },
  
  // ... pozostałe callbacki
});
```

**Struktura komponentu:**
```jsx
<div className="conversation-agent">
  {/* Header */}
  <div className="agent-header">
    <h2>🎙️ Safety Officer</h2>
    <StatusBadge status={status} />
  </div>
  
  {/* Connection states */}
  {status === 'connecting' && <LoadingSpinner />}
  {status === 'error' && <ErrorMessage error={error} />}
  
  {/* Active conversation */}
  {status === 'active' && (
    <div className="conversation-active">
      <AgentAvatar speaking={isAgentSpeaking} />
      <WaveVisualizer active={isAgentSpeaking || isUserSpeaking} />
      <UserAvatar speaking={isUserSpeaking} />
    </div>
  )}
  
  {/* Controls */}
  <button onClick={handleEndConversation}>End Conversation</button>
</div>
```

---

### Krok 3: Stworzenie Komponentu `VoiceAgentModal.jsx`

**Lokalizacja:** `frontend/src/components/VoiceAgentModal.jsx`

**Props:**
- `visible` (boolean) - Czy modal jest widoczny
- `transcriptAnalysis` (string) - Kontekst dla agenta
- `firstPrompt` (string) - Pierwsza wiadomość
- `onClose` (function) - Callback gdy modal się zamyka

**Funkcjonalność:**
1. Full-screen overlay z tłem (rgba blur)
2. Centrowany modal box
3. Przycisk X w rogu do zamknięcia
4. Zawiera komponent `<ConversationAgent />`
5. Animacje fade-in/fade-out
6. Blokuje scroll body gdy otwarty
7. Zamyka się po kliknięciu tła (overlay) lub przycisku X

**Struktura:**
```jsx
<div className={`agent-modal-overlay ${visible ? 'visible' : ''}`} onClick={handleOverlayClick}>
  <div className="agent-modal-content" onClick={e => e.stopPropagation()}>
    {/* Close button */}
    <button className="modal-close-btn" onClick={onClose}>✕</button>
    
    {/* Agent component */}
    <ConversationAgent
      transcriptAnalysis={transcriptAnalysis}
      firstPrompt={firstPrompt}
      onEnd={onClose}
    />
  </div>
</div>
```

**CSS klasy:**
- `.agent-modal-overlay` - Full screen overlay z backdrop-filter
- `.agent-modal-content` - Centrowany box z contentem
- `.modal-close-btn` - Przycisk X w prawym górnym rogu
- Animacje: `@keyframes fadeIn`, `@keyframes slideIn`

---

### Krok 4: Modyfikacja `App.jsx`

**Zmiany:**

1. **Import nowego komponentu:**
```javascript
import { VoiceAgentModal } from './components/VoiceAgentModal'
```

2. **Dodanie state dla modala:**
```javascript
const [showAgentModal, setShowAgentModal] = useState(false)
```

3. **Modyfikacja `handlePanicButtonClick`:**
```javascript
const handlePanicButtonClick = () => {
  console.log('🚨 [App] Panic button clicked - opening agent modal');
  
  // Otwórz modal z agentem zamiast dismissować
  setShowAgentModal(true);
  
  // Panic button pozostaje widoczny (lub ukryj go - do decyzji)
  // setShowPanicButton(false); // opcjonalnie
}
```

4. **Dodanie handlera zamknięcia modala:**
```javascript
const handleAgentModalClose = () => {
  console.log('🔒 [App] Agent modal closed');
  setShowAgentModal(false);
  
  // Ukryj również panic button po zakończeniu rozmowy
  setShowPanicButton(false);
  setEmergencyData(null);
}
```

5. **Przygotowanie danych dla agenta:**
```javascript
// W JSX, przed returnem:
const transcriptAnalysis = emergencyData 
  ? `${transcript}\n\n${emergencyData.summary}`
  : '';
```

6. **Dodanie komponentu w JSX:**
```jsx
return (
  <div className="App">
    {/* Istniejące komponenty... */}
    
    {/* Panic Button */}
    <PanicButton 
      visible={showPanicButton}
      onClick={handlePanicButtonClick}
      emergencyData={emergencyData}
    />
    
    {/* Voice Recorder */}
    <VoiceRecorder 
      onTranscriptUpdate={handleTranscriptUpdate}
      onAnalysisUpdate={handleAnalysisUpdate}
      aircraftCallsign={aircraftCallsign}
    />
    
    {/* 🆕 NOWY: Agent Modal */}
    <VoiceAgentModal
      visible={showAgentModal}
      transcriptAnalysis={transcriptAnalysis}
      firstPrompt={emergencyData?.agentMessage || ''}
      onClose={handleAgentModalClose}
    />
  </div>
)
```

---

### Krok 5: Modyfikacja `PanicButton.jsx`

**Zmiana:** onClick już działa poprawnie, nie trzeba modyfikować.

Obecnie:
```jsx
<button className="panic-button-dismiss" onClick={onClick}>
  Acknowledge & Dismiss
</button>
```

To wywołuje `handlePanicButtonClick` z App.jsx, który teraz otworzy modal.

**Opcjonalnie:** Można zmienić tekst przycisku na:
```jsx
<button className="panic-button-dismiss" onClick={onClick}>
  🎙️ Talk to Safety Officer
</button>
```

---

### Krok 6: Stworzenie CSS `VoiceAgentModal.css`

**Lokalizacja:** `frontend/src/components/VoiceAgentModal.css`

**Kluczowe style:**

```css
/* Overlay - full screen z tłem */
.agent-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.agent-modal-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

/* Modal content box */
.agent-modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideIn 0.3s ease-out;
}

/* Close button */
.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: #f0f0f0;
  color: #000;
}

/* Animations */
@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

### Krok 7: Stworzenie CSS `ConversationAgent.css`

**Lokalizacja:** `frontend/src/components/ConversationAgent.css`

**Port z:** `NEW_FRONT/frontend/src/pages/ConversationPage.css`

Główne klasy:
- `.conversation-agent` - Container
- `.agent-header` - Nagłówek z tytułem
- `.status-badge` - Badge ze statusem połączenia
- `.loading` - Loading spinner
- `.error-message` - Komunikat błędu
- `.conversation-active` - Aktywna rozmowa
- `.participant` - Agent/User avatary
- `.wave-container` - Wizualizacja fali dźwiękowej

---

## 📊 Dynamic Variables - Konfiguracja w ElevenLabs Dashboard

### W ElevenLabs Agent Settings:

1. **Przejdź do:** Agent Settings → Personalization → Dynamic Variables

2. **Dodaj zmienne:**

   **Variable 1:**
   - Name: `transcript_analysis`
   - Type: `string`
   - Description: "Cockpit transcript and safety analysis"
   - Placeholder (for testing): "Test transcript analysis"

   **Variable 2:**
   - Name: `first_prompt`
   - Type: `string`
   - Description: "First message agent should say to pilots"
   - Placeholder (for testing): "Alert: Safety issue detected"

3. **W System Prompt agenta, użyj:**
   ```
   You are a Safety Officer providing urgent assistance to pilots.
   
   SITUATION ANALYSIS:
   {{transcript_analysis}}
   
   YOUR FIRST MESSAGE TO PILOTS:
   {{first_prompt}}
   
   Start the conversation by saying the first message, then listen to pilots' response.
   Provide clear, actionable guidance to resolve the safety issue.
   ```

4. **W First Message:**
   ```
   {{first_prompt}}
   ```

**WAŻNE:** Dynamic variables muszą być dokładnie takie jak w kodzie:
- `transcript_analysis` (z podkreślnikiem, małe litery)
- `first_prompt` (z podkreślnikiem, małe litery)

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Cockpit Recording                       │
│                    (VoiceRecorder)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         POST /api/voice/check-cockpit
                     │
                     ▼
        ┌────────────────────────────┐
        │ Backend Analysis (Gemini)  │
        │  - analyze_cockpit_conv()  │
        │  - generate_emergency_     │
        │    instructions()          │
        └────────────┬───────────────┘
                     │
                     ▼
          needsIntervention = true?
                     │
        ┌────────────┴────────────┐
        │ YES                     │ NO → Continue recording
        ▼                         
┌───────────────────┐
│  Show Panic Button│
│  + emergencyData  │
└────────┬──────────┘
         │
         ▼ onClick
┌────────────────────────────────────────────┐
│    Open VoiceAgentModal (popup)            │
│                                            │
│  Props passed:                             │
│  - transcriptAnalysis = transcript +       │
│                         "\n\n" + summary   │
│  - firstPrompt = agentMessage              │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│      ConversationAgent Component           │
│                                            │
│  Conversation.startSession({               │
│    agentId: 'agent_440...',                │
│    dynamicVariables: {                     │
│      transcript_analysis: ...,             │
│      first_prompt: ...                     │
│    }                                       │
│  })                                        │
└────────┬───────────────────────────────────┘
         │
         ▼
    Agent speaks
    (using first_prompt)
         │
         ▼
   Pilot responds
         │
         ▼
    Conversation...
         │
         ▼
  Click "End Conversation"
         │
         ▼
┌────────────────────┐
│  Close Modal       │
│  Back to Main      │
│  Hide Panic Button │
└────────────────────┘
```

---

## 📁 Struktura Plików

```
frontend/src/
├── components/
│   ├── VoiceRecorder.jsx          [EXISTING]
│   ├── VoiceRecorder.css          [EXISTING]
│   ├── PanicButton.jsx            [EXISTING - minor text change optional]
│   ├── PanicButton.css            [EXISTING]
│   ├── ConversationAgent.jsx      [🆕 NEW]
│   ├── ConversationAgent.css      [🆕 NEW]
│   ├── VoiceAgentModal.jsx        [🆕 NEW]
│   └── VoiceAgentModal.css        [🆕 NEW]
├── App.jsx                        [MODIFIED]
├── App.css                        [EXISTING]
└── ...

NEW_FRONT/                         [REFERENCE - do not modify]
└── frontend/src/pages/
    └── ConversationPage.jsx       [PORT TO ConversationAgent.jsx]
    └── ConversationPage.css       [PORT TO ConversationAgent.css]
```

---

## 🔐 Environment Variables

**Plik:** `frontend/.env`

```bash
# ElevenLabs Agent ID
VITE_ELEVENLABS_AGENT_ID=agent_4401kc79jma5e189ep8as6wm64mp
```

**Użycie w kodzie:**
```javascript
const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_4401kc79jma5e189ep8as6wm64mp';
```

---

## ✅ Checklist Implementacji

### Frontend - Nowe Komponenty:
- [ ] Zainstalować `@elevenlabs/client` w `frontend/package.json`
- [ ] Stworzyć `ConversationAgent.jsx` (port z NEW_FRONT/ConversationPage.jsx)
- [ ] Stworzyć `ConversationAgent.css` (port z NEW_FRONT/ConversationPage.css)
- [ ] Stworzyć `VoiceAgentModal.jsx` (modal wrapper)
- [ ] Stworzyć `VoiceAgentModal.css` (modal styles)

### Frontend - Modyfikacje:
- [ ] Zmodyfikować `App.jsx`:
  - [ ] Dodać state `showAgentModal`
  - [ ] Zmodyfikować `handlePanicButtonClick` aby otwierał modal
  - [ ] Dodać `handleAgentModalClose`
  - [ ] Przygotować `transcriptAnalysis` (transcript + summary)
  - [ ] Dodać `<VoiceAgentModal />` w JSX
- [ ] [OPCJONALNE] Zmienić tekst przycisku w `PanicButton.jsx`

### ElevenLabs Dashboard:
- [ ] Dodać dynamic variable: `transcript_analysis`
- [ ] Dodać dynamic variable: `first_prompt`
- [ ] Zaktualizować System Prompt aby używał `{{transcript_analysis}}`
- [ ] Ustawić First Message na `{{first_prompt}}`

### Testing:
- [ ] Test 1: Symulować sytuację zagrożenia
- [ ] Test 2: Sprawdzić czy panic button się pokazuje
- [ ] Test 3: Kliknąć panic button → modal się otwiera
- [ ] Test 4: Sprawdzić czy agent otrzymuje poprawne dane
- [ ] Test 5: Sprawdzić czy agent mówi `first_prompt`
- [ ] Test 6: Przeprowadzić rozmowę z agentem
- [ ] Test 7: Kliknąć "End Conversation" → modal się zamyka
- [ ] Test 8: Sprawdzić czy panic button znika po zamknięciu

---

## 🐛 Potencjalne Problemy i Rozwiązania

### Problem 1: Agent nie otrzymuje dynamic variables
**Symptom:** Agent mówi defaultowe hello message zamiast first_prompt

**Rozwiązanie:**
1. Sprawdź w ElevenLabs Dashboard czy zmienne są poprawnie skonfigurowane
2. Sprawdź w konsoli czy `dynamicVariables` są przekazywane w `startSession`
3. Sprawdź czy nazwy zmiennych się zgadzają (case-sensitive!)

### Problem 2: Modal nie zamyka się po kliknięciu overlay
**Symptom:** Kliknięcie tła nie zamyka modala

**Rozwiązanie:**
```javascript
const handleOverlayClick = (e) => {
  // Zamknij tylko jeśli kliknięto na overlay, nie na content
  if (e.target === e.currentTarget) {
    onClose();
  }
}
```

### Problem 3: Mikrofon nie działa w modale
**Symptom:** Agent nie słyszy użytkownika

**Rozwiązanie:**
1. Sprawdź uprawnienia mikrofonu w przeglądarce
2. Sprawdź czy `connectionType: 'websocket'` jest ustawione
3. Sprawdź logi w konsoli z callbacks `onError`

### Problem 4: Scroll body nie wraca po zamknięciu modala
**Symptom:** Strona pozostaje zablokowana do scrollowania

**Rozwiązanie:**
```javascript
useEffect(() => {
  if (visible) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [visible]);
```

---

## 📝 Example Code Snippets

### Przykład: transcriptAnalysis concatenation

```javascript
// W App.jsx
const transcriptAnalysis = emergencyData 
  ? `COCKPIT TRANSCRIPT:\n${transcript}\n\nSAFETY ANALYSIS:\n${emergencyData.summary}`
  : '';
```

### Przykład: Dynamic Variables w ElevenLabs

```javascript
dynamicVariables: {
  transcript_analysis: "COCKPIT TRANSCRIPT:\nCoastal 115 line up and wait...\n\nSAFETY ANALYSIS:\nMultiple aircraft on same runway...",
  first_prompt: "Alert: Runway conflict detected. Aircraft cleared to land on runway 28 while you're holding. Immediate action required."
}
```

### Przykład: ConversationAgent podstawowa struktura

```javascript
import { useState, useEffect, useRef } from 'react';
import { Conversation } from '@elevenlabs/client';
import './ConversationAgent.css';

function ConversationAgent({ transcriptAnalysis, firstPrompt, onEnd }) {
  const [conversation, setConversation] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const conversationRef = useRef(null);

  useEffect(() => {
    startConversation();
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
    };
  }, []);

  const startConversation = async () => {
    try {
      const conv = await Conversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_4401kc79jma5e189ep8as6wm64mp',
        connectionType: 'websocket',
        
        dynamicVariables: {
          transcript_analysis: transcriptAnalysis,
          first_prompt: firstPrompt
        },
        
        onConnect: () => {
          console.log('✅ Agent connected');
          setStatus('connected');
        },
        
        onDisconnect: () => {
          setStatus('disconnected');
        },
        
        onError: (err) => {
          console.error('❌ Agent error:', err);
          setError(err.message);
          setStatus('error');
        }
      });
      
      conversationRef.current = conv;
      setConversation(conv);
      setStatus('active');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleEndConversation = () => {
    if (conversationRef.current) {
      conversationRef.current.endSession();
    }
    onEnd();
  };

  return (
    <div className="conversation-agent">
      {/* UI implementation here */}
      <button onClick={handleEndConversation}>End Conversation</button>
    </div>
  );
}

export default ConversationAgent;
```

---

## 🎨 UI/UX Considerations

1. **Modal Accessibility:**
   - Escape key zamyka modal
   - Focus trap wewnątrz modala
   - ARIA labels dla screen readers

2. **Loading States:**
   - Spinner podczas łączenia z agentem
   - Komunikat "Connecting to Safety Officer..."
   - Timeout handling (30s max)

3. **Error Handling:**
   - Przyjazne komunikaty błędów
   - Przycisk "Retry" przy błędach połączenia
   - Fallback do panic button info jeśli agent nie działa

4. **Visual Feedback:**
   - Animacja fali podczas mówienia agenta
   - Zmiana kolorów statusu (green = active, red = error)
   - Pulsująca ikona podczas słuchania

5. **Mobile Responsive:**
   - Modal zajmuje 95% szerokości na mobile
   - Większe przyciski dotykowe
   - Scroll w razie potrzeby

---

## 🚀 Deployment Notes

1. **Environment Variables:**
   - Upewnij się że `VITE_ELEVENLABS_AGENT_ID` jest ustawione w production
   - Backend wymaga `ELEVENLABS_API_KEY` (już skonfigurowane)

2. **Build:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Testing przed deployment:**
   - Test na różnych przeglądarkach (Chrome, Firefox, Safari)
   - Test na mobile devices
   - Test połączenia z agentem w production environment

---

## 📚 Referencje

- **ElevenLabs Dynamic Variables:** https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables
- **ElevenLabs Conversation SDK:** https://elevenlabs.io/docs/agents-platform/libraries
- **Obecny backend:** `backend/services/voice_service.py` (linie 180-291, 293-429)
- **Reference implementation:** `NEW_FRONT/frontend/src/pages/ConversationPage.jsx`

---

## ✨ Future Enhancements

1. **Conversation History:**
   - Zapisywanie transkryptu rozmowy z agentem
   - Możliwość replay/review po rozmowie

2. **Multi-language Support:**
   - Auto-detect języka pilotów
   - Dynamiczny wybór agenta wg języka

3. **Analytics:**
   - Czas trwania rozmów
   - Skuteczność interwencji
   - Najczęstsze problemy

4. **Advanced UI:**
   - Live transcript rozmowy z agentem
   - Visualization of detected issues
   - Links to relevant procedures/checklists

---

**Dokument stworzony:** 2025-12-11  
**Wersja:** 1.0  
**Autor:** AI Assistant (Cursor/Claude)  
**Status:** ✅ Ready for Implementation
