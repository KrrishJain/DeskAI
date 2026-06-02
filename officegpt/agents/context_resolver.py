"""
agents/context_resolver.py — Conversation Memory Node

Runs BEFORE supervisor. Rewrites vague/follow-up questions
using recent chat history so every downstream agent gets
a fully self-contained question.

Examples:
  History: "show me kaushik jain"
  Q: "what is his email?"
  → Resolved: "what is kaushik jain's email?"

  History: "list employees in software department"
  Q: "how many are there?"
  → Resolved: "how many employees are in the software department?"
"""

import os, time, requests
from agents.state import OfficeGPTState

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

RESOLVER_SYSTEM = """You are a conversation context resolver.

Your ONLY job: Given a chat history and a new question, rewrite the question
to be fully self-contained — replacing all pronouns and references with actual names/values from history.

Rules:
- If the question is already self-contained → return it UNCHANGED
- If it uses "he/she/his/her/they/it/this/that/same" → replace with the actual subject from history
- If it refers to a previous result ("how many", "what about them") → expand it
- Output ONLY the rewritten question. No explanation, no quotes, nothing else.

Examples:
History: user asked "show kaushik jain details"
New Q: "what is his phone number?"
Output: what is kaushik jain's phone number?

History: user asked "list employees in software department", assistant returned 3 employees
New Q: "how many are there?"
Output: how many employees are in the software department?

History: user asked "show leave policy"
New Q: "what about sick leave?"
Output: what is the sick leave policy?

History: (empty)
New Q: "show all employees"
Output: show all employees
"""


def _call_groq(messages, max_tokens=150):
    delays = [5, 15, 30]
    for attempt, delay in enumerate(delays, 1):
        resp = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": 0},
            timeout=30,
        )
        if resp.status_code == 429:
            print(f"[Resolver] Rate limited — waiting {delay}s...", flush=True)
            time.sleep(delay)
            continue
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    return None   # fallback: use original question


def context_resolver_node(state: OfficeGPTState) -> dict:
    question    = state["user_question"]
    history     = state.get("chat_history", [])

    # No history → nothing to resolve
    if not history:
        print(f"[Resolver] No history — using question as-is: '{question}'", flush=True)
        return {"user_question": question}

    # Check if question needs resolution (has pronouns or vague references)
    vague_signals = ["he ", "she ", "his ", "her ", "they ", "their ",
                     "it ", "this ", "that ", "same ", "how many", "what about",
                     "also ", "and him", "and her", "tell me more"]

    needs_resolution = any(sig in question.lower() for sig in vague_signals)

    if not needs_resolution:
        print(f"[Resolver] Self-contained — no resolution needed", flush=True)
        return {"user_question": question}

    # Build history summary for context (last 6 turns max)
    recent = history[-6:]
    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in recent
    )

    messages = [
        {"role": "system", "content": RESOLVER_SYSTEM},
        {"role": "user",   "content": f"Chat history:\n{history_text}\n\nNew question: {question}"},
    ]

    try:
        resolved = _call_groq(messages)
        if resolved and resolved != question:
            print(f"[Resolver] '{question}' → '{resolved}'", flush=True)
            return {"user_question": resolved}
        else:
            return {"user_question": question}
    except Exception as e:
        print(f"[Resolver] Error: {e} — using original", flush=True)
        return {"user_question": question}