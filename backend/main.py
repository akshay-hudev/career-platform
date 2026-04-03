from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.database import Base, engine
from backend.config import settings
from backend.routers import resume, jobs, match, users, agent, interview


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all database tables on startup
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created.")
    yield
    print("🛑 Application shutdown.")


app = FastAPI(
    title="Career Platform API",
    description="AI-powered career assistant — job search, resume analysis, semantic matching",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(match.router)
app.include_router(agent.router)
app.include_router(interview.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Career Platform API is running."}


@app.get("/health")
def health():
    return {"status": "healthy"}
