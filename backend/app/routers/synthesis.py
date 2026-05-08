from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import Synthesis
from ..schemas import SynthesisOut, SynthesisRequest
from ..agents.researcher import generate_synthesis_on_demand

router = APIRouter(prefix="/synthesis", tags=["synthesis"])


@router.get("/", response_model=list[SynthesisOut])
def list_syntheses(
    topic_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Synthesis)
    if topic_id:
        q = q.filter(Synthesis.topic_id == topic_id)
    return q.order_by(Synthesis.created_at.desc()).limit(limit).all()


@router.post("/generate", response_model=SynthesisOut, status_code=201)
async def generate_synthesis(payload: SynthesisRequest, db: Session = Depends(get_db)):
    if payload.topic_id:
        from ..models import Topic
        topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
        if not topic:
            raise HTTPException(404, "Topic not found")

    synthesis = await generate_synthesis_on_demand(
        db=db,
        topic_id=payload.topic_id,
        days_back=payload.days_back,
        synthesis_type=payload.synthesis_type,
    )
    return synthesis


@router.get("/{synthesis_id}", response_model=SynthesisOut)
def get_synthesis(synthesis_id: int, db: Session = Depends(get_db)):
    s = db.query(Synthesis).filter(Synthesis.id == synthesis_id).first()
    if not s:
        raise HTTPException(404, "Synthesis not found")
    return s


@router.delete("/{synthesis_id}", status_code=204)
def delete_synthesis(synthesis_id: int, db: Session = Depends(get_db)):
    s = db.query(Synthesis).filter(Synthesis.id == synthesis_id).first()
    if not s:
        raise HTTPException(404, "Synthesis not found")
    db.delete(s)
    db.commit()
