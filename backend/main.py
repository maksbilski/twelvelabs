from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.voice_routes import router as voice_router

app = FastAPI(title="TwelveLabs API")

# CORS middleware - pozwala na komunikację z frontendem
# W Docker: nginx proxy, więc pozwalamy na wszystkie origins
# W dev: Vite dev server (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (safe behind nginx proxy)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice_router)

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI with Voice Transcription!"}

@app.get("/api/hello")
def hello():
    return {"message": "Witaj w aplikacji TwelveLabs!", "status": "success"}
