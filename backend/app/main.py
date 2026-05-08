from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import os

from .config import get_settings
from .database import init_db, get_db, SessionLocal
from .models import Topic, Article, ResearchRun, Synthesis
from .schemas import DashboardStats, ResearchRunOut
from .routers import topics, articles, research, synthesis

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if settings.enable_scheduler:
        _start_scheduler()
    yield


def _start_scheduler():
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from .agents.researcher import run_research_for_topic

    scheduler = AsyncIOScheduler()

    async def daily_fetch():
        db = SessionLocal()
        try:
            active_topics = db.query(Topic).filter(
                Topic.is_active == True,
                Topic.fetch_schedule == "daily",
            ).all()
            for topic in active_topics:
                await run_research_for_topic(db, topic)
        finally:
            db.close()

    async def weekly_fetch():
        db = SessionLocal()
        try:
            active_topics = db.query(Topic).filter(
                Topic.is_active == True,
                Topic.fetch_schedule == "weekly",
            ).all()
            for topic in active_topics:
                await run_research_for_topic(db, topic)
        finally:
            db.close()

    scheduler.add_job(daily_fetch, "cron", hour=settings.daily_fetch_hour, minute=0)
    scheduler.add_job(weekly_fetch, "cron", day_of_week="mon", hour=settings.daily_fetch_hour, minute=30)
    scheduler.start()


app = FastAPI(
    title="AutoResearcher API",
    description="AI-powered research agent that synthesizes the latest developments across research areas",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(topics.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(research.router, prefix="/api")
app.include_router(synthesis.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    recent_runs = (
        db.query(ResearchRun)
        .order_by(ResearchRun.started_at.desc())
        .limit(5)
        .all()
    )

    return DashboardStats(
        total_topics=db.query(func.count(Topic.id)).scalar() or 0,
        active_topics=db.query(func.count(Topic.id)).filter(Topic.is_active == True).scalar() or 0,
        total_articles=db.query(func.count(Article.id)).scalar() or 0,
        articles_this_week=db.query(func.count(Article.id)).filter(Article.fetched_at >= week_ago).scalar() or 0,
        total_syntheses=db.query(func.count(Synthesis.id)).scalar() or 0,
        recent_runs=[ResearchRunOut.model_validate(r) for r in recent_runs],
    )


# Serve Next.js static export in production
_static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "out")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
