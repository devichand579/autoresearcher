from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from ..database import get_db
from ..models import Article
from ..schemas import ArticleOut
from ..agents import memory

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=list[ArticleOut])
def list_articles(
    topic_id: Optional[int] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Article)
    if topic_id:
        q = q.filter(Article.topic_id == topic_id)
    if source:
        q = q.filter(Article.source == source)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Article.title.ilike(term), Article.ai_summary.ilike(term)))
    if is_read is not None:
        q = q.filter(Article.is_read == is_read)
    return q.order_by(Article.fetched_at.desc()).offset(offset).limit(limit).all()


@router.get("/semantic-search", response_model=list[dict])
def semantic_search(
    q: str,
    topic_id: Optional[int] = None,
    n: int = Query(10, le=30),
):
    results = memory.query_similar(q, n_results=n, topic_id=topic_id)
    return results


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    return article


@router.patch("/{article_id}/read")
def mark_read(article_id: int, is_read: bool = True, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    article.is_read = is_read
    db.commit()
    return {"ok": True}


@router.delete("/{article_id}", status_code=204)
def delete_article(article_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    db.delete(article)
    db.commit()
