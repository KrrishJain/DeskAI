"""
chat_store.py — TinyDB-based chat persistence for OfficeGPT

Stores all conversations locally in officegpt/chats.json
No external DB needed — just a file.

FIX: TinyDB now opens chats.json with encoding="utf-8" so emoji
     characters (🪪 🏢 💼 etc.) in formatted answers don't cause
     UnicodeEncodeError on Windows (cp1252 default encoding).
"""

from pathlib import Path
from datetime import datetime, timezone
from tinydb import TinyDB, Query
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware

# ── DB setup ──────────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).resolve().parent / "chats.json"
_db     = None

def _get_db() -> TinyDB:
    global _db
    if _db is None:
        # FIX: explicitly pass encoding="utf-8" so emoji and non-ASCII
        # characters (₹, 🪪, ✅ etc.) are stored correctly on all platforms
        # including Windows where the default is cp1252.
        _db = TinyDB(
            DB_PATH,
            indent=2,
            ensure_ascii=False,
            encoding="utf-8",       # ← THE FIX
        )
    return _db

def _convs():
    return _get_db().table("conversations")

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Auto-title from first message ─────────────────────────────────────────────
def _make_title(first_message: str) -> str:
    title = first_message.strip()
    return title[:50] + "..." if len(title) > 50 else title


# ── Public API ────────────────────────────────────────────────────────────────

def get_history(thread_id: str) -> list:
    """Return messages list for a thread (for LangGraph context)."""
    C   = Query()
    doc = _convs().get(C.thread_id == thread_id)
    if not doc:
        return []
    return doc.get("messages", [])


def save_turn(
    thread_id:  str,
    user_id:    int,
    company_id: int,
    user_msg:   str,
    bot_msg:    str,
):
    """Append a user+assistant turn. Create conversation if new."""
    C     = Query()
    convs = _convs()
    doc   = convs.get(C.thread_id == thread_id)
    now   = _now()

    new_messages = [
        {"role": "user",      "content": user_msg, "ts": now},
        {"role": "assistant", "content": bot_msg,  "ts": now},
    ]

    if doc is None:
        # New conversation
        convs.insert({
            "thread_id":  thread_id,
            "user_id":    user_id,
            "company_id": company_id,
            "title":      _make_title(user_msg),
            "created_at": now,
            "updated_at": now,
            "messages":   new_messages,
        })
    else:
        # Append to existing — keep last 40 messages (20 exchanges)
        existing = doc.get("messages", [])
        all_msgs = existing + new_messages
        if len(all_msgs) > 40:
            all_msgs = all_msgs[-40:]

        convs.update(
            {"messages": all_msgs, "updated_at": now},
            C.thread_id == thread_id,
        )


def list_conversations(user_id: int, company_id: int) -> list:
    """List all conversations for a user, newest first."""
    C    = Query()
    docs = _convs().search((C.user_id == user_id) & (C.company_id == company_id))
    docs = sorted(docs, key=lambda d: d.get("updated_at", ""), reverse=True)
    return [
        {
            "thread_id":  d["thread_id"],
            "title":      d.get("title", "Untitled"),
            "updated_at": d.get("updated_at", ""),
            "created_at": d.get("created_at", ""),
            "preview":    _get_preview(d),
        }
        for d in docs
    ]


def get_conversation(thread_id: str, user_id: int) -> dict | None:
    """Load full conversation (ownership check)."""
    C   = Query()
    doc = _convs().get((C.thread_id == thread_id) & (C.user_id == user_id))
    return doc


def delete_conversation(thread_id: str, user_id: int) -> bool:
    """Delete a conversation. Returns True if deleted."""
    C       = Query()
    removed = _convs().remove((C.thread_id == thread_id) & (C.user_id == user_id))
    return len(removed) > 0


def rename_conversation(thread_id: str, user_id: int, new_title: str) -> bool:
    """Rename a conversation title."""
    C       = Query()
    updated = _convs().update(
        {"title": new_title.strip()[:60]},
        (C.thread_id == thread_id) & (C.user_id == user_id),
    )
    return len(updated) > 0


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_preview(doc: dict) -> str:
    """Last assistant message as preview."""
    messages = doc.get("messages", [])
    for msg in reversed(messages):
        if msg.get("role") == "assistant":
            text = msg.get("content", "")
            # Strip markdown for preview
            text = text.replace("**", "").replace("*", "").replace("#", "").strip()
            return text[:80] + "..." if len(text) > 80 else text
    return ""