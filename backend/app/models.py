from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, default="")
    keywords = Column(JSON, default=list)  # ["LLM", "GPT", ...]
    sources = Column(JSON, default=lambda: ["arxiv", "huggingface", "web"])
    fetch_schedule = Column(String(20), default="daily")  # daily | weekly | manual
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    is_active = Column(Boolean, default=True)
    color = Column(String(20), default="#6366f1")  # UI accent color

    articles = relationship("Article", back_populates="topic", cascade="all, delete-orphan")
    research_runs = relationship("ResearchRun", back_populates="topic", cascade="all, delete-orphan")
    syntheses = relationship("Synthesis", back_populates="topic", cascade="all, delete-orphan")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    title = Column(String(500), nullable=False)
    authors = Column(JSON, default=list)
    abstract = Column(Text, default="")
    url = Column(String(1000), nullable=False)
    source = Column(String(50), nullable=False)  # arxiv | huggingface | web
    source_id = Column(String(200), nullable=True)  # arxiv ID, HF paper ID, etc.
    published_date = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), default=utcnow)
    ai_summary = Column(Text, default="")
    key_contributions = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    relevance_score = Column(Float, default=0.0)
    embedding_id = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)

    topic = relationship("Topic", back_populates="articles")

    class Config:
        indexes = [("url", "topic_id")]


class ResearchRun(Base):
    __tablename__ = "research_runs"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="running")  # running | completed | failed
    articles_found = Column(Integer, default=0)
    new_articles = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sources_used = Column(JSON, default=list)

    topic = relationship("Topic", back_populates="research_runs")


class Synthesis(Base):
    __tablename__ = "syntheses"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    synthesis_type = Column(String(20), default="on_demand")  # daily | weekly | on_demand
    articles_count = Column(Integer, default=0)
    article_ids = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    model_used = Column(String(100), default="")

    topic = relationship("Topic", back_populates="syntheses")
