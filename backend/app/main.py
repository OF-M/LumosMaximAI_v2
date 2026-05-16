from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="LumosMaximAI API",
    description="Backend service for video enhancement processing.",
    version="1.0.0",
)

# Configure CORS for Next.js frontend
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

import os as _os
_frontend = _os.getenv("FRONTEND_URL", "")
if _frontend and _frontend not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(_frontend)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to LumosMaximAI API!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
