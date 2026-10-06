import asyncio
import os
import httpx
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from app.dependencies import require_auth
from app.services.email_service import (
    render_welcome_email,
    render_content_flag_email,
    render_contact_email,
    send_email,
)

load_dotenv()

router = APIRouter(prefix="/tracking", tags=["Tracking"])

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}


# ── Helper ───────────────────────────────────────────────────────────────────

def sb_url(table: str, query: str = "") -> str:
    base = f"{SUPABASE_URL}/rest/v1/{table}"
    return f"{base}?{query}" if query else base


# ════════════════════════════════════════════════════════════════════════════
#  MODELS
# ════════════════════════════════════════════════════════════════════════════

class SessionStartRequest(BaseModel):
    user_id: str
    exam_type: str
    year: Optional[int] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = "medium"

class SessionEndRequest(BaseModel):
    session_id: str
    user_id: str
    score: int
    total: int
    time_taken_secs: int

class QuestionAttemptRequest(BaseModel):
    user_id: str
    session_id: str
    question_id: str
    topic: Optional[str] = None
    selected_answer: str
    correct_answer: str
    is_correct: bool
    time_spent_secs: int = 0
    skipped: bool = False
    hint_used: bool = False

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    level: Optional[str] = None
    target_exam: Optional[str] = None
    target_score: Optional[int] = None
    target_year: Optional[int] = None
    study_goal_mins_per_day: Optional[int] = None
    preferred_topics: Optional[List[str]] = None

class TeachLogRequest(BaseModel):
    user_id: str
    topic: Optional[str] = None
    question: str
    response_length: int = 0
    level: str = "secondary"


# ════════════════════════════════════════════════════════════════════════════
#  SESSION — START
# ════════════════════════════════════════════════════════════════════════════

