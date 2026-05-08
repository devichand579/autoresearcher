from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Topic, ResearchRun
from ..schemas import ResearchRunOut, StartResearchRequest
from ..agents.researcher import run_research_for_topic

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/run", response_model=ResearchRunOut, status_code=202)
async def start_research(
    payload: StartResearchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")

    # Check for already-running job
    running = db.query(ResearchRun).filter(
        ResearchRun.topic_id == payload.topic_id,
        ResearchRun.status == "running",
    ).first()
    if running:
        raise HTTPException(409, "A research run is already in progress for this topic")

    # Run in background so request returns immediately
    async def _run():
        from ..database import SessionLocal
        bg_db = SessionLocal()
        try:
            bg_topic = bg_db.query(Topic).filter(Topic.id == payload.topic_id).first()
            await run_research_for_topic(bg_db, bg_topic, payload.max_results_per_source)
        finally:
            bg_db.close()

    background_tasks.add_task(_run)

    # Return a stub run so the frontend has something to poll
    stub = ResearchRun(
        topic_id=payload.topic_id,
        status="running",
        articles_found=0,
        new_articles=0,
        sources_used=topic.sources or [],
    )
    db.add(stub)
    db.commit()
    db.refresh(stub)
    return stub


@router.get("/runs", response_model=list[ResearchRunOut])
def list_runs(
    topic_id: int | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(ResearchRun)
    if topic_id:
        q = q.filter(ResearchRun.topic_id == topic_id)
    return q.order_by(ResearchRun.started_at.desc()).limit(limit).all()


@router.get("/runs/{run_id}", response_model=ResearchRunOut)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(ResearchRun).filter(ResearchRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    return run
