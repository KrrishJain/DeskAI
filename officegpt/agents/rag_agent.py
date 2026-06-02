"""
agents/rag_agent.py — RAG Agent Node

Wraps existing backend/search.py + backend/rag.py into a LangGraph node.
Handles policy/handbook questions using FAISS vector search + Groq LLM.

Input state fields used:
  - user_question
  - user_role   (affects response depth via SYSTEM_PROMPT in rag.py)

Output state fields written:
  - rag_result  (str answer)
  - sources     (list of {source, page})
"""

import os
import sys
import requests
from pathlib import Path

# ── Ensure project root and backend/ are both in sys.path ───────────────────
ROOT    = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
for p in [str(ROOT), str(BACKEND)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from search import search as vector_search
from rag import build_prompt, validate_answer

from agents.state import OfficeGPTState
from langsmith import traceable

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"


def _call_groq(prompt: str, max_tokens: int = 800) -> str:
    """Send RAG prompt to Groq with exponential backoff on 429."""
    import time
    delays = [5, 15, 30]
    for attempt, delay in enumerate(delays, 1):
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       GROQ_MODEL,
                "messages":    [{"role": "user", "content": prompt}],
                "max_tokens":  max_tokens,
                "temperature": 0.1,
            },
            timeout=45,
        )
        if resp.status_code == 429:
            print(f"[RAG] Rate limited (429) — waiting {delay}s (attempt {attempt}/3)...", flush=True)
            time.sleep(delay)
            continue
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    raise RuntimeError("Groq rate limit exceeded. Please wait a moment and try again.")


@traceable(name="rag_agent_node")
def rag_agent_node(state: OfficeGPTState) -> dict:
    """
    LangGraph node — runs RAG pipeline for policy questions.

    Steps:
      1. Vector search (FAISS) → top-5 relevant document chunks
      2. Build prompt using existing rag.build_prompt()
      3. Call Groq LLM
      4. Validate answer against context using rag.validate_answer()
      5. Return rag_result + sources
    """
    question  = state["user_question"]
    user_role = state.get("user_role", "employee")

    print(f"[RAG] Q: '{question}' | role={user_role}", flush=True)

    # ── Step 1: Vector search ────────────────────────────────
    docs = vector_search(question, top_k=5)
    print(f"[RAG] Retrieved {len(docs)} chunks from FAISS", flush=True)

    if not docs:
        print("[RAG] No relevant docs found", flush=True)
        return {
            "rag_result": "This information is not available in current company policy.",
            "sources":    [],
        }

    # ── Step 2: Build prompt with role prefix ────────────────
    # rag.py SYSTEM_PROMPT uses "ROLE: QUESTION" format for role-based depth
    role_question = f"{user_role.upper()}: {question}"
    prompt, context, sources = build_prompt(role_question, docs)
    print(f"[RAG] Built prompt. Context length: {len(context)} chars | Sources: {sources}", flush=True)

    # ── Step 3: LLM call ─────────────────────────────────────
    try:
        raw_answer = _call_groq(prompt)
        print(f"[RAG] Raw LLM answer: {raw_answer[:150]}", flush=True)
    except Exception as e:
        print(f"[RAG] LLM error: {e}", flush=True)
        return {
            "rag_result": "Sorry, I couldn't process that policy question. Please try again.",
            "sources":    sources,
        }

    # ── Step 4: Validate answer is grounded in context ───────
    validated = validate_answer(raw_answer, context)
    print(f"[RAG] Validated answer: {validated[:150]}", flush=True)

    return {
        "rag_result": validated,
        "sources":    sources,
    }       