# 🎤 TwelveLabs Voice Transcription

Aplikacja do **real-time transkrypcji głosu** z React (frontend) i FastAPI (backend), wykorzystująca **ElevenLabs Scribe v2 Realtime API**.

## ✨ Funkcjonalności

- 🎙️ **Real-time transkrypcja** - mów do mikrofonu, tekst pojawia się na żywo
- 🇵🇱 **Język polski** - pełne wsparcie dla języka polskiego
- 🌊 **Partial + Committed transcripts** - widzisz tekst w trakcie mówienia i finalną wersję
- 🎨 **Minimalistyczny UI** - pływający przycisk mikrofonu z panelem transkrypcji
- ⚡ **Low-latency** - bezpośrednie połączenie frontend → ElevenLabs

## 📁 Struktura projektu

```
├── backend/                 # FastAPI backend
│   ├── main.py             # Główny plik aplikacji
│   ├── routes/             # API endpoints
│   │   └── voice_routes.py # Endpointy dla voice (token)
│   ├── services/           # Logika biznesowa
│   │   └── voice_service.py # Integracja z ElevenLabs
│   └── requirements.txt    # Zależności Python
├── frontend/               # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx         # Główny komponent
│   │   ├── components/
│   │   │   ├── VoiceRecorder.jsx  # Komponent mikrofonu
│   │   │   └── VoiceRecorder.css  # Style
│   │   └── hooks/
│   │       └── useRealtimeVoice.js # Hook do obsługi audio
│   └── package.json
├── .env                    # Klucze API (NIE commituj!)
├── spec_file.md           # Specyfikacja techniczna
└── Makefile
```

## 🚀 Instalacja

### 1. Klucze API

Utwórz plik `.env` w głównym katalogu projektu:

```bash
# .env
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  # opcjonalnie
```

⚠️ **Ważne**: Plik `.env` jest w `.gitignore` - nigdy nie commituj kluczy API!

### 2. Zainstaluj zależności

Zainstaluj wszystkie zależności (backend + frontend):

```bash
make setup
```

Lub ręcznie:

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## ▶️ Uruchomienie

### Opcja 1: Makefile (zalecane)

**Uruchom oba serwisy jednocześnie** w osobnych terminalach:

```bash
# Terminal 1 - Backend
make run backend

# Terminal 2 - Frontend
make run frontend
```

### Opcja 2: Ręcznie

**Backend** (FastAPI):
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```
Backend: http://localhost:8000

**Frontend** (React):
```bash
cd frontend
npm run dev
```
Frontend: http://localhost:5173

## 🎯 Jak używać

1. Otwórz przeglądarkę na http://localhost:5173
2. Kliknij **pływający przycisk mikrofonu** w prawym dolnym rogu
3. Zezwól przeglądarce na dostęp do mikrofonu
4. **Zacznij mówić po polsku**
5. Transkrypcja pojawi się w czasie rzeczywistym!

### Co widzisz na ekranie:

- **Partial text** (szary, kursywa) - tekst w trakcie rozpoznawania
- **Committed text** (czarny, bold) - finalna wersja tekstu
- **Pulsujący przycisk** - wskazuje że nagrywanie jest aktywne
- **Fale dźwiękowe** - animacja podczas słuchania

## 🏗️ Architektura

```
[Mikrofon] → [Frontend] → [ElevenLabs Scribe v2] → [Frontend Display]
                ↓
           [Backend Token API]
```

1. **Frontend** pobiera token z backendu (`/api/voice/token`)
2. **Frontend** łączy się bezpośrednio z ElevenLabs Scribe v2
3. **Audio** z mikrofonu jest przetwarzane:
   - Resampling do 16kHz
   - Konwersja Float32 → Int16 (PCM)
   - Kodowanie do base64
   - Wysyłka do ElevenLabs
4. **Transkrypcja** wraca real-time i jest wyświetlana

## 🛠️ API Endpoints

### Backend

- `GET /` - Health check
- `GET /api/hello` - Test endpoint
- `GET /api/voice/token` - Generuje token ElevenLabs
- `GET /api/voice/health` - Status voice service

## 📦 Technologie

**Backend:**
- FastAPI 0.104.1
- ElevenLabs SDK 1.9.0
- httpx (HTTP client)
- python-dotenv

**Frontend:**
- React 18
- Vite 5
- @elevenlabs/react (Scribe hook)
- Web Audio API

## 🔧 Troubleshooting

### Mikrofon nie działa
- Sprawdź czy przeglądarka ma dostęp do mikrofonu
- Użyj HTTPS lub localhost (Web Audio API wymaga secure context)
- Sprawdź konsolę przeglądarki (F12) dla błędów

### Brak transkrypcji
- Sprawdź czy klucz `ELEVENLABS_API_KEY` w `.env` jest poprawny
- Sprawdź czy backend jest uruchomiony (http://localhost:8000)
- Sprawdź konsole w przeglądarce i terminalu backendu

### Backend error
```bash
# Sprawdź czy wszystkie zależności są zainstalowane
cd backend
pip install -r requirements.txt

# Sprawdź czy .env istnieje w głównym katalogu
cat ../.env
```

## 📝 Notatki techniczne

### Dlaczego manual microphone handling?
SDK ElevenLabs ma bug z sample rate w Firefoxie. Dlatego:
1. Nie używamy wbudowanego `microphone` w `useScribe`
2. Ręcznie przechwytujemy audio z `getUserMedia()`
3. Resampleujemy do 16kHz
4. Wysyłamy przez `scribe.sendAudio()`

### Limity ElevenLabs
- Pojedyncza sesja: max ~2 minuty
- Po przekroczeniu limitu: automatyczne disconnect
- Rozwiązanie: reconnect dla dłuższych nagrań

## 🎨 Możliwe rozszerzenia

- [ ] LLM analysis (Anthropic Claude) - analiza treści
- [ ] Zapis transkrypcji do pliku
- [ ] Historia sesji
- [ ] Multi-language support
- [ ] Sentiment analysis
- [ ] Keywords extraction

## 📄 Licencja

MIT

## 👨‍💻 Autor

TwelveLabs Team
