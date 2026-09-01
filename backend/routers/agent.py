from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.models import User
from backend.services.career_agent import run_career_agent

router = APIRouter(prefix="/api/v1/agent", tags=["Agent"])


class AgentResponse(BaseModel):
    steps_completed: list
    ats_score: Optional[float]
    top_job_title: Optional[str]
    top_job_company: Optional[str]
    top_job_match_score: Optional[float]
    ranked_jobs: list
    parsed_skills: list
    skill_gaps: list
    matched_skills: list
    improvement_suggestions: list
    cover_letter_draft: Optional[str]
    interview_tips: list
    error: Optional[str]


@router.post("/run", response_model=AgentResponse)
async def run_agent(
    file: UploadFile = File(...),
    job_query: str = Query(..., description="e.g. 'Backend Engineer'"),
    location: str = Query(default="India"),
    current_user: User = Depends(get_current_user),
):
    """One-shot LangGraph career agent (auth required to prevent anonymous
    abuse of the Gemini/Adzuna quota)."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported.")

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max file size is 5MB.")

    state = await run_career_agent(
        file_bytes=file_bytes,
        filename=file.filename,
        job_query=job_query,
        location=location,
    )

    if state.get("error"):
        raise HTTPException(status_code=500, detail=state["error"])

    top_job = state.get("top_job") or {}
    advice = state.get("advice") or {}
    parsed = state.get("parsed_data") or {}

    return AgentResponse(
        steps_completed=state.get("steps_completed", []),
        ats_score=state.get("ats_score"),
        top_job_title=top_job.get("title"),
        top_job_company=top_job.get("company"),
        top_job_match_score=top_job.get("match_score"),
        ranked_jobs=state.get("ranked_jobs") or [],
        parsed_skills=parsed.get("skills", []),
        skill_gaps=advice.get("skill_gaps", []),
        matched_skills=advice.get("matched_skills", []),
        improvement_suggestions=advice.get("improvement_suggestions", []),
        cover_letter_draft=advice.get("cover_letter_draft"),
        interview_tips=advice.get("interview_tips", []),
        error=None,
    )