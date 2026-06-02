"""
agents/supervisor.py — Layer 1: Supervisor Agent

Receives the user question and classifies intent:
  - 'erp'    → employee/HR/payroll/attendance/project data questions
  - 'policy' → company policy, rules, handbook questions
  - 'hybrid' → needs both DB data AND policy context

Uses LLM classification (not keywords) for accuracy.
"""

import os
import json
import re
import requests
from agents.state import OfficeGPTState
from schema import SCHEMA_SUMMARY
from langsmith import traceable

GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

SUPERVISOR_PROMPT = f"""You are a routing agent for an HRMS AI assistant.

Your ONLY job is to classify the user's question into one of three categories:

1. "erp" — needs HR database data. This includes ANY question about:
   - Employees (name, email, phone, department, designation, joining date, status)
   - Salary, payroll, net salary, pay structure
   - Attendance, clock-in, clock-out, work hours
   - Leaves (applied, approved, rejected, balance)
   - Projects, tasks, timesheets
   - Assets, expenses
   - Candidates, job openings, recruitment
   - Promotions, resignations, training
   - Counts, lists, summaries of any HR data
   - ANY specific person's details ("what is X's email/salary/department")

2. "policy" — needs company policy documents:
   - Leave policy, WFH policy, PIP, probation
   - Rules, procedures, guidelines, handbook
   - Termination, disciplinary procedures

3. "hybrid" — needs BOTH database + policy:
   - "Has X exceeded their leave limit?" (needs records + policy)
   - "Is X eligible for promotion?" (needs profile + policy)

Available database tables:
{SCHEMA_SUMMARY}

Respond with ONLY a JSON object — no explanation, no other text:
{{"intent": "erp"}}
or
{{"intent": "policy"}}
or
{{"intent": "hybrid"}}
"""


def _call_groq(messages: list, max_tokens: int = 100) -> str:
    """Call Groq with exponential backoff on 429."""
    import time
    delays = [5, 15, 30]
    for attempt, delay in enumerate(delays, 1):
        resp = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY', '')}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": 0},
            timeout=30,
        )
        if resp.status_code == 429:
            print(f"[Supervisor] Rate limited (429) — waiting {delay}s (attempt {attempt}/3)...", flush=True)
            time.sleep(delay)
            continue
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    raise RuntimeError("Groq rate limit exceeded. Please wait a moment and try again.")


@traceable(name="supervisor_node")
def supervisor_node(state: OfficeGPTState) -> dict:
    # If user selected a specific tool — skip LLM classification
    if state.get("forced_intent"):
        intent = state["forced_intent"]
        print(f"[Supervisor] Forced intent: '{intent}' (user selected tool)", flush=True)
        return {"intent": intent}

    # Detect pure chitchat (greetings, thanks) — no DB lookup needed
    q = state.get("user_question", "").strip().lower()
    pure_chitchat = ["hi", "hello", "hey", "thanks", "thank you", "thx", "okay", "ok",
                     "got it", "great", "nice", "cool", "good morning", "good evening"]
    if any(q == p or q.startswith(p + " ") or q.endswith(" " + p) for p in pure_chitchat):
        print(f"[Supervisor] Detected chitchat — skipping DB", flush=True)
        return {"intent": "chitchat", "retry_count": 0, "sources": [], "sql_error": None}

    # Statements like "X is Y" or "is X Y?" → route to ERP to VERIFY against DB
    verify_patterns = [" is ", " are ", " was ", " works as ", " joined as "]
    is_verifiable = any(p in f" {q} " for p in verify_patterns)
    if is_verifiable:
        print(f"[Supervisor] Detected statement/question to verify — routing to ERP", flush=True)
        return {"intent": "erp_verify", "retry_count": 0, "sources": [], "sql_error": None}

    """
    Classify user intent and return updated state with 'intent' set.
    """
    question = state["user_question"]
    print(f"[Supervisor] Classifying: '{question}'", flush=True)

    messages = [
        {"role": "system", "content": SUPERVISOR_PROMPT},
        {"role": "user",   "content": f"Question: {question}"},
    ]

    try:
        raw = _call_groq(messages)
        # Parse JSON from response
        match = re.search(r'\{.*?\}', raw, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            intent = parsed.get("intent", "erp")
        else:
            intent = "erp"  # safe default
    except Exception as e:
        print(f"[Supervisor] Error: {e} — defaulting to 'erp'", flush=True)
        intent = "erp"

    # Validate intent value
    if intent not in ("erp", "policy", "hybrid", "chitchat", "erp_verify"):
        intent = "erp"

    print(f"[Supervisor] Intent → '{intent}'", flush=True)
    return {"intent": intent, "retry_count": 0, "sources": [], "sql_error": None}


def route_after_supervisor(state: OfficeGPTState) -> str:
    """
    Conditional edge: tells LangGraph which node to go to next.
    """
    intent = state.get("intent", "erp")
    if intent == "policy":
        return "rag_agent"
    # Both 'erp' and 'hybrid' go to planner first
    return "erp_planner"