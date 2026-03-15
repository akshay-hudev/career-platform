from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.models.models import SavedJob, Resume, User
from backend.schemas.schemas import (
    JobSearchRequest, JobSearchResponse, JobResult,
    SaveJobRequest, SavedJobOut, UpdateJobStatus,
)
from backend.services.job_search import search_jobs
from backend.services.semantic_matcher import rank_jobs

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


@router.post("/search", response_model=JobSearchResponse)
async def search(
    request: JobSearchRequest,
    resume_id: Optional[int] = Query(None, description="Optionally rank by resume match"),
    db: Session = Depends(get_db),
):
    """
    Search jobs via Adzuna API (cached in Redis).
    If resume_id is provided, results are ranked by semantic similarity.
    """
    jobs = await search_jobs(request.query, request.location, request.results)

    # Semantic ranking if resume provided
    if resume_id and jobs:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if resume and resume.embedding_json:
            jobs = rank_jobs(resume.raw_text, resume.embedding_json, jobs)

    job_results = [JobResult(**j) for j in jobs]

    return JobSearchResponse(
        query=request.query,
        location=request.location,
        total=len(job_results),
        jobs=job_results,
    )


@router.post("/save", response_model=SavedJobOut)
def save_job(
    request: SaveJobRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Save a job to the user's board."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Prevent duplicate saves
    existing = db.query(SavedJob).filter(
        SavedJob.user_id == user_id,
        SavedJob.job_external_id == request.job_external_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Job already saved.")

    job = SavedJob(
        user_id=user_id,
        resume_id=request.resume_id,
        job_external_id=request.job_external_id,
        title=request.title,
        company=request.company,
        location=request.location,
        description=request.description,
        salary_min=request.salary_min,
        salary_max=request.salary_max,
        job_url=request.job_url,
        match_score=request.match_score,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/saved/{user_id}", response_model=List[SavedJobOut])
def get_saved_jobs(
    user_id: int,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get all saved jobs for a user, optionally filtered by status."""
    query = db.query(SavedJob).filter(SavedJob.user_id == user_id)
    if status:
        query = query.filter(SavedJob.status == status)
    return query.order_by(SavedJob.saved_at.desc()).all()


@router.patch("/saved/{job_id}/status", response_model=SavedJobOut)
def update_status(
    job_id: int,
    update: UpdateJobStatus,
    db: Session = Depends(get_db),
):
    """Update a saved job's application status (Kanban drag-and-drop)."""
    job = db.query(SavedJob).filter(SavedJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Saved job not found.")

    job.status = update.status
    if update.notes is not None:
        job.notes = update.notes
    if update.status == "applied" and not job.applied_at:
        from datetime import datetime, timezone
        job.applied_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(job)
    return job


@router.delete("/saved/{job_id}")
def delete_saved_job(job_id: int, db: Session = Depends(get_db)):
    """Remove a job from the saved board."""
    job = db.query(SavedJob).filter(SavedJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Saved job not found.")
    db.delete(job)
    db.commit()
    return {"message": "Job removed."}
