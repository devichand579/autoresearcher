"""Main research orchestrator — ties fetcher, synthesizer, and memory together."""
import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import Topic, Article, ResearchRun, Synthesis
from ..agents.fetcher import fetch_all_sources, RawArticle
from ..agents.synthesizer import summarize_article, synthesize_topic
from ..agents import memory
from ..config import get_settings

settings = get_settings()


def _article_exists(db: Session, topic_id: int, url: str) -> bool:
    return db.query(Article).filter(
        Article.topic_id == topic_id,
        Article.url == url,
    ).first() is not None


def _save_article(db: Session, topic_id: int, raw: RawArticle, run_id: int) -> Article | None:
    if not raw.url or _article_exists(db, topic_id, raw.url):
        return None
    if not raw.title or not raw.abstract:
        return None

    # AI summarization
    summary_data = summarize_article(raw.title, raw.abstract, raw.source)

    article = Article(
        topic_id=topic_id,
        title=raw.title[:500],
        authors=raw.authors[:10],
        abstract=raw.abstract[:5000],
        url=raw.url[:1000],
        source=raw.source,
        source_id=raw.source_id,
        published_date=raw.published_date,
        ai_summary=summary_data["summary"],
        key_contributions=summary_data["key_contributions"],
        tags=summary_data["tags"],
        relevance_score=summary_data["relevance_score"],
    )
    db.add(article)
    db.flush()  # get ID before committing

    # Store in vector memory
    mem_text = f"{raw.title}\n{summary_data['summary']}\n{raw.abstract[:500]}"
    embedding_id = memory.store_article(
        article.id,
        mem_text,
        {
            "topic_id": str(topic_id),
            "source": raw.source,
            "title": raw.title[:200],
        },
    )
    article.embedding_id = embedding_id

    return article


async def run_research_for_topic(
    db: Session,
    topic: Topic,
    max_per_source: int = 10,
) -> ResearchRun:
    run = ResearchRun(
        topic_id=topic.id,
        status="running",
        sources_used=topic.sources or ["arxiv"],
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        # Fetch from all sources
        source_results = await fetch_all_sources(
            topic_name=topic.name,
            keywords=topic.keywords or [],
            sources=topic.sources or ["arxiv"],
            max_per_source=max_per_source,
        )

        total_found = 0
        new_articles = 0
        saved_articles = []

        for source, articles in source_results.items():
            total_found += len(articles)
            for raw in articles:
                saved = _save_article(db, topic.id, raw, run.id)
                if saved:
                    new_articles += 1
                    saved_articles.append(saved)

        db.commit()

        # Refresh articles for synthesis (if we got new ones)
        if saved_articles and settings.anthropic_api_key:
            await _generate_synthesis(db, topic, saved_articles)

        # Update topic last-fetched time
        topic.last_fetched_at = datetime.now(timezone.utc)
        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        run.articles_found = total_found
        run.new_articles = new_articles
        db.commit()

    except Exception as e:
        run.status = "failed"
        run.error_message = str(e)[:500]
        run.completed_at = datetime.now(timezone.utc)
        db.commit()

    return run


async def _generate_synthesis(db: Session, topic: Topic, new_articles: list[Article]):
    """Generate a synthesis for the topic after a research run."""
    # Pull historical context from memory
    query_text = f"{topic.name} {' '.join(topic.keywords or [])}"
    historical = memory.query_similar(query_text, n_results=5, topic_id=topic.id)

    articles_data = [
        {
            "title": a.title,
            "authors": a.authors,
            "abstract": a.abstract,
            "ai_summary": a.ai_summary,
            "key_contributions": a.key_contributions,
            "source": a.source,
            "published_date": a.published_date.isoformat() if a.published_date else None,
        }
        for a in new_articles
    ]

    result = await asyncio.to_thread(
        synthesize_topic,
        topic.name,
        articles_data,
        historical,
        "on_demand",
    )

    synthesis = Synthesis(
        topic_id=topic.id,
        title=result["title"],
        content=result["content"],
        synthesis_type="on_demand",
        articles_count=len(new_articles),
        article_ids=[a.id for a in new_articles],
        model_used=settings.ai_model,
    )
    db.add(synthesis)
    db.commit()


async def generate_synthesis_on_demand(
    db: Session,
    topic_id: int | None,
    days_back: int = 7,
    synthesis_type: str = "on_demand",
) -> Synthesis:
    from datetime import timedelta
    from ..models import Topic

    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)

    query = db.query(Article).filter(Article.fetched_at >= cutoff)
    if topic_id:
        query = query.filter(Article.topic_id == topic_id)
    articles = query.order_by(Article.fetched_at.desc()).limit(30).all()

    topic_name = "All Topics"
    if topic_id:
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        topic_name = topic.name if topic else "Unknown Topic"
        keywords = topic.keywords if topic else []
    else:
        keywords = []

    historical = memory.query_similar(
        f"{topic_name} {' '.join(keywords)}",
        n_results=5,
        topic_id=topic_id,
    )

    articles_data = [
        {
            "title": a.title,
            "authors": a.authors,
            "abstract": a.abstract,
            "ai_summary": a.ai_summary,
            "key_contributions": a.key_contributions,
            "source": a.source,
            "published_date": a.published_date.isoformat() if a.published_date else None,
        }
        for a in articles
    ]

    result = await asyncio.to_thread(
        synthesize_topic,
        topic_name,
        articles_data,
        historical,
        synthesis_type,
    )

    synthesis = Synthesis(
        topic_id=topic_id,
        title=result["title"],
        content=result["content"],
        synthesis_type=synthesis_type,
        articles_count=len(articles),
        article_ids=[a.id for a in articles],
        model_used=settings.ai_model,
    )
    db.add(synthesis)
    db.commit()
    db.refresh(synthesis)
    return synthesis
