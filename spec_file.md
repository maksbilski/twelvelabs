# Specyfikacja: Real-time Voice Transcription

## Problem
Chcemy dodać do aktualnej prostej aplikacji (FastAPI + React) funkcjonalność real-time transkrypcji głosu. Użytkownik ma móc mówić do mikrofonu, a tekst ma pojawiać się na żywo na ekranie. Opcjonalnie, transkrypcja może być analizowana przez LLM (Anthropic Claude).

## Architektura rozwiązania

### Ogólny przepływ danych
```
[Mikrofon użytkownika] 
    ↓ (audio stream)
[Frontend - React]
    ↓ (WebSocket - audio chunks)
[Backend - FastAPI]
    ↓ (API call)
[ElevenLabs Scribe v2 Realtime]
    ↓ (transcription)
[Backend - FastAPI]
    ↓ (WebSocket - text)
[Frontend - React]
    ↓
[Wyświetlenie na ekranie]
```

### Komponenty do implementacji

#### 1. **Backend (FastAPI)**
- **WebSocket endpoint** (`/api/voice/realtime`) dla real-time audio streaming
- **REST endpoint** (`/api/voice/token`) do generowania tokenów ElevenLabs
- **Integracja z ElevenLabs Scribe v2** do transkrypcji audio
- *Opcjonalnie*: endpoint do analizy transkrypcji przez Claude

#### 2. **Frontend (React)**
- **Komponent VoiceRecorder** - minimalistyczny UI z przyciskiem mikrofonu
- **Hook useRealtimeVoice** - logika obsługi WebSocket i audio streaming
- **Wyświetlanie live transkrypcji** - prosty panel tekstowy pokazujący co użytkownik mówi

#### 3. **Komunikacja**
- **WebSocket** - dwukierunkowa komunikacja real-time
  - Frontend → Backend: chunki audio (base64)
  - Backend → Frontend: transkrypcja (partial i committed)

### Szczegóły techniczne

#### Audio processing
1. **Frontend** przechwytuje audio z mikrofonu (Web Audio API)
2. **Resampling** do 16kHz (wymagane przez ElevenLabs)
3. **Konwersja** Float32 → Int16 (PCM)
4. **Kodowanie** do base64
5. **Wysyłka** przez WebSocket co ~100ms

#### ElevenLabs Scribe v2 Realtime
- Model: `scribe_v2_realtime`
- Język: polski (`pl`)
- Format audio: PCM 16kHz
- Zwraca:
  - **Partial transcripts** - fragmenty w trakcie mówienia (mogą się zmieniać)
  - **Committed transcripts** - finalne, potwierdzone fragmenty

#### WebSocket Protocol
**Frontend → Backend:**
```json
{
  "type": "audio",
  "data": "<base64 encoded PCM audio>"
}
```

**Backend → Frontend:**
```json
{
  "type": "partial",
  "text": "Nazywam się..."
}
```
```json
{
  "type": "committed", 
  "text": "Nazywam się Jan Kowalski"
}
```

### UI/UX
- **Pływający przycisk mikrofonu** w prawym dolnym rogu
- **Panel transkrypcji** pojawia się podczas nagrywania
- **Animacja "słuchania"** (fale dźwiękowe przy mikrofonie)
- **Live tekst** - partial (szary, italic) + committed (czarny, bold)

---

## TODO Lista - Implementacja

### Phase 1: Backend Setup

- [ ] **1.1** Zaktualizować `backend/requirements.txt`
  - Dodać: `elevenlabs`, `anthropic`, `websockets`, `httpx`, `python-dotenv`

- [ ] **1.2** Stworzyć plik `.env` w rootcie projektu
  - Dodać: `ELEVENLABS_API_KEY=...`
  - Dodać: `ANTHROPIC_API_KEY=...` (opcjonalnie)

- [ ] **1.3** Stworzyć `backend/services/voice_service.py`
  - Klasa `VoiceService` z metodami:
    - `get_elevenlabs_token()` - generuje single-use token
    - `transcribe_realtime()` - helper do połączenia z ElevenLabs (jeśli potrzebny)

- [ ] **1.4** Stworzyć `backend/routes/voice_routes.py`
  - REST endpoint: `GET /api/voice/token` - zwraca token ElevenLabs
  - WebSocket endpoint: `WS /api/voice/realtime` - obsługa real-time audio (opcjonalnie, jeśli chcemy proxy)

- [ ] **1.5** Dodać routes do głównego `backend/main.py`
  - Zaimportować i dodać `voice_routes.router`
  - Sprawdzić CORS (dodać WebSocket support jeśli trzeba)

### Phase 2: Frontend - Audio Handling

- [ ] **2.1** Zainstalować zależności frontendowe
  - `npm install @elevenlabs/react` (SDK ElevenLabs z hookiem useScribe)

- [ ] **2.2** Stworzyć `frontend/src/hooks/useRealtimeVoice.js`
  - Hook oparty na `@elevenlabs/react` - `useScribe`
  - Logika:
    - Pobieranie tokena z backendu (`/api/voice/token`)
    - Połączenie z ElevenLabs (bez wbudowanego mikrofonu - Firefox workaround)
    - Manualne przechwytywanie audio z mikrofonu
    - Resampling do 16kHz
    - Wysyłka przez `scribe.sendAudio()`
    - Obsługa callbacków: `onPartialTranscript`, `onCommittedTranscript`
  - State:
    - `isListening` - czy nagrywa
    - `partialTranscript` - aktualny partial text
    - `committedTranscripts` - array z zatwierdzonymi fragmentami
    - `error` - błędy
  - Funkcje:
    - `startListening()` - rozpocznij nagrywanie
    - `stopListening()` - zatrzymaj
    - `toggleListening()` - przełącz

