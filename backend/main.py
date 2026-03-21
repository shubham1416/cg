"""
Compliance Quest — Backend API (FastAPI).

Provides endpoints for login, scenario retrieval,
answer submission, leaderboard, content upload, stats, and certificates.
"""

import os
import io
import csv
import time
import uuid
import logging
import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from . import ai_engine
from .database import (
    init_db, get_db, ScenarioRecord, PlayerStat, AnswerRecord, PlayerProfile
)

from jose import jwt
import hashlib

# ── Configuration ────────────────────────────────────────
SECRET_KEY: str = os.environ.get("CG_SECRET", "dev-secret")
ALGORITHM: str = "HS256"

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

ADMIN_PASSWORD_HASH = get_password_hash(os.environ.get("CG_ADMIN_PASS", "admin123"))

# ── Logging ──────────────────────────────────────────────
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ── App Setup ────────────────────────────────────────────
app = FastAPI(title="Compliance Quest API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Static file paths (relative to project root, 1 dir up from backend/) ──
_ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
_ADMIN_DIR = os.path.join(_ROOT, "admin-dashboard")
_FRONTEND_DIR = os.path.join(_ROOT, "frontend")
logger.info("Project root: %s", _ROOT)
logger.info("Admin dir exists: %s (%s)", os.path.isdir(_ADMIN_DIR), _ADMIN_DIR)
logger.info("Frontend dir exists: %s (%s)", os.path.isdir(_FRONTEND_DIR), _FRONTEND_DIR)


# ── Startup event — initialize DB ─────────────────────────
@app.on_event("startup")
def startup_event():
    init_db()
    _seed_default_scenarios()
    _seed_npc_stats()


def _seed_npc_stats():
    """Seed the database with default NPC player stats if needed."""
    from .database import SessionLocal, PlayerStat, PlayerProfile
    import uuid
    import random
    import datetime

    db = SessionLocal()
    try:
        npc_names = [
            'Annie Verma', 'Manjot Singh', 'Vaibhav Batra', 
            'Saryu Agnihotri', 'Tarinder Singh', 'Arjun', 'Isha', 
            'Vikram', 'Meera', 'Neha', 'Kabir', 'Rohan', 'Aditi', 
            'Priya', 'Raj', 'Sunita', 'Amit', 'Kavita', 'Prakash',
            'Suresh', 'Anupama', 'Deepak', 'Madhu'
        ]
        domains = ['cyber', 'posh', 'business']

        for name in npc_names:
            profile = db.query(PlayerProfile).filter(PlayerProfile.username == name).first()
            if not profile:
                profile = PlayerProfile(
                    id=str(uuid.uuid4()),
                    username=name,
                    parent_name="NPC System",
                    session_token="npc-token"
                )
                db.add(profile)
            
            # Seed stats if none exist
            existing = db.query(PlayerStat).filter(PlayerStat.username == name).count()
            if existing == 0:
                # Add 1-2 random domains for this NPC
                for domain in random.sample(domains, random.randint(1, 2)):
                    total = random.randint(10, 40)
                    correct = int(total * random.uniform(0.6, 0.95))
                    stat = PlayerStat(
                        username=name,
                        domain=domain,
                        correct=correct,
                        total=total,
                        score=correct * 10,
                        accuracy=round((correct / total) * 100, 1),
                        playtime_seconds=total * 50,
                        highest_level=random.randint(1, 3),
                        played_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(0, 3))
                    )
                    db.add(stat)
        db.commit()
    except Exception as e:
        logger.error("Failed to seed NPCs: %s", e)
    finally:
        db.close()


def _seed_default_scenarios():
    """Seed the database with default scenarios if empty."""
    from .database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(ScenarioRecord).count()
        if count == 0:
            samples = ai_engine.generate_sample_scenarios()
            for s in samples:
                rec = ScenarioRecord(
                    id=s["id"],
                    domain=s["domain"],
                    level=s["level"],
                    question=s["question"],
                    options=s["options"],
                    correct_index=s["correct_index"],
                    topic=s.get("topic", "general"),
                    difficulty=s.get("difficulty", 1),
                    title=s.get("title", ""),
                    story=s.get("story", ""),
                    source="seed",
                )
                db.add(rec)
            db.commit()
            logger.info("Seeded %d default scenarios", len(samples))
    finally:
        db.close()


