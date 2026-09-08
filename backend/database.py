from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import settings


def normalize_database_url(url: str) -> str:
    """Select the installed psycopg v3 driver for provider-style Postgres URLs."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url

# Normalize the DB URL to the psycopg (v3) driver. Managed hosts like Neon
# inject a bare "postgres://" / "postgresql://" URL, which SQLAlchemy maps to
# psycopg2 — a driver we don't install. Rewrite it to "postgresql+psycopg://".
_db_url = normalize_database_url(settings.DATABASE_URL)

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
