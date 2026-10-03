from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging

from app.core.config import settings
from app.core.database import init_db
# Import all models so SQLAlchemy registers them before create_all
from app.models import models  # noqa: F401
from app.api.v1 import auth, documents, chat, agents, reports, analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    logger.info("✅ Database initialized (SQLite)")
    yield
    logger.info("👋 Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Compliance & Intelligence Platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Parse allowed origins for both local dev and production deployments
allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if settings.FRONTEND_URL:
    for url in settings.FRONTEND_URL.split(","):
        cleaned = url.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Automatically allows all Vercel production and preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ai": "gemini" if settings.GOOGLE_API_KEY else "no-key",
        "db": "sqlite",
    }
