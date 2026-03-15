from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.models import Resume
from backend.schemas.schemas import (
    MatchRequest, MatchResponse, MatchResult,
    CareerAdviceRequest, CareerAdviceResponse,
)
from backend.services.semantic_matcher import compute_match
from backend.services.llm_service import generate_career_advice

router = APIRouter(prefix="/api/v1/match", tags=["Match"])


@router.post("/score", response_model=MatchResponse)
def score_matches(request: MatchRequest, db: Session = Depends(get_db)):
    """
    Score a resume against multiple job descriptions.
    Returns cosine similarity scores + skill gap analysis.
    """
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not resume.embedding_json:
        raise HTTPException(status_code=422, detail="Resume has no embedding. Re-upload.")

    results = []
    for i, jd in enumerate(request.job_descriptions):
        match = compute_match(
            resume_text=resume.raw_text,
            resume_embedding=resume.embedding_json,
            job_description=jd,
            job_index=i,
        )
        results.append(MatchResult(**match))

    return MatchResponse(results=results)


@router.post("/advice", response_model=CareerAdviceResponse)
async def get_career_advice(
    request: CareerAdviceRequest,
    db: Session = Depends(get_db),
):
    """
    Full AI-powered career advice for a resume vs a specific job.
    Includes ATS score, skill gaps, cover letter draft, and interview tips.
    """
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    if not resume.embedding_json:
        raise HTTPException(status_code=422, detail="Resume has no embedding. Re-upload.")

    # Compute semantic match
    match = compute_match(
        resume_text=resume.raw_text,
        resume_embedding=resume.embedding_json,
        job_description=request.job_description,
    )

    # Generate Gemini career advice
    advice = await generate_career_advice(
        resume_text=resume.raw_text,
        job_title=request.job_title,
        job_description=request.job_description,
        matched_skills=match["matched_skills"],
        skill_gaps=match["skill_gaps"],
        ats_score=match["score"],
    )

    return CareerAdviceResponse(
        ats_score=match["score"],
        skill_gaps=match["skill_gaps"],
        matched_skills=match["matched_skills"],
        improvement_suggestions=advice.get("improvement_suggestions", []),
        cover_letter_draft=advice.get("cover_letter_draft", ""),
        interview_tips=advice.get("interview_tips", []),
    )
