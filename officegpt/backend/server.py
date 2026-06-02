"""
backend/server.py — FastAPI backend for OfficeGPT

CHANGES FROM ORIGINAL:
  - _get_user_from_request() now also returns the raw token string
  - run_graph() call passes token=token
  - Removed: from db import test_connection  (DB health check replaced)
  - /health endpoint no longer tests DB directly (agent has no DB access)

Everything else is unchanged: CORS, JWT verification, cookie name,
conversation endpoints, ChatRequest/ChatResponse models.
"""

import sys
import os
import jwt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from officegpt_graph import run_graph
from chat_store import list_conversations, get_conversation, delete_conversation, rename_conversation

JWT_SECRET  = os.getenv("JWT_SECRET", "")
COOKIE_NAME = "smarthr_token"

app = FastAPI(title="OfficeGPT API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://13.206.99.34:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── JWT helpers (unchanged) ───────────────────────────────────────────────────

def _decode_token(token: str) -> dict:
    """
    Verify JWT signed by Node.js with:
      issuer:   'smarthr-api'
      audience: 'smarthr-client'
      algo:     HS256
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            issuer="smarthr-api",
            audience="smarthr-client",
        )
        print(f"[Auth] ✅ Token verified. user={payload.get('id')} role={payload.get('role')} company={payload.get('company_id')}", flush=True)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience.")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer.")
    except jwt.InvalidTokenError as e:
        print(f"[Auth] ❌ Token error: {e}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid authentication token.")


def _get_user_from_request(request: Request) -> dict:
    """
    Extract verified user context from HttpOnly cookie.

    CHANGE: now also returns 'token' (the raw JWT string) so it can
    be forwarded to the Express backend on every API call.

    Returns: { id, company_id, role, username, token }
    Never trusts anything from the request body for auth.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")

    payload = _decode_token(token)

    user_id    = payload.get("id")
    company_id = payload.get("company_id")
    role       = payload.get("role", "employee")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id.")
    if not company_id:
        raise HTTPException(status_code=401, detail="Token missing company_id.")

    return {
        "id":         int(user_id),
        "company_id": int(company_id),
        "role":       str(role),
        "username":   payload.get("username", ""),
        "token":      token,           # ← NEW: raw JWT for API forwarding
    }


# ── Request / Response models (unchanged) ─────────────────────────────────────

class ChatRequest(BaseModel):
    question:      str
    thread_id:     Optional[str] = None
    forced_intent: Optional[str] = None   # "erp" | "policy" | null (auto)


class ChatResponse(BaseModel):
    answer:    str
    sources:   list = []
    intent:    str  = ""
    tool_used: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/config")
def get_config():
    return {
        "assistant_name": os.getenv("ASSISTANT_NAME", "OfficeGPT"),
        "client_name":    os.getenv("CLIENT_NAME", "Company"),
    }


@app.get("/health")
def health():
    """
    CHANGE: removed DB connection test — agent no longer has direct DB access.
    Health check now only confirms the service is running and API base URL is set.
    """
    api_base = os.getenv("ERP_API_BASE_URL", "http://localhost:5000/api")
    return {
        "status":  "ok",
        "api_base": api_base,
        "version": "2.1.0 (API-layer)",
    }

@app.options("/chat")
async def options_chat():
    return {"ok": True}



@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    user = _get_user_from_request(request)

    company_id = user["company_id"]
    role       = user["role"]
    user_id    = user["id"]
    token      = user["token"]           # ← NEW

    thread_id = req.thread_id or f"user-{user_id}"

    print(
        f"\n[Server] Q='{req.question}' | "
        f"company={company_id} role={role} user={user_id} thread={thread_id}",
        flush=True
    )

    try:
        result = run_graph(
            user_question=req.question,
            company_id=company_id,
            user_role=role,
            user_id=user_id,
            thread_id=thread_id,
            forced_intent=req.forced_intent,
            token=token,                 # ← NEW: forwarded to every API call
        )

        print(f"[Server] intent={result['intent']} tool_used={result['tool_used']}", flush=True)
        print(f"[Server] answer[:120]={result['answer'][:120]}", flush=True)

        return ChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            intent=result.get("intent", ""),
            tool_used=result.get("tool_used", False),
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Server] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Conversation history endpoints (unchanged) ────────────────────────────────

@app.get("/conversations")
async def get_conversations(request: Request):
    user = _get_user_from_request(request)
    convs = list_conversations(user["id"], user["company_id"])
    return {"conversations": convs}


@app.get("/conversations/{thread_id}")
async def get_conversation_detail(thread_id: str, request: Request):
    user = _get_user_from_request(request)
    conv = get_conversation(thread_id, user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv


@app.delete("/conversations/{thread_id}")
async def delete_conversation_endpoint(thread_id: str, request: Request):
    user = _get_user_from_request(request)
    ok = delete_conversation(thread_id, user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"deleted": True}


@app.patch("/conversations/{thread_id}")
async def rename_conversation_endpoint(thread_id: str, request: Request):
    user = _get_user_from_request(request)
    body = await request.json()
    new_title = body.get("title", "").strip()
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty.")
    ok = rename_conversation(thread_id, user["id"], new_title)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"renamed": True}