- [ ] **2.3** Stworzyć `frontend/src/components/VoiceRecorder.jsx`
  - Minimalistyczny UI:
    - Pływający przycisk mikrofonu (position: fixed, bottom-right)
    - Panel z transkrypcją (pokazuje się gdy `isListening === true`)
  - Wykorzystuje hook `useRealtimeVoice`
  - Animacje:
    - Pulsujący przycisk podczas słuchania
    - Fale dźwiękowe (opcjonalnie)

- [ ] **2.4** Stworzyć `frontend/src/components/VoiceRecorder.css`
  - Style dla przycisku, panelu, animacji
  - Responsywność (mobile-friendly)

### Phase 3: Frontend - UI Integration

- [ ] **3.1** Zaktualizować `frontend/src/App.jsx`
  - Dodać komponent `<VoiceRecorder />` do głównego layoutu
  - Prosty layout: nagłówek + obszar z transkrypcją + przycisk voice

- [ ] **3.2** Zaktualizować `frontend/src/App.css`
  - Layout dla strony z transkrypcją
  - Panel do wyświetlania tekstu (duży, czytelny)

- [ ] **3.3** Stworzyć komponent `TranscriptDisplay.jsx`
  - Wyświetla committed transcripts (czarne, finalne)
  - Wyświetla partial transcript (szare, italic, "typing cursor")
  - Auto-scroll w dół gdy nowy tekst

### Phase 4: Opcjonalne - LLM Integration

- [ ] **4.1** Stworzyć endpoint `POST /api/voice/analyze`
  - Przyjmuje transkrypcję jako input
  - Wysyła do Anthropic Claude z promptem (np. "Podsumuj tę wypowiedź")
  - Zwraca odpowiedź LLM

- [ ] **4.2** Dodać przycisk "Analizuj" na frontendzie
  - Po kliknięciu wysyła pełną transkrypcję do `/api/voice/analyze`
  - Wyświetla odpowiedź LLM pod transkrypcją

### Phase 5: Testing & Polish

- [ ] **5.1** Test end-to-end
  - Uruchomić backend: `make run backend`
  - Uruchomić frontend: `make run frontend`
  - Otworzyć przeglądarkę, kliknąć mikrofon
  - Mówić po polsku i sprawdzić czy transkrypcja działa

- [ ] **5.2** Obsługa błędów
  - Brak mikrofonu
  - Brak dostępu do mikrofonu (permissions)
  - Błąd połączenia z ElevenLabs
  - Błąd tokena

- [ ] **5.3** UX improvements
  - Loading states
  - Komunikaty o błędach (user-friendly)
  - Instrukcje dla użytkownika ("Kliknij mikrofon i zacznij mówić")

- [ ] **5.4** Cleanup & Documentation
  - Dodać komentarze w kodzie
  - Zaktualizować README.md z instrukcjami użycia
  - Dodać `.env.example` z przykładowymi kluczami

---

## Uproszczona wersja (MVP)

Jeśli chcesz **absolutne minimum** do szybkiej demonstracji:

### Backend (tylko 2 pliki):
1. `backend/main.py` - dodać endpoint `GET /api/voice/token`
2. `.env` - klucze API

### Frontend (3 pliki):
1. `frontend/src/hooks/useRealtimeVoice.js` - logika audio + ElevenLabs
2. `frontend/src/components/VoiceRecorder.jsx` - UI (przycisk + panel)
3. `frontend/src/App.jsx` - użycie komponentu

**Szacowany czas implementacji MVP:** 2-3 godziny

---

## Wymagania systemowe

- **Node.js** 18+ (frontend)
- **Python** 3.9+ (backend)
- **Mikrofon** w komputerze
- **HTTPS** lub `localhost` (Web Audio API wymaga secure context)
- **Klucze API:**
  - ElevenLabs API Key (scribe_v2_realtime)
  - Anthropic API Key (opcjonalnie)

---

## Możliwe rozszerzenia (przyszłość)

1. **Automatyczne wykrywanie języka** (obecnie hardcoded `pl`)
2. **Zapis transkrypcji** do pliku/bazy danych
3. **Historia sesji** - przechowywanie poprzednich nagrań
4. **Multi-user** - WebSocket rooms dla różnych użytkowników
5. **LLM streaming** - real-time analiza podczas mówienia (co 2s)
6. **Sentiment analysis** - analiza emocji w wypowiedzi
7. **Keywords extraction** - automatyczne tagowanie treści

---

## Notatki techniczne

### Dlaczego nie używamy wbudowanego mikrofonu w useScribe?
Jest bug w SDK ElevenLabs z sample rate w Firefoxie. Dlatego:
1. Łączymy się BEZ opcji `microphone`
2. Ręcznie przechwytujemy audio
3. Resampleujemy do 16kHz
4. Wysyłamy przez `scribe.sendAudio()`

### Dlaczego WebSocket zamiast REST?
Real-time transkrypcja wymaga low-latency komunikacji. WebSocket pozwala na:
- Streaming audio (chunki co ~100ms)
- Natychmiastowe partial transcripts
- Lepsze UX (live feedback)

REST byłby używany tylko dla pojedynczych plików audio (np. upload nagrania).
