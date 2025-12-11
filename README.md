# TwelveLabs

Prosty projekt z React (frontend) i FastAPI (backend).

## Struktura projektu

```
├── backend/         # FastAPI backend
│   ├── main.py
│   └── requirements.txt
├── frontend/        # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── ...
│   └── package.json
└── Makefile
```

## Instalacja

Zainstaluj wszystkie zależności:

```bash
make setup
```

## Uruchomienie

**Backend** (FastAPI):
```bash
make run backend
```
Backend będzie dostępny na: http://localhost:8000

**Frontend** (React):
```bash
make run frontend
```
Frontend będzie dostępny na: http://localhost:5173

## Opis

- **Backend**: Prosty serwer FastAPI z jednym endpointem `/api/hello`, który zwraca wiadomość JSON
- **Frontend**: Prosta aplikacja React, która wywołuje backend i wyświetla otrzymaną wiadomość

Frontend automatycznie łączy się z backendem i wyświetla odpowiedź.