@router.post("/session/start")
async def start_session(req: SessionStartRequest):
    payload = {
        "user_id":    req.user_id,
        "exam_type":  req.exam_type,
        "year":       req.year,
        "topic":      req.topic,
        "difficulty": req.difficulty,
        "started_at": datetime.utcnow().isoformat(),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(sb_url("cbt_sessions"), headers=HEADERS, json=payload)

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Failed to create session: {resp.text}")

    data = resp.json()
    session = data[0] if isinstance(data, list) else data
    return {"success": True, "session_id": session["id"]}


# ════════════════════════════════════════════════════════════════════════════
#  SESSION — END
# ════════════════════════════════════════════════════════════════════════════

@router.post("/session/end")
async def end_session(req: SessionEndRequest):
    pct = round((req.score / req.total) * 100, 2) if req.total > 0 else 0
    payload = {
        "score":           req.score,
        "total":           req.total,
        "percentage":      pct,
        "time_taken_secs": req.time_taken_secs,
        "completed_at":    datetime.utcnow().isoformat(),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(
            sb_url("cbt_sessions", f"id=eq.{req.session_id}&user_id=eq.{req.user_id}"),
            headers=HEADERS,
            json=payload,
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail=f"Failed to end session: {resp.text}")

    # Update streak
    await _update_streak(req.user_id)

    return {"success": True, "percentage": pct}


# ════════════════════════════════════════════════════════════════════════════
#  QUESTION ATTEMPT
# ════════════════════════════════════════════════════════════════════════════

@router.post("/attempt")
async def log_attempt(req: QuestionAttemptRequest):
    payload = {
        "user_id":         req.user_id,
        "session_id":      req.session_id,
        "question_id":     req.question_id,
        "topic":           req.topic,
        "selected_answer": req.selected_answer,
        "correct_answer":  req.correct_answer,
        "is_correct":      req.is_correct,
        "time_spent_secs": req.time_spent_secs,
        "skipped":         req.skipped,
        "hint_used":       req.hint_used,
        "attempted_at":    datetime.utcnow().isoformat(),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(sb_url("question_attempts"), headers=HEADERS, json=payload)

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Failed to log attempt: {resp.text}")

    # Update per-topic performance
    if req.topic:
        await _update_topic_performance(req.user_id, req.topic, req.is_correct, req.time_spent_secs)

    return {"success": True}


# ════════════════════════════════════════════════════════════════════════════
#  PROFILE — GET & UPDATE
# ════════════════════════════════════════════════════════════════════════════

@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            sb_url("user_profiles", f"id=eq.{user_id}"),
            headers=HEADERS,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

    data = resp.json()
    if not data:
        return {"success": True, "profile": None}
    return {"success": True, "profile": data[0]}


@router.put("/profile/{user_id}")
async def update_profile(user_id: str, req: ProfileUpdateRequest):
    payload = {k: v for k, v in req.dict().items() if v is not None}
    if not payload:
        return {"success": True, "message": "Nothing to update"}

    async with httpx.AsyncClient(timeout=10) as client:
        # Upsert — creates profile if it doesn't exist
        upsert_payload = {"id": user_id, **payload}
        resp = await client.post(
            sb_url("user_profiles"),
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
            json=upsert_payload,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {resp.text}")

    data = resp.json()
    profile = data[0] if isinstance(data, list) else data
    return {"success": True, "profile": profile}


# ════════════════════════════════════════════════════════════════════════════
#  WELCOME EMAIL — once per user (Google + email signups)
# ════════════════════════════════════════════════════════════════════════════

@router.post("/welcome")
async def send_welcome_email(user=Depends(require_auth)):
    """Send the branded welcome email to the caller's address.

    Idempotent: a `welcome` row in `notifications` marks it sent, so repeat
    calls (every login fires one from the frontend) are cheap no-ops.
    Returns {"sent": True/False} — never raises for mail failures.
    """
    user_id = getattr(user, "id", None)
    email = (getattr(user, "email", "") or "").strip()
    if not user_id or not email:
        return {"sent": False, "reason": "no-email"}

    async with httpx.AsyncClient(timeout=10) as client:
        # Already welcomed?
        chk = await client.get(
            sb_url("notifications", f"user_id=eq.{user_id}&type=eq.welcome&select=id&limit=1"),
            headers=HEADERS,
        )
        if chk.status_code == 200 and chk.json():
            return {"sent": False, "reason": "already-sent"}

        # First name for the greeting
        first_name = ""
        prof = await client.get(
            sb_url("profiles", f"id=eq.{user_id}&select=full_name&limit=1"),
            headers=HEADERS,
        )
        if prof.status_code == 200 and prof.json():
            first_name = (prof.json()[0].get("full_name") or "").split(" ")[0]

        subject, html_body, text_body = render_welcome_email(first_name)
        ok = await asyncio.to_thread(send_email, email, subject, html_body, text_body)
        if not ok:
            return {"sent": False, "reason": "send-failed"}

        await client.post(
            sb_url("notifications"),
            headers=HEADERS,
            json={
                "user_id": user_id,
                "type": "welcome",
                "title": "Welcome to MathGenius!",
                "message": "Your account is ready — check your inbox for a welcome email.",
                "icon": "gift",
                "link": "/dashboard",
            },
        )
        return {"sent": True}


class ContentFlagRequest(BaseModel):
    question_text: str
    topic: Optional[str] = ""
    exam_type: Optional[str] = ""
    source: Optional[str] = ""
    level: Optional[str] = ""
    reason: Optional[str] = ""
    note: Optional[str] = ""


class ContactRequest(BaseModel):
    name: str
    email: str
    topic: Optional[str] = ""
    message: str


@router.post("/contact")
async def contact_message(req: ContactRequest):
    """Contact-page form → email to admin. Open to guests (no auth).

    Lightly validated and length-capped. Never raises — always {ok: bool}.
    """
    name = (req.name or "").strip()[:80]
    email = (req.email or "").strip()[:120]
    topic = (req.topic or "").strip()[:60]
    message = (req.message or "").strip()[:2000]
    if len(name) < 2 or "@" not in email or len(message) < 10:
        return {"ok": False, "reason": "invalid"}

    subject, html_body, text_body = render_contact_email(
        {"name": name, "email": email, "topic": topic, "message": message}
    )
    mailed = await asyncio.to_thread(
        send_email, ADMIN_EMAIL, subject, html_body, text_body, email or None
    )
    return {"ok": mailed}


# ════════════════════════════════════════════════════════════════════════════
#  CONTENT FLAGS — user-reported questions → admin email
# ════════════════════════════════════════════════════════════════════════════

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "help@mathgenius.guru").strip()


@router.post("/content-flag")
async def report_content_flag(req: ContentFlagRequest, user=Depends(require_auth)):
    """Store a user-reported question problem and email the details to admin.

    A confirmation also lands in the reporter's in-app notifications.
    Never raises for mail/DB hiccups — always returns {ok: bool}.
    """
    user_id = getattr(user, "id", None)
    reporter_email = (getattr(user, "email", "") or "").strip()
    if not user_id or not req.question_text.strip():
        return {"ok": False, "reason": "missing-data"}

    reporter_name = ""
    username = ""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            prof = await client.get(
                sb_url("profiles", f"id=eq.{user_id}&select=full_name,username&limit=1"),
                headers=HEADERS,
            )
            if prof.status_code == 200 and prof.json():
                reporter_name = prof.json()[0].get("full_name") or ""
                username = prof.json()[0].get("username") or ""
    except Exception:
        pass

    flag = {
        "reporter_name": reporter_name or username or reporter_email,
        "reporter_email": reporter_email,
        "source": req.source or "",
        "exam_type": req.exam_type or "",
        "topic": req.topic or "",
        "level": req.level or "",
        "reason": req.reason or "",
        "note": req.note or "",
        "question_text": req.question_text.strip()[:2000],
    }

    # 1. Store for the record (best effort)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                sb_url("question_flags"),
                headers=HEADERS,
                json={"user_id": user_id, "user_email": reporter_email,
                      "username": username, **flag, "status": "open"},
            )
    except Exception:
        pass

    # 2. Email admin with everything needed to fix it
    subject, html_body, text_body = render_content_flag_email(flag)
    mailed = await asyncio.to_thread(
        send_email, ADMIN_EMAIL, subject, html_body, text_body,
        reporter_email or None,
    )

    # 3. Confirm to the reporter via the app notification bell
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                sb_url("notifications"),
                headers=HEADERS,
                json={
                    "user_id": user_id,
                    "type": "report",
                    "title": "Thanks for the report!",
                    "message": "Our team will review that question shortly.",
                    "icon": "bell",
                    "link": None,
                },
            )
    except Exception:
        pass

    return {"ok": True, "emailed": mailed}


# ════════════════════════════════════════════════════════════════════════════
#  STATS — OVERALL
# ════════════════════════════════════════════════════════════════════════════

@router.get("/stats/{user_id}")
async def get_stats(user_id: str):
    async with httpx.AsyncClient(timeout=15) as client:
        sessions_resp = await client.get(
            sb_url("cbt_sessions", f"user_id=eq.{user_id}&select=score,total,percentage,time_taken_secs,exam_type,completed_at"),
            headers=HEADERS,
        )
        profile_resp = await client.get(
            sb_url("user_profiles", f"id=eq.{user_id}&select=streak_days,longest_streak,target_score,target_exam"),
            headers=HEADERS,
        )
        attempts_resp = await client.get(
            sb_url("question_attempts", f"user_id=eq.{user_id}&select=is_correct,hint_used,skipped"),
            headers=HEADERS,
        )

    sessions  = sessions_resp.json()  if sessions_resp.status_code  == 200 else []
    profile   = profile_resp.json()   if profile_resp.status_code   == 200 else []
    attempts  = attempts_resp.json()  if attempts_resp.status_code  == 200 else []

    completed = [s for s in sessions if s.get("completed_at")]
    total_sessions   = len(completed)
    avg_score        = round(sum(s["percentage"] for s in completed) / total_sessions, 1) if total_sessions else 0
    total_questions  = len(attempts)
    correct          = sum(1 for a in attempts if a.get("is_correct"))
    hints_used       = sum(1 for a in attempts if a.get("hint_used"))
    skipped          = sum(1 for a in attempts if a.get("skipped"))
    overall_accuracy = round((correct / total_questions) * 100, 1) if total_questions else 0

    prof = profile[0] if profile else {}

    return {
        "success": True,
        "stats": {
            "total_sessions":    total_sessions,
            "avg_score_pct":     avg_score,
            "total_questions":   total_questions,
            "overall_accuracy":  overall_accuracy,
            "hints_used":        hints_used,
            "questions_skipped": skipped,
            "streak_days":       prof.get("streak_days", 0),
            "longest_streak":    prof.get("longest_streak", 0),
            "target_score":      prof.get("target_score"),
            "target_exam":       prof.get("target_exam"),
        }
    }


# ════════════════════════════════════════════════════════════════════════════
#  TOPIC PERFORMANCE
# ════════════════════════════════════════════════════════════════════════════

@router.get("/topics/{user_id}")
async def get_topic_performance(user_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            sb_url("topic_performance", f"user_id=eq.{user_id}&order=accuracy.asc"),
            headers=HEADERS,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch topic stats")

    data = resp.json()
    return {
        "success":      True,
        "topics":       data,
        "weak_topics":  [t for t in data if t["accuracy"] < 50],
        "strong_topics":[t for t in data if t["accuracy"] >= 75],
    }


# ════════════════════════════════════════════════════════════════════════════
#  SESSION HISTORY
# ════════════════════════════════════════════════════════════════════════════

@router.get("/history/{user_id}")
async def get_history(user_id: str, limit: int = 20):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            sb_url(
                "cbt_sessions",
                f"user_id=eq.{user_id}&order=started_at.desc&limit={limit}"
                "&select=id,exam_type,year,topic,score,total,percentage,time_taken_secs,started_at,completed_at"
            ),
            headers=HEADERS,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch history")

    return {"success": True, "sessions": resp.json()}


# ════════════════════════════════════════════════════════════════════════════
#  TEACH LOG
# ════════════════════════════════════════════════════════════════════════════

@router.post("/teach-log")
async def log_teach_interaction(req: TeachLogRequest):
    payload = {
        "user_id":         req.user_id,
        "topic":           req.topic,
        "question":        req.question[:500],  # cap to avoid huge rows
        "response_length": req.response_length,
        "level":           req.level,
        "created_at":      datetime.utcnow().isoformat(),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(sb_url("teach_sessions"), headers=HEADERS, json=payload)

    if resp.status_code not in (200, 201):
        # Non-fatal — log but don't break teaching flow
        return {"success": False, "detail": resp.text[:200]}

    return {"success": True}


# ════════════════════════════════════════════════════════════════════════════
#  STREAK UPDATE (internal helper + public endpoint)
# ════════════════════════════════════════════════════════════════════════════

@router.post("/streak/update")
async def update_streak(user_id: str):
    await _update_streak(user_id)
    return {"success": True}


async def _update_streak(user_id: str):
    """Increment streak if user was active yesterday; reset if gap > 1 day."""
    today = date.today()
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            sb_url("user_profiles", f"id=eq.{user_id}&select=streak_days,longest_streak,last_active_date"),
            headers=HEADERS,
        )
        if resp.status_code != 200:
            return

        data = resp.json()
        prof = data[0] if data else None

        streak         = prof["streak_days"]       if prof else 0
        longest        = prof["longest_streak"]    if prof else 0
        last_active    = prof["last_active_date"]  if prof else None

        if last_active:
            last_date = date.fromisoformat(last_active)
            delta     = (today - last_date).days
            if delta == 0:
                return  # Already updated today
            elif delta == 1:
                streak += 1
            else:
                streak = 1  # Reset streak
        else:
            streak = 1

        longest = max(longest, streak)

        update_payload = {
            "id":               user_id,
            "streak_days":      streak,
            "longest_streak":   longest,
            "last_active_date": today.isoformat(),
        }
        await client.post(
            sb_url("user_profiles"),
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=update_payload,
        )


# ════════════════════════════════════════════════════════════════════════════
#  WEAK TOPICS SUMMARY (for chatbot to reference)
# ════════════════════════════════════════════════════════════════════════════

@router.get("/weak-topics/{user_id}")
async def get_weak_topics(user_id: str):
    """Returns the user's 3 weakest topics — useful for the AI tutor to focus on."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            sb_url(
                "topic_performance",
                f"user_id=eq.{user_id}&order=accuracy.asc&limit=3&select=topic,accuracy,total_attempted"
            ),
            headers=HEADERS,
        )

    if resp.status_code != 200:
        return {"success": False, "weak_topics": []}

    return {"success": True, "weak_topics": resp.json()}


# ════════════════════════════════════════════════════════════════════════════
#  INTERNAL — update topic_performance after each attempt
# ════════════════════════════════════════════════════════════════════════════

async def _update_topic_performance(user_id: str, topic: str, is_correct: bool, time_secs: int):
    async with httpx.AsyncClient(timeout=10) as client:
        # Fetch existing row
        resp = await client.get(
            sb_url("topic_performance", f"user_id=eq.{user_id}&topic=eq.{topic}"),
            headers=HEADERS,
        )
        existing = resp.json()[0] if resp.status_code == 200 and resp.json() else None

        if existing:
            total     = existing["total_attempted"] + 1
            correct   = round(existing["accuracy"] * existing["total_attempted"] / 100) + (1 if is_correct else 0)
            avg_time  = round(((existing["avg_time_secs"] * (total - 1)) + time_secs) / total, 2)
            accuracy  = round((correct / total) * 100, 2)

            payload = {
                "total_attempted":  total,
                "accuracy":         accuracy,
                "avg_time_secs":    avg_time,
                "last_attempted":   datetime.utcnow().isoformat(),
            }
            await client.patch(
                sb_url("topic_performance", f"user_id=eq.{user_id}&topic=eq.{topic}"),
                headers=HEADERS,
                json=payload,
            )
        else:
            payload = {
                "user_id":         user_id,
                "topic":           topic,
                "total_attempted": 1,
                "total_correct":   1 if is_correct else 0,
                "accuracy":        100.0 if is_correct else 0.0,
                "avg_time_secs":   float(time_secs),
                "last_attempted":  datetime.utcnow().isoformat(),
            }
            await client.post(sb_url("topic_performance"), headers=HEADERS, json=payload)


# ════════════════════════════════════════════════════════════════════════════
#  SPACED REPETITION  (SM-2 algorithm)
# ════════════════════════════════════════════════════════════════════════════

class SpacedReviewRequest(BaseModel):
    user_id: str
    question_id: str
    quality: int      # 0 = total blackout … 5 = perfect recall
    topic: Optional[str] = None


def _sm2(ease_factor: float, interval: int, repetitions: int, quality: int):
    """Return (new_interval_days, new_ease_factor, new_repetitions)."""
    if quality >= 3:  # correct
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval * ease_factor)
        new_ef   = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef   = max(1.3, new_ef)
        new_reps = repetitions + 1
    else:  # incorrect — reset
        new_interval = 1
        new_ef       = ease_factor
        new_reps     = 0
    return new_interval, round(new_ef, 4), new_reps


@router.post("/spaced-review")
async def update_spaced_review(req: SpacedReviewRequest):
    """Record a spaced-repetition answer and reschedule the next review using SM-2."""
    now = datetime.utcnow().isoformat()

    async with httpx.AsyncClient(timeout=10) as client:
        # Fetch existing record
        resp = await client.get(
            sb_url("spaced_repetition",
                   f"user_id=eq.{req.user_id}&question_id=eq.{req.question_id}"),
            headers=HEADERS,
        )

    existing = (resp.json() or [None])[0] if resp.status_code == 200 else None

    ef   = existing["ease_factor"]   if existing else 2.5
    ivl  = existing["interval_days"] if existing else 1
    reps = existing["repetitions"]   if existing else 0

    new_ivl, new_ef, new_reps = _sm2(ef, ivl, reps, req.quality)

    next_review = (datetime.utcnow().replace(
        hour=8, minute=0, second=0, microsecond=0
    )).strftime("%Y-%m-%d") + f"T08:00:00Z"
    # Simple approach: add interval_days as an offset string for Supabase
    from datetime import timedelta
    next_dt = datetime.utcnow() + timedelta(days=new_ivl)
    next_review = next_dt.isoformat() + "Z"

    payload = {
        "user_id":      req.user_id,
        "question_id":  req.question_id,
        "next_review":  next_review,
        "ease_factor":  new_ef,
        "interval_days": new_ivl,
        "repetitions":  new_reps,
        "last_quality": req.quality,
        "last_reviewed": now,
        "topic":        req.topic,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        if existing:
            resp = await client.patch(
                sb_url("spaced_repetition",
                       f"user_id=eq.{req.user_id}&question_id=eq.{req.question_id}"),
                headers=HEADERS,
                json={k: v for k, v in payload.items() if k not in ("user_id", "question_id")},
            )
        else:
            resp = await client.post(
                sb_url("spaced_repetition"),
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
                json=payload,
            )

    if resp.status_code not in (200, 201, 204):
        raise HTTPException(status_code=500, detail=f"SR update failed: {resp.text[:200]}")

    return {"success": True, "next_review_days": new_ivl, "ease_factor": new_ef}


@router.get("/spaced-due/{user_id}")
async def get_due_count(user_id: str):
    """Return count of spaced-repetition cards due today."""
    now = datetime.utcnow().isoformat() + "Z"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            sb_url("spaced_repetition",
                   f"user_id=eq.{user_id}&next_review=lte.{now}&select=id"),
            headers={**HEADERS, "Prefer": "count=exact"},
        )
    count = 0
    if resp.status_code == 200:
        try:
            count = int(resp.headers.get("content-range", "0-0/0").split("/")[1])
        except Exception:
            count = len(resp.json())
    return {"due_count": count}


@router.get("/spaced-questions/{user_id}")
async def get_due_questions(user_id: str, limit: int = 20):
    """Return spaced-repetition question IDs due today, with full question data."""
    now = datetime.utcnow().isoformat() + "Z"
    async with httpx.AsyncClient(timeout=15) as client:
        sr_resp = await client.get(
            sb_url("spaced_repetition",
                   f"user_id=eq.{user_id}&next_review=lte.{now}"
                   f"&order=next_review.asc&limit={limit}"
                   f"&select=question_id,ease_factor,interval_days,repetitions,topic,last_quality"),
            headers=HEADERS,
        )

    due_rows = sr_resp.json() if sr_resp.status_code == 200 else []
    if not due_rows:
        return {"success": True, "questions": []}

    q_ids = ",".join(f'"{r["question_id"]}"' for r in due_rows)
    async with httpx.AsyncClient(timeout=15) as client:
        q_resp = await client.get(
            sb_url("exam_questions",
                   f"id=in.({q_ids})&select=*"),
            headers=HEADERS,
        )

    questions = q_resp.json() if q_resp.status_code == 200 else []
    sr_map    = {r["question_id"]: r for r in due_rows}

    result = []
    for q in questions:
        sr = sr_map.get(q["id"], {})
        result.append({**q, "_sr": sr})

    return {"success": True, "questions": result}


# ════════════════════════════════════════════════════════════════════════════
#  PUBLIC PROFILE  (Parent / Teacher view — no auth required)
# ════════════════════════════════════════════════════════════════════════════

@router.get("/public-profile/{user_id}")
async def get_public_profile(user_id: str):
    """Return a student's stats for the public share page (bypasses RLS via service key)."""
    async with httpx.AsyncClient(timeout=15) as client:
        profile_resp,  stats_resp,  topics_resp,  attempts_resp = await asyncio.gather(
            client.get(sb_url("profiles",          f"id=eq.{user_id}&select=full_name,school,exam_target"), headers=HEADERS),
            client.get(sb_url("user_profiles",     f"id=eq.{user_id}&select=streak_days,xp"),               headers=HEADERS),
            client.get(sb_url("topic_performance", f"user_id=eq.{user_id}&order=accuracy.desc&limit=5"
                                                   f"&select=topic,accuracy,total_attempted"),              headers=HEADERS),
            client.get(sb_url("question_attempts", f"user_id=eq.{user_id}&select=is_correct"),              headers=HEADERS),
        )

    profile  = (profile_resp.json()  or [{}])[0] if profile_resp.status_code  == 200 else {}
    stats    = (stats_resp.json()    or [{}])[0] if stats_resp.status_code    == 200 else {}
    topics   = topics_resp.json()                if topics_resp.status_code   == 200 else []
    attempts = attempts_resp.json()              if attempts_resp.status_code == 200 else []

    total    = len(attempts)
    correct  = sum(1 for a in attempts if a.get("is_correct"))
    accuracy = round(correct / total * 100) if total else 0

    return {
        "name":            profile.get("full_name", "Student"),
        "school":          profile.get("school"),
        "exam_target":     profile.get("exam_target"),
        "xp":              stats.get("xp",          0),
        "streak":          stats.get("streak_days", 0),
        "total_questions": total,
        "accuracy":        accuracy,
        "top_topics":      topics[:3],
    }


# ════════════════════════════════════════════════════════════════════════════
#  SOLUTIONS ROOM — community-shared solutions (security-first)
# ════════════════════════════════════════════════════════════════════════════
# Rules enforced here (never trust the client):
#  - every write requires a valid Supabase JWT (require_auth)
#  - strict length caps; only plain text is stored (rendered safely by the
#    frontend — no HTML is ever interpreted)
#  - max 20 shares per user per day (spam cap)
#  - likes are one-per-user (toggle); deletes are owner-only
#  - reads go through the service key; tables stay RLS-locked (no policies)

ROOM_MAX_SHARES_PER_DAY = 20


class RoomShareRequest(BaseModel):
    question_text: str
    solution_text: str
    topic: Optional[str] = ""
    exam_type: Optional[str] = ""
    source: Optional[str] = ""


class RoomLikeRequest(BaseModel):
    solution_id: str


def _clean_text(value: str, limit: int) -> str:
    return " ".join((value or "").split())[:limit]


async def _room_username(client: httpx.AsyncClient, user_id: str) -> str:
    try:
        prof = await client.get(
            sb_url("profiles", f"id=eq.{user_id}&select=username,full_name&limit=1"),
            headers=HEADERS,
        )
        if prof.status_code == 200 and prof.json():
            row = prof.json()[0]
            return row.get("username") or (row.get("full_name") or "").split(" ")[0] or "Student"
    except Exception:
        pass
    return "Student"


@router.post("/room/share")
async def room_share(req: RoomShareRequest, user=Depends(require_auth)):
    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    question = _clean_text(req.question_text, 2000)
    solution = _clean_text(req.solution_text, 8000)
    if len(question) < 10 or len(solution) < 10:
        raise HTTPException(status_code=400, detail="Question and solution need a bit more detail.")
    topic = _clean_text(req.topic, 80)
    exam_type = _clean_text(req.exam_type, 20)
    source = _clean_text(req.source, 30)

    today = datetime.utcnow().date().isoformat()
    async with httpx.AsyncClient(timeout=10) as client:
        cnt = await client.get(
            sb_url("room_solutions",
                   f"user_id=eq.{user_id}&created_at=gte.{today}T00:00:00Z&select=id"),
            headers={**HEADERS, "Prefer": "count=exact"},
        )
        try:
            total = int(cnt.headers.get("Content-Range", "*/0").split("/")[-1])
        except (ValueError, IndexError):
            total = 0
        if total >= ROOM_MAX_SHARES_PER_DAY:
            raise HTTPException(status_code=429, detail="Daily sharing limit reached. Try again tomorrow.")
        username = await _room_username(client, user_id)
        ins = await client.post(
            sb_url("room_solutions"),
            headers=HEADERS,
            json={"user_id": user_id, "username": username,
                  "question_text": question, "solution_text": solution,
                  "topic": topic, "exam_type": exam_type, "source": source,
                  "likes_count": 0, "status": "open"},
        )
    if ins.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Could not share right now. Please try again.")
    row = ins.json()
    row = row[0] if isinstance(row, list) else row
    return {"ok": True, "id": row.get("id")}


@router.get("/room/feed")
async def room_feed(topic: str = "", exam_type: str = "",
                    limit: int = 20, offset: int = 0,
                    user=Depends(require_auth)):
    user_id = getattr(user, "id", None)
    limit = max(1, min(limit, 50))
    offset = max(0, offset)
    # Strip wildcard chars so filters can't be widened maliciously
    topic = (topic or "").replace("*", "").replace("%", "")[:80]
    exam_type = (exam_type or "").replace("*", "").replace("%", "")[:20]
    q = "select=id,user_id,username,question_text,solution_text,topic,exam_type,source,likes_count,created_at&order=created_at.desc"
    q += f"&limit={limit}&offset={offset}"
    if topic:
        q += f"&topic=ilike.*{topic}*"
    if exam_type:
        q += f"&exam_type=eq.{exam_type}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(sb_url("room_solutions", q), headers=HEADERS)
        liked = set()
        if user_id:
            mine = await client.get(
                sb_url("room_likes", f"user_id=eq.{user_id}&select=solution_id&limit=500"),
                headers=HEADERS,
            )
            if mine.status_code == 200:
                liked = {r.get("solution_id") for r in (mine.json() or [])}
    rows = resp.json() if resp.status_code == 200 else []
    for r in rows:
        r["liked_by_me"] = r.get("id") in liked
        r["mine"] = (r.get("user_id") == user_id)
    return {"solutions": rows}


@router.post("/room/like")
async def room_like(req: RoomLikeRequest, user=Depends(require_auth)):
    user_id = getattr(user, "id", None)
    if not user_id or not req.solution_id:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    async with httpx.AsyncClient(timeout=10) as client:
        existing = await client.get(
            sb_url("room_likes",
                   f"user_id=eq.{user_id}&solution_id=eq.{req.solution_id}&select=solution_id&limit=1"),
            headers=HEADERS,
        )
        has = existing.status_code == 200 and bool(existing.json())
        if has:
            await client.delete(
                sb_url("room_likes",
                       f"user_id=eq.{user_id}&solution_id=eq.{req.solution_id}"),
                headers=HEADERS,
            )
            delta = -1
        else:
            await client.post(
                sb_url("room_likes"),
                headers=HEADERS,
                json={"user_id": user_id, "solution_id": req.solution_id},
            )
            delta = 1
        cur = await client.get(
            sb_url("room_solutions", f"id=eq.{req.solution_id}&select=likes_count&limit=1"),
            headers=HEADERS,
        )
        count = 0
        if cur.status_code == 200 and cur.json():
            count = max(0, (cur.json()[0].get("likes_count") or 0) + delta)
            await client.patch(
                sb_url("room_solutions", f"id=eq.{req.solution_id}"),
                headers=HEADERS,
                json={"likes_count": count},
            )
    return {"ok": True, "liked": not has, "likes_count": count}


@router.delete("/room/solution/{solution_id}")
async def room_delete(solution_id: str, user=Depends(require_auth)):
    user_id = getattr(user, "id", None)
    async with httpx.AsyncClient(timeout=10) as client:
        row = await client.get(
            sb_url("room_solutions", f"id=eq.{solution_id}&select=user_id&limit=1"),
            headers=HEADERS,
        )
        if row.status_code != 200 or not row.json():
            raise HTTPException(status_code=404, detail="Solution not found.")
        if row.json()[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own shares.")
        await client.delete(
            sb_url("room_likes", f"solution_id=eq.{solution_id}"),
            headers=HEADERS,
        )
        await client.delete(
            sb_url("room_solutions", f"id=eq.{solution_id}"),
            headers=HEADERS,
        )
    return {"ok": True}

