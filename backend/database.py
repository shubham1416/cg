"""
Database layer — SQLite via SQLAlchemy for persistent storage.
Stores scenarios, player stats, and answer history.
"""

import os
import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean,
    DateTime, Float, Text, JSON, MetaData, Table, inspect
)
from sqlalchemy.orm import sessionmaker, declarative_base

# On Azure, only /home is writable and persistent
_default_db = 'sqlite:///./data.db'
if os.path.isdir('/home'):
    _default_db = 'sqlite:////home/data.db'

DATABASE_URL = os.environ.get('DATABASE_URL') or _default_db

# Handle sqlite-specific args
connect_args = {}
if DATABASE_URL.startswith('sqlite'):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── ORM Models ────────────────────────────────────────────

class ScenarioRecord(Base):
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True, index=True)
    domain = Column(String, index=True, default="cyber")
    level = Column(Integer, default=1)
    title = Column(String, default="")
    story = Column(Text, default="")
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of strings
    correct_index = Column(Integer, nullable=False)
    topic = Column(String, default="general")
    difficulty = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    source = Column(String, default="manual")  # manual, upload, ai
    status = Column(String, default="published")  # draft, in-review, published



class PlayerStat(Base):
    __tablename__ = "player_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, index=True, nullable=False)
    domain = Column(String, default="cyber")
    correct = Column(Integer, default=0)
    total = Column(Integer, default=0)
    score = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    playtime_seconds = Column(Integer, default=0)
    highest_level = Column(Integer, default=1)
    played_at = Column(DateTime, default=datetime.datetime.utcnow)


class AnswerRecord(Base):
    __tablename__ = "answer_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, index=True, nullable=False)
    domain = Column(String, default="cyber")
    scenario_id = Column(String, nullable=False)
    selected = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_taken = Column(Float, default=0.0)
    answered_at = Column(DateTime, default=datetime.datetime.utcnow)

class PlayerProfile(Base):
    __tablename__ = "player_profiles"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, index=True, unique=True, nullable=False)
    parent_name = Column(String, nullable=True)
    session_token = Column(String, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── Create all tables ─────────────────────────────────────

def init_db():
    """Create tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
