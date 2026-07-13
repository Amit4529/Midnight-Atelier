import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db
from routes import rooms as rooms_router
from routes import auth as auth_router

# ── Resolve paths ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ── Lifespan: DB init ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Midnight Atelier API",
    description="Backend API for Midnight Atelier — Premium Stay in Greater Noida",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ─────────────────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api", tags=["Auth"])
app.include_router(rooms_router.router, prefix="/api", tags=["Rooms"])

# ── Serve uploaded images ──────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ── Serve frontend static files ────────────────────────────────────────────────
if os.path.exists(FRONTEND_DIR):
    # Serve admin panel assets
    admin_dir = os.path.join(FRONTEND_DIR, "admin")
    if os.path.exists(admin_dir):
        app.mount("/admin", StaticFiles(directory=admin_dir, html=True), name="admin")

    # Serve main frontend (must be last to avoid conflicts)
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Midnight Atelier API"}
