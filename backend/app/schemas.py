from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


# ── Topic ─────────────────────────────────────────────────────────────────────

class TopicBase(BaseModel):
    name: str
    description: str = ""
    keywords: list[str] = []
    sources: list[str] = ["arxiv", "huggingface", "web"]
    fetch_schedule: str = "daily"
    color: str = "#6366f1"


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[list[str]] = None
    sources: Optional[list[str]] = None
    fetch_schedule: Optional[str] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None


class TopicOut(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    last_fetched_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    article_count: int = 0


# ── Article ────────────────────────────────────────────────────────────────────

class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    title: str
    authors: list[str]
    abstract: str
    url: str
    source: str
    source_id: Optional[str] = None
    published_date: Optional[datetime] = None
    fetched_at: datetime
    ai_summary: str
    key_contributions: list[str]
    tags: list[str]
    relevance_score: float
    is_read: bool


# ── ResearchRun ────────────────────────────────────────────────────────────────

class ResearchRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    articles_found: int
    new_articles: int
    error_message: Optional[str] = None
    sources_used: list[str]


class StartResearchRequest(BaseModel):
    topic_id: int
    max_results_per_source: int = 10


# ── Synthesis ──────────────────────────────────────────────────────────────────

class SynthesisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: Optional[int] = None
    title: str
    content: str
    synthesis_type: str
    articles_count: int
    article_ids: list[int]
    created_at: datetime
    model_used: str


class SynthesisRequest(BaseModel):
    topic_id: Optional[int] = None
    synthesis_type: str = "on_demand"
    days_back: int = 7  # how many days of articles to include


# ── Stats ──────────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_topics: int
    active_topics: int
    total_articles: int
    articles_this_week: int
    total_syntheses: int
    recent_runs: list[ResearchRunOut]
