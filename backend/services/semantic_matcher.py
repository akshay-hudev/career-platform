import numpy as np
from sentence_transformers import SentenceTransformer, util
from typing import Optional
from backend.services.resume_parser import TECH_SKILLS
import re

# Load model once at startup (cached in memory)
_model: Optional[SentenceTransformer] = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def get_embedding(text: str) -> list[float]:
    """Generate sentence embedding for a text string."""
    model = get_model()
    embedding = model.encode(text, convert_to_tensor=False)
    return embedding.tolist()


def cosine_similarity_score(emb1: list[float], emb2: list[float]) -> float:
    """Compute cosine similarity between two embeddings. Returns 0-100."""
    a = np.array(emb1)
    b = np.array(emb2)
    score = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)
    return round(float(score) * 100, 2)


def extract_skills_from_text(text: str) -> set[str]:
    """Extract skill keywords from any text."""
    text_lower = text.lower()
    found = set()
    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.add(skill.lower())
    return found


def compute_match(
    resume_text: str,
    resume_embedding: list[float],
    job_description: str,
    job_index: int = 0,
) -> dict:
    """
    Compute full match analysis between a resume and a job description.

    Returns:
        index, score (0-100), matched_skills, skill_gaps
    """
    job_embedding = get_embedding(job_description)
    score = cosine_similarity_score(resume_embedding, job_embedding)

    resume_skills = extract_skills_from_text(resume_text)
    job_skills = extract_skills_from_text(job_description)

    matched = sorted(resume_skills & job_skills)
    gaps = sorted(job_skills - resume_skills)

    return {
        "index": job_index,
        "score": score,
        "matched_skills": [s.title() if len(s) > 3 else s.upper() for s in matched],
        "skill_gaps": [s.title() if len(s) > 3 else s.upper() for s in gaps],
    }


def rank_jobs(
    resume_text: str,
    resume_embedding: list[float],
    jobs: list[dict],
) -> list[dict]:
    """
    Score and rank a list of job dicts by match score.
    Each job dict must have a 'description' field.
    Returns jobs sorted by match_score descending.
    """
    model = get_model()
    descriptions = [j.get("description", "") for j in jobs]

    if not any(descriptions):
        return jobs

    job_embeddings = model.encode(descriptions, convert_to_tensor=False, batch_size=32)
    resume_emb = np.array(resume_embedding)

    scored_jobs = []
    for i, (job, job_emb) in enumerate(zip(jobs, job_embeddings)):
        score = cosine_similarity_score(resume_emb.tolist(), job_emb.tolist())
        job_copy = dict(job)
        job_copy["match_score"] = score
        scored_jobs.append(job_copy)

    return sorted(scored_jobs, key=lambda x: x["match_score"], reverse=True)