# ── Request / Response Models ────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str = ""


class AdminLoginRequest(BaseModel):
    """Admin login payload."""
    password: str


class Scenario(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_index: int
    topic: str = "general"
    difficulty: int = 1
    level: int = 1
    domain: str = "cyber"
    title: str = ""
    story: str = ""


class SubmitAnswerRequest(BaseModel):
    user: str
    domain: str
    scenarioId: str
    selected: int
    correct: bool
    time_taken: float = 0.0

class PlayerRegistration(BaseModel):
    username: str
    parent_name: Optional[str] = None

class AdminApprovalRequest(BaseModel):
    scenario_ids: List[str]
    action: str  # "approve" or "reject"


class ChatRequest(BaseModel):
    message: str
    user: str = "Player"

class CompletionRequest(BaseModel):
    user: str = "Player"
    domain: str = "cyber"


class ScenarioCreateRequest(BaseModel):
    """Payload for manually creating a scenario."""
    domain: str = "cyber"
    level: int = 1
    title: str = ""
    story: str = ""
    question: str
    options: List[str]
    correct_index: int
    topic: str = "general"
    difficulty: int = 1


class ScenarioUpdateRequest(BaseModel):
    """Payload for updating an existing scenario."""
    domain: Optional[str] = None
    level: Optional[int] = None
    title: Optional[str] = None
    story: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_index: Optional[int] = None
    topic: Optional[str] = None
    difficulty: Optional[int] = None


class EvaluateRequest(BaseModel):
    scenario_story: str
    scenario_question: str
    correct_answer: str
    player_response: str
    options: list = []
    domain: str = "cyber"
    npc_name: str = "Colleague"
    conversation_history: list = []


class ConversationRequest(BaseModel):
    npc_name: str
    player_name: str
    player_message: str
    scenario_context: str = ""
    conversation_history: list = []


class AiFeedbackRequest(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    selected_index: int
    domain: str = "cyber"


# ── Endpoints ────────────────────────────────────────────

@app.post("/api/login")
def login(req: LoginRequest) -> dict:
    """Authenticate user and return a JWT token."""
    token = jwt.encode(
        {"sub": req.username, "iat": int(time.time()), "exp": int(time.time()) + 3600*24},
        SECRET_KEY, algorithm=ALGORITHM,
    )

    logger.info("User '%s' logged in", req.username)
    return {"access_token": token, "token_type": "bearer", "user": req.username}


@app.post("/api/player/register")
def register_player(req: PlayerRegistration, db: Session = Depends(get_db)) -> dict:
    """Register or update a player profile."""
    profile = db.query(PlayerProfile).filter(PlayerProfile.username == req.username).first()
    if not profile:
        profile = PlayerProfile(
            id=str(uuid.uuid4()),
            username=req.username,
            parent_name=req.parent_name,
            session_token=str(uuid.uuid4())
        )
        db.add(profile)
        db.commit()
    elif req.parent_name and profile.parent_name != req.parent_name:
        profile.parent_name = req.parent_name
        db.commit()

    return {
        "status": "ok",
        "username": profile.username,
        "parent_name": profile.parent_name,
        "session_token": profile.session_token
    }


@app.post("/api/admin/login")
def admin_login(req: AdminLoginRequest) -> dict:
    """Admin authentication — password check against hash."""
    if get_password_hash(req.password) != ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return {"status": "ok", "message": "Admin authenticated"}


# ── Scenarios CRUD ───────────────────────────────────────

@app.get("/api/scenarios")
def get_scenarios(
    domain: str = "cyber",
    level: int = 1,
    db: Session = Depends(get_db),
) -> list:
    """Return scenarios filtered by domain and level."""
    records = db.query(ScenarioRecord).filter(
        ScenarioRecord.domain == domain,
        ScenarioRecord.level == level,
        ScenarioRecord.status == "published"
    ).all()
    return [
        {
            "id": r.id,
            "domain": r.domain,
            "level": r.level,
            "title": r.title or "",
            "story": r.story or "",
            "question": r.question,
            "options": r.options,
            "correct_index": r.correct_index,
            "topic": r.topic or "general",
            "difficulty": r.difficulty or 1,
        }
        for r in records
    ]


@app.get("/api/scenarios/sequence")
def get_scenarios_sequence(
    domain: str = "cyber",
    db: Session = Depends(get_db),
) -> list:
    """Return scenarios ordered by level and difficulty."""
    records = db.query(ScenarioRecord).filter(
        ScenarioRecord.domain == domain,
        ScenarioRecord.status == "published"
    ).order_by(ScenarioRecord.level, ScenarioRecord.difficulty).all()
    
    return [
        {
            "id": r.id,
            "domain": r.domain,
            "level": r.level,
            "title": r.title or "",
            "story": r.story or "",
            "question": r.question,
            "options": r.options,
            "correct_index": r.correct_index,
            "topic": r.topic or "general",
            "difficulty": r.difficulty or 1,
        }
        for r in records
    ]


@app.get("/api/scenarios/all")
def get_all_scenarios(db: Session = Depends(get_db)) -> dict:
    """Return all scenarios grouped by domain."""
    records = db.query(ScenarioRecord).order_by(
        ScenarioRecord.domain, ScenarioRecord.level
    ).all()
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "domain": r.domain,
            "level": r.level,
            "title": r.title or "",
            "story": r.story or "",
            "question": r.question,
            "options": r.options,
            "correct_index": r.correct_index,
            "topic": r.topic or "general",
            "difficulty": r.difficulty or 1,
            "source": r.source or "manual",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"scenarios": result, "total": len(result)}


@app.post("/api/scenarios")
def create_scenario(
    payload: ScenarioCreateRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Create a single new scenario."""
    new_id = str(uuid.uuid4())
    rec = ScenarioRecord(
        id=new_id,
        domain=payload.domain,
        level=payload.level,
        title=payload.title,
        story=payload.story,
        question=payload.question,
        options=payload.options,
        correct_index=payload.correct_index,
        topic=payload.topic,
        difficulty=payload.difficulty,
        source="manual",
    )
    db.add(rec)
    db.commit()
    logger.info("Created scenario %s", new_id)
    return {"status": "created", "id": new_id}


@app.put("/api/scenarios/{scenario_id}")
def update_scenario(
    scenario_id: str,
    payload: ScenarioUpdateRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Update an existing scenario."""
    rec = db.query(ScenarioRecord).filter(ScenarioRecord.id == scenario_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Scenario not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(rec, field, value)
    db.commit()
    logger.info("Updated scenario %s", scenario_id)
    return {"status": "updated", "id": scenario_id}


@app.delete("/api/scenarios/{scenario_id}")
def delete_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Delete a scenario by ID."""
    rec = db.query(ScenarioRecord).filter(ScenarioRecord.id == scenario_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Scenario not found")
    db.delete(rec)
    db.commit()
    logger.info("Deleted scenario %s", scenario_id)
    return {"status": "deleted", "id": scenario_id}


# ── Answer Submission ────────────────────────────────────

@app.post("/api/submit-answer")
def submit_answer(
    payload: SubmitAnswerRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Record an answer and update the player's stats."""
    # Record individual answer
    answer = AnswerRecord(
        username=payload.user,
        domain=payload.domain,
        scenario_id=payload.scenarioId,
        selected=payload.selected,
        is_correct=payload.correct,
        time_taken=payload.time_taken
    )
    db.add(answer)

    # Need scenario to update highest_level appropriately
    scenario = db.query(ScenarioRecord).filter(ScenarioRecord.id == payload.scenarioId).first()
    scenario_level = scenario.level if scenario else 1

    # Update aggregated stats
    stat = db.query(PlayerStat).filter(
        PlayerStat.username == payload.user,
        PlayerStat.domain == payload.domain,
    ).first()

    if not stat:
        stat = PlayerStat(
            username=payload.user,
            domain=payload.domain,
            correct=0,
            total=0,
            score=0,
            playtime_seconds=0,
            highest_level=1
        )
        db.add(stat)

    stat.total += 1
    if payload.correct:
        stat.correct += 1
        stat.score += 10
        if scenario_level > stat.highest_level:
            stat.highest_level = scenario_level
    
    stat.playtime_seconds += int(payload.time_taken)
    stat.accuracy = round((stat.correct / stat.total) * 100, 1) if stat.total > 0 else 0
    stat.played_at = datetime.datetime.utcnow()

    db.commit()

    logger.info(
        "Answer from '%s': scenario=%s correct=%s",
        payload.user, payload.scenarioId, payload.correct,
    )
    return {
        "status": "ok",
        "stats": {
            "correct": stat.correct,
            "total": stat.total,
            "score": stat.score,
            "accuracy": stat.accuracy,
        },
    }


# ── Leaderboard ──────────────────────────────────────────

@app.get("/api/leaderboard")
def leaderboard(db: Session = Depends(get_db)) -> dict:
    """Return an aggregated leaderboard of all players by username."""
    # Using SQLAlchemy to group by username and sum/max the stats
    from sqlalchemy import func
    
    results = db.query(
        PlayerStat.username,
        func.sum(PlayerStat.score).label("total_score"),
        func.sum(PlayerStat.correct).label("total_correct"),
        func.sum(PlayerStat.total).label("total_questions"),
        func.max(PlayerStat.highest_level).label("max_level"),
        func.max(PlayerStat.played_at).label("last_played"),
        func.sum(PlayerStat.playtime_seconds).label("total_playtime")
    ).group_by(PlayerStat.username).order_by(desc("total_score")).all()

    leaders = []
    for r in results:
        # Fetch profile for parent_name if needed
        profile = db.query(PlayerProfile).filter(PlayerProfile.username == r.username).first()
        parent_name = profile.parent_name if profile else None
        
        # Calculate aggregated accuracy
        acc = round((r.total_correct / r.total_questions) * 100, 1) if r.total_questions > 0 else 0
        
        # Find the primary domain (the one with the most questions)
        primary_domain = db.query(PlayerStat.domain).filter(
            PlayerStat.username == r.username
        ).order_by(desc(PlayerStat.total)).first()
        
        leaders.append({
            "user": r.username,
            "domain": primary_domain[0] if primary_domain else "general",
            "score": r.total_score,
            "correct": r.total_correct,
            "total": r.total_questions,
            "accuracy": acc,
            "played_at": r.last_played.isoformat() if r.last_played else None,
            "parent_name": parent_name,
            "highest_level": r.max_level,
            "playtime_seconds": r.total_playtime
        })

    return {"leaders": leaders}


# ── Player Stats ─────────────────────────────────────────

@app.get("/api/stats/{username}")
def get_player_stats(username: str, db: Session = Depends(get_db)) -> dict:
    """Get detailed stats for a specific player."""
    stats = db.query(PlayerStat).filter(
        PlayerStat.username == username
    ).all()

    if not stats:
        raise HTTPException(status_code=404, detail="Player not found")

    # Get answer history
    answers = db.query(AnswerRecord).filter(
        AnswerRecord.username == username
    ).order_by(desc(AnswerRecord.answered_at)).limit(100).all()

    # Calculate weak topics
    weak_topics = {}
    for a in answers:
        if not a.is_correct:
            # Get scenario to find topic
            scenario = db.query(ScenarioRecord).filter(
                ScenarioRecord.id == a.scenario_id
            ).first()
            if scenario:
                topic = scenario.topic or "general"
                weak_topics[topic] = weak_topics.get(topic, 0) + 1

    # Domain breakdown
    domain_stats = {}
    for s in stats:
        domain_stats[s.domain] = {
            "correct": s.correct,
            "total": s.total,
            "score": s.score,
            "accuracy": s.accuracy,
        }

    total_score = sum(s.score for s in stats)
    total_correct = sum(s.correct for s in stats)
    total_questions = sum(s.total for s in stats)

    return {
        "username": username,
        "total_score": total_score,
        "total_correct": total_correct,
        "total_questions": total_questions,
        "overall_accuracy": round((total_correct / total_questions) * 100, 1) if total_questions > 0 else 0,
        "domain_stats": domain_stats,
        "weak_topics": dict(sorted(weak_topics.items(), key=lambda x: x[1], reverse=True)),
        "recent_answers": [
            {
                "scenario_id": a.scenario_id,
                "domain": a.domain,
                "selected": a.selected,
                "is_correct": a.is_correct,
                "answered_at": a.answered_at.isoformat() if a.answered_at else None,
            }
            for a in answers[:20]
        ],
    }


@app.get("/api/stats")
def get_all_stats(db: Session = Depends(get_db)) -> dict:
    """Get summary stats for all players."""
    stats = db.query(PlayerStat).order_by(desc(PlayerStat.score)).all()

    players = {}
    for s in stats:
        if s.username not in players:
            players[s.username] = {
                "username": s.username,
                "total_score": 0,
                "total_correct": 0,
                "total_questions": 0,
                "domains": [],
                "last_played": None,
            }
        p = players[s.username]
        p["total_score"] += s.score
        p["total_correct"] += s.correct
        p["total_questions"] += s.total
        p["domains"].append(s.domain)
        if s.played_at:
            if not p["last_played"] or s.played_at.isoformat() > p["last_played"]:
                p["last_played"] = s.played_at.isoformat()

    for p in players.values():
        p["overall_accuracy"] = round(
            (p["total_correct"] / p["total_questions"]) * 100, 1
        ) if p["total_questions"] > 0 else 0

    return {
        "players": list(players.values()),
        "total_players": len(players),
    }


# ── Content Upload ───────────────────────────────────────

@app.post("/api/upload-content")
async def upload_content(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    """Upload a document and generate new scenarios from it.

    Supports:
    - CSV files with columns: domain, level, title, story, question, option_a, option_b, option_c, option_d, correct_index, topic, difficulty
    - TXT files (parsed using ai_engine)
    """
    try:
        content = await file.read()
        text = content.decode("utf-8")
        filename = file.filename or "upload.txt"

        generated_scenarios = []

        if filename.lower().endswith(".csv"):
            generated_scenarios = _parse_csv_scenarios(text)
        elif filename.lower().endswith(".xlsx"):
            # For xlsx, we'd need openpyxl — fall back to ai_engine
            generated_scenarios = ai_engine.parse_document_and_generate_scenarios(text)
        else:
            # Plain text — use ai_engine for AI generation
            generated_scenarios = ai_engine.parse_document_and_generate_scenarios(text)

        # Save to database
        for s in generated_scenarios:
            rec = ScenarioRecord(
                id=s["id"],
                domain=s.get("domain", "cyber"),
                level=s.get("level", 1),
                title=s.get("title", ""),
                story=s.get("story", ""),
                question=s["question"],
                options=s["options"],
                correct_index=s["correct_index"],
                topic=s.get("topic", "general"),
                difficulty=s.get("difficulty", 1),
                source="upload",
                status="draft",
            )
            db.add(rec)

        db.commit()
        logger.info("Uploaded content generated %d new scenarios", len(generated_scenarios))
        return {
            "generated": len(generated_scenarios),
            "scenarios": generated_scenarios,
        }
    except Exception as exc:
        logger.error("Failed to process uploaded content: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _parse_csv_scenarios(text: str) -> list:
    """Parse CSV text into scenario objects.

    Expected columns: domain, level, title, story, question,
    option_a, option_b, option_c, option_d, correct_index, topic, difficulty
    """
    reader = csv.DictReader(io.StringIO(text))
    scenarios = []

    for row in reader:
        options = []
        for key in ["option_a", "option_b", "option_c", "option_d"]:
            val = row.get(key, "").strip()
            if val:
                options.append(val)

        if not options or not row.get("question"):
            continue

        try:
            correct_idx = int(row.get("correct_index", "0"))
        except ValueError:
            correct_idx = 0

        try:
            level = int(row.get("level", "1"))
        except ValueError:
            level = 1

        try:
            difficulty = int(row.get("difficulty", "1"))
        except ValueError:
            difficulty = 1

        scenarios.append({
            "id": str(uuid.uuid4()),
            "domain": row.get("domain", "cyber").strip().lower(),
            "level": level,
            "title": row.get("title", "").strip(),
            "story": row.get("story", "").strip(),
            "question": row.get("question", "").strip(),
            "options": options,
            "correct_index": correct_idx,
            "topic": row.get("topic", "general").strip(),
            "difficulty": difficulty,
        })

    return scenarios


@app.post("/api/admin/scenarios/approve")
def admin_approve_scenarios(
    payload: AdminApprovalRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Approve or reject draft AI scenarios."""
    updated = 0
    records = db.query(ScenarioRecord).filter(ScenarioRecord.id.in_(payload.scenario_ids)).all()
    
    if payload.action == "approve":
        for r in records:
            r.status = "published"
            updated += 1
        db.commit()
    elif payload.action == "reject":
        for r in records:
            db.delete(r)
            updated += 1
        db.commit()
        
    return {"status": "ok", "updated": updated}


@app.get("/api/stats/export/csv")
def export_stats_csv(db: Session = Depends(get_db)):
    """Export player stats as a CSV file."""
    stats = db.query(PlayerStat).order_by(desc(PlayerStat.score)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Username", "Domain", "Score", "Correct", "Total", 
        "Accuracy", "Highest Level", "Playtime (s)", "Played At"
    ])
    
    for s in stats:
        writer.writerow([
            s.username,
            s.domain,
            s.score,
            s.correct,
            s.total,
            s.accuracy,
            s.highest_level,
            s.playtime_seconds,
            s.played_at.isoformat() if s.played_at else ""
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=player_stats.csv"
    return response

# ── Completion Certificate ───────────────────────────────

@app.post("/api/complete")
def complete(payload: CompletionRequest) -> dict:
    """Generate a simple text-based completion certificate."""
    certs_dir = os.path.join(os.path.dirname(__file__), "certs")
    os.makedirs(certs_dir, exist_ok=True)

    safe_name = payload.user.replace(" ", "_")
    path = os.path.join(certs_dir, f"{safe_name}_certificate.txt")

    with open(path, "w", encoding="utf-8") as cert_file:
        cert_file.write(
            f"Certificate of Completion\n"
            f"User: {payload.user}\n"
            f"Domain: {payload.domain}\n"
            f"Date: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n"
        )

    logger.info("Certificate generated for '%s' at %s", payload.user, path)
    return {"status": "generated", "path": path}


# ── AI Chat ──────────────────────────────────────────────

@app.post("/api/chat")
def chat_with_ai(payload: ChatRequest) -> dict:
    """Handle chat messages from players — Manager persona."""
    prompt = (
        f"You are Mr. Singh, the manager at Gemini Solutions. "
        f"You are mentoring employees in a compliance training game called 'Compliance Quest'. "
        f"An employee named '{payload.user}' asks you: '{payload.message}'\n"
        f"Respond as a knowledgeable, supportive manager. Provide concise, helpful answers "
        f"related to cybersecurity, POSH (Prevention of Sexual Harassment), or business continuity. "
        f"Keep your response under 3 sentences."
    )
    reply = ai_engine._ask_gemini(prompt, fallback="I'm currently away from my desk. Please try again in a moment.")
    logger.info("Chat from '%s': %s", payload.user, payload.message)
    return {"status": "ok", "reply": reply}


# ── Dashboard stats summary ──────────────────────────────

@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)) -> dict:
    """Get high-level dashboard metrics."""
    total_scenarios = db.query(ScenarioRecord).count()
    total_players = db.query(func.count(func.distinct(PlayerStat.username))).scalar() or 0
    total_answers = db.query(AnswerRecord).count()
    correct_answers = db.query(AnswerRecord).filter(AnswerRecord.is_correct == True).count()

    # Domain distribution
    domain_counts = {}
    for row in db.query(ScenarioRecord.domain, func.count(ScenarioRecord.id)).group_by(ScenarioRecord.domain).all():
        domain_counts[row[0]] = row[1]

    # Level distribution
    level_counts = {}
    for row in db.query(ScenarioRecord.level, func.count(ScenarioRecord.id)).group_by(ScenarioRecord.level).all():
        level_counts[str(row[0])] = row[1]

    return {
        "total_scenarios": total_scenarios,
        "total_players": total_players,
        "total_answers": total_answers,
        "overall_accuracy": round((correct_answers / total_answers) * 100, 1) if total_answers > 0 else 0,
        "domain_distribution": domain_counts,
        "level_distribution": level_counts,
    }


# ── Health check (Azure warmup probe hits this) ──────────
@app.get("/health")
def health_check():
    """Health endpoint for Azure App Service warmup probe."""
    return {"status": "healthy"}


# ── Root routes ───────────────────────────────────────────

# ── Mount static file directories ─────────────────────────
# Must be done AFTER all API routes are registered.

if os.path.isdir(_ADMIN_DIR):
    app.mount("/admin", StaticFiles(directory=_ADMIN_DIR, html=True), name="admin")



@app.get("/api/ai/adaptive")
def ai_adaptive(user: str, domain: str = "cyber", db: Session = Depends(get_db)) -> dict:
    """Get adaptive difficulty recommendation for a player."""
    stats_rec = db.query(PlayerStat).filter(
        PlayerStat.username == user,
        PlayerStat.domain == domain
    ).first()

    if not stats_rec:
        stats = {"correct": 0, "total": 0, "weak_topics": {}}
    else:
        # Get weak topics from answer history
        answers = db.query(AnswerRecord).filter(
            AnswerRecord.username == user,
            AnswerRecord.is_correct == False
        ).all()
        weak_topics = {}
        for a in answers:
            scenario = db.query(ScenarioRecord).filter(ScenarioRecord.id == a.scenario_id).first()
            if scenario:
                topic = scenario.topic or "general"
                weak_topics[topic] = weak_topics.get(topic, 0) + 1
        
        stats = {
            "correct": stats_rec.correct,
            "total": stats_rec.total,
            "weak_topics": weak_topics
        }

    recommendation = ai_engine.get_adaptive_recommendation(stats, domain)
    return recommendation


@app.post("/api/ai/feedback")
def ai_feedback(req: AiFeedbackRequest) -> dict:
    """Generate personalized AI feedback for an MCQ answer."""
    feedback = ai_engine.generate_ai_feedback(
        question=req.question,
        options=req.options,
        correct_index=req.correct_index,
        selected_index=req.selected_index,
        domain=req.domain
    )
    return {"feedback": feedback}


@app.post("/api/ai/evaluate")
def ai_evaluate(req: EvaluateRequest) -> dict:
    """Evaluate a player's free-text response to a scenario using AI."""
    result = ai_engine.evaluate_player_response(
        scenario_story=req.scenario_story,
        scenario_question=req.scenario_question,
        correct_answer=req.correct_answer,
        player_response=req.player_response,
        options=req.options,
        domain=req.domain,
        npc_name=req.npc_name,
        conversation_history=req.conversation_history,
    )
    return result


@app.post("/api/ai/conversation")
def ai_conversation(req: ConversationRequest, db: Session = Depends(get_db)) -> dict:
    """Generate an AI-powered NPC reply in a multi-turn conversation."""
    # Get player stats for adaptive behavior from DB
    stat_rec = db.query(PlayerStat).filter(
        PlayerStat.username == req.player_name
    ).first() # Just get first domain for general accuracy
    
    player_stats = None
    if stat_rec:
        player_stats = {
            "accuracy": stat_rec.accuracy
        }

    reply = ai_engine.generate_npc_conversation(
        npc_name=req.npc_name,
        player_name=req.player_name,
        player_message=req.player_message,
        scenario_context=req.scenario_context,
        conversation_history=req.conversation_history,
        player_stats=player_stats,
    )
    return {"reply": reply}


# ── Mount frontend at root — must be LAST (catch-all) ────
if os.path.isdir(_FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIR, html=True), name="frontend")
