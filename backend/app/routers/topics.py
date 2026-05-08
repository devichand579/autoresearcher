from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Topic, Article
from ..schemas import TopicCreate, TopicUpdate, TopicOut

router = APIRouter(prefix="/topics", tags=["topics"])


def _enrich(topic: Topic, db: Session) -> TopicOut:
    count = db.query(func.count(Article.id)).filter(Article.topic_id == topic.id).scalar() or 0
    out = TopicOut.model_validate(topic)
    out.article_count = count
    return out


@router.get("", response_model=list[TopicOut])
def list_topics(db: Session = Depends(get_db)):
    topics = db.query(Topic).order_by(Topic.created_at.desc()).all()
    return [_enrich(t, db) for t in topics]


@router.post("", response_model=TopicOut, status_code=201)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    if db.query(Topic).filter(Topic.name == payload.name).first():
        raise HTTPException(400, "Topic with this name already exists")
    topic = Topic(**payload.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return _enrich(topic, db)


@router.get("/{topic_id}", response_model=TopicOut)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")
    return _enrich(topic, db)


@router.patch("/{topic_id}", response_model=TopicOut)
def update_topic(topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(topic, field, value)
    db.commit()
    db.refresh(topic)
    return _enrich(topic, db)


@router.delete("/{topic_id}", status_code=204)
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")
    db.delete(topic)
    db.commit()
