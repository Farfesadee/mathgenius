"""Admin control room — stats, flags, feedback, room moderation.

Security model (defense in depth):
- Every endpoint requires a valid Supabase JWT (require_auth).
- On top of that, the caller's email must be in ADMIN_EMAILS
  (comma-separated env var, falls back to ADMIN_EMAIL). Anything else
  gets 403 — the frontend gate is cosmetic only; this is the real lock.
- All data access uses the service key; admin tables stay RLS-locked.
"""

import os
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.dependencies import require_auth

router = APIRouter(prefix="/admin", tags=["Admin"])

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def _admin_emails() -> set:
    raw = os.environ.get("ADMIN_EMAILS", "") or os.environ.get("ADMIN_EMAIL", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


async def require_admin(user=Depends(require_auth)):
    allowed = _admin_emails()
    email = (getattr(user, "email", "") or "").lower()
    if not allowed or email not in allowed:
        raise HTTPException(status_code=403, detail="Restricted area.")
    return user


def _sb(table: str, query: str = "") -> str:
    base = f"{SUPABASE_URL}/rest/v1/{table}"
    return f"{base}?{query}" if query else base


async def _count(client: httpx.AsyncClient, table: str, query: str = "") -> int:
    """Row count via Content-Range (no data transfer). Returns 0 on any issue."""
    try:
        q = (query + "&" if query else "") + "select=id&limit=1"
        r = await client.get(
            _sb(table, q),
            headers={**HEADERS, "Prefer": "count=exact"},
        )
        if r.status_code != 200:
            return 0
        return int(r.headers.get("Content-Range", "*/0").split("/")[-1])
    except Exception:
        return 0


async def _rows(client: httpx.AsyncClient, table: str, query: str):
    try:
        r = await client.get(_sb(table, query), headers=HEADERS)
        if r.status_code != 200:
            return []
        data = r.json()
        return data if isinstance(data, list) else []
    except Exception:
        return []


class FlagStatusRequest(BaseModel):
    status: str  # open | reviewing | fixed | dismissed


@router.get("/me")
async def admin_me(user=Depends(require_admin)):
    return {"is_admin": True, "email": getattr(user, "email", "")}


@router.get("/stats")
async def admin_stats(user=Depends(require_admin)):
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    async with httpx.AsyncClient(timeout=15) as client:
        signups_total = await _count(client, "profiles")
        signups_week = await _count(
            client, "profiles", f"created_at=gte.{week_ago}")
        open_flags = await _count(
            client, "question_flags", "status=eq.open")
        room_posts = await _count(client, "room_solutions")
        room_likes = await _count(client, "room_likes")
        recent_fb = await _rows(
            client, "teach_feedback",
            "select=rating&order=created_at.desc&limit=100")
        recent_flags = await _rows(
            client, "question_flags",
            "select=id,exam_type,topic,reason,status,created_at"
            "&order=created_at.desc&limit=5")
        recent_room = await _rows(
            client, "room_solutions",
            "select=id,username,topic,exam_type,likes_count,created_at"
            "&order=created_at.desc&limit=5")
    thumbs_up = sum(1 for f in recent_fb if f.get("rating") == "up")
    thumbs_down = sum(1 for f in recent_fb if f.get("rating") == "down")
    return {
        "signups_total": signups_total,
        "signups_week": signups_week,
        "open_flags": open_flags,
        "room_posts": room_posts,
        "room_likes": room_likes,
        "thumbs_up_100": thumbs_up,
        "thumbs_down_100": thumbs_down,
        "recent_flags": recent_flags,
        "recent_room": recent_room,
    }


@router.get("/flags")
async def admin_flags(status: str = "open", limit: int = 100,
                      user=Depends(require_admin)):
    limit = max(1, min(limit, 200))
    q = ("select=id,user_id,user_email,username,question_text,topic,exam_type,"
         "source,level,reason,note,status,created_at&order=created_at.desc"
         f"&limit={limit}")
    if status and status != "all":
        q += f"&status=eq.{status}"
    async with httpx.AsyncClient(timeout=15) as client:
        return {"flags": await _rows(client, "question_flags", q)}


@router.patch("/flags/{flag_id}")
async def admin_flag_status(flag_id: str, req: FlagStatusRequest,
                            user=Depends(require_admin)):
    if req.status not in ("open", "reviewing", "fixed", "dismissed"):
        raise HTTPException(status_code=400, detail="Invalid status.")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.patch(
            _sb("question_flags", f"id=eq.{flag_id}"),
            headers=HEADERS,
            json={"status": req.status},
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Could not update.")
    return {"ok": True, "status": req.status}


@router.get("/feedback")
async def admin_feedback(rating: str = "", limit: int = 50,
                         user=Depends(require_admin)):
    limit = max(1, min(limit, 200))
    q = ("select=id,user_id,topic,level,question,response_preview,rating,"
         "comment,created_at&order=created_at.desc"
         f"&limit={limit}")
    if rating in ("up", "down"):
        q += f"&rating=eq.{rating}"
    async with httpx.AsyncClient(timeout=15) as client:
        return {"feedback": await _rows(client, "teach_feedback", q)}


@router.get("/room")
async def admin_room(limit: int = 50, user=Depends(require_admin)):
    limit = max(1, min(limit, 200))
    async with httpx.AsyncClient(timeout=15) as client:
        return {"solutions": await _rows(
            client, "room_solutions",
            "select=id,user_id,username,question_text,solution_text,topic,"
            "exam_type,source,likes_count,status,created_at"
            "&order=created_at.desc"
            f"&limit={limit}")}


@router.delete("/room/{solution_id}")
async def admin_room_delete(solution_id: str, user=Depends(require_admin)):
    async with httpx.AsyncClient(timeout=10) as client:
        await client.delete(
            _sb("room_likes", f"solution_id=eq.{solution_id}"),
            headers=HEADERS,
        )
        r = await client.delete(
            _sb("room_solutions", f"id=eq.{solution_id}"),
            headers=HEADERS,
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Could not delete.")
    return {"ok": True}


@router.get("/users")
async def admin_users(search: str = "", limit: int = 30,
                      user=Depends(require_admin)):
    """Look up users by email/username (for support). Never returns secrets."""
    limit = max(1, min(limit, 50))
    async with httpx.AsyncClient(timeout=15) as client:
        q = ("select=id,username,full_name,school,exam_target,role,created_at"
             "&order=created_at.desc"
             f"&limit={limit}")
        if search:
            s = search.replace("*", "").replace("%", "")[:80]
            q += f"&or=(username.ilike.*{s}*,full_name.ilike.*{s}*)"
        return {"users": await _rows(client, "profiles", q)}
