"""
agents/formatter.py — Final response formatter

ERP/Verify: Full data fetched → LLM answers from context (no hallucination risk)
Policy:     RAG chunks → LLM answers conversationally
Hybrid:     Both sources combined
Chitchat:   Pure Python responses
"""
from __future__ import annotations
import os, json, requests, time, decimal
from pathlib import Path
from datetime import date, datetime
from agents.state import OfficeGPTState
from langsmith import traceable

MAX_RETRIES = 3
GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions"


# ── Groq helpers ──────────────────────────────────────────────────────────────

def _get_groq_key():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
    return os.getenv("GROQ_API_KEY", "")

def _get_model():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
    return os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

def _call_groq(system_prompt: str, user_prompt: str, max_tokens=800) -> str:
    key, model = _get_groq_key(), _get_model()
    delays = [5, 15, 30]
    for attempt in range(3):
        try:
            resp = requests.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.1,
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
        except requests.exceptions.HTTPError:
            if resp.status_code == 429 and attempt < 2:
                wait = delays[attempt]
                print(f"[Formatter] Rate limited — waiting {wait}s...", flush=True)
                time.sleep(wait)
            else:
                return None
    return None


# ── Serialisation helpers ─────────────────────────────────────────────────────

def _fmt_date(val):
    if isinstance(val, datetime): val = val.date()
    try: return val.strftime("%-d %B %Y")
    except: return str(val)

def _serialize(k, v):
    if v is None: return None
    if isinstance(v, bool): return "Active ✅" if v else "Inactive ❌"
    if isinstance(v, (date, datetime)): return _fmt_date(v)
    if isinstance(v, decimal.Decimal):
        if k in ("net_salary","basic","total_earnings","total_deductions","hra","da"):
            return f"₹{float(v):,.0f}"
        return float(v)
    return v

def _normalize(rows):
    return [{k: _serialize(k, v) for k, v in row.items()} for row in rows]

def _clean_for_llm(rows):
    """Clean rows for JSON context — remove None values."""
    result = []
    for row in rows:
        clean = {}
        for k, v in row.items():
            v2 = _serialize(k, v)
            if v2 is not None and v2 != "":
                clean[k] = v2
        result.append(clean)
    return result

def _label(k):
    return k.replace("_", " ").title()


# ── Markdown helpers ──────────────────────────────────────────────────────────

def _md_table(rows: list[dict]) -> str:
    headers = list(rows[0].keys())
    labels  = [_label(h) for h in headers]
    sep     = ["---"] * len(headers)
    def row_cells(row):
        return [str(row.get(h) or "—") for h in headers]
    lines = [
        "| " + " | ".join(labels) + " |",
        "| " + " | ".join(sep)    + " |",
    ] + ["| " + " | ".join(row_cells(r)) + " |" for r in rows]
    return "\n".join(lines)

def _md_card(row: dict) -> str:
    first = row.get("first_name", "")
    last  = row.get("last_name",  "")
    lines = []
    if first or last:
        lines.append(f"### {first} {last}".strip())
    skip = {"first_name", "last_name"}
    for k, v in row.items():
        if k in skip or v is None or v == "":
            continue
        lines.append(f"**{_label(k)}:** {v}")
    return "\n".join(lines)


# ── Access denied messages ────────────────────────────────────────────────────

ACCESS_DENIED_MESSAGES = {
    "salary_bank": (
        "🔒 **Access Restricted**\n\n"
        "Salary and bank details are confidential and only accessible to HR and Admin staff.\n\n"
        "If you need this information, please contact your HR department directly."
    ),
    "default": (
        "🔒 **Access Restricted**\n\n"
        "You don't have permission to view this information.\n"
        "Please contact HR if you need assistance."
    ),
}


# ── Main formatter node ───────────────────────────────────────────────────────

@traceable(name="formatter_node")
def formatter_node(state: OfficeGPTState) -> dict:
    intent      = state.get("intent", "erp")
    question    = state.get("user_question", "")
    sql_result  = state.get("sql_result")
    sql_error   = state.get("sql_error")
    retry_count = state.get("retry_count", 0)
    rag_result  = state.get("rag_result")
    user_role   = state.get("user_role", "employee")

    print(f"[Formatter] intent={intent} | rows={len(sql_result) if sql_result else 0} | sql_error={bool(sql_error)}", flush=True)

    # ── PASSTHROUGH 1: planner already set the answer ───────────────────────
    # Covers: missing_info (ask for details), access_denied (role block)
    existing_answer = state.get("final_answer")
    if existing_answer and (state.get("missing_info") or state.get("access_denied")):
        print(f"[Formatter] Passing through pre-set answer (missing_info={state.get('missing_info')} access_denied={state.get('access_denied')})", flush=True)
        return {"final_answer": existing_answer}

    # ── PASSTHROUGH 2: executor already built a write-operation confirmation ─
    # When api_executor successfully ran a POST/PUT/DELETE, it already called
    # _format_results and set final_answer. For write ops, trust that result —
    # sending it to the LLM risks the LLM misreading it as a query result.
    write_keywords = ["add ", "create ", "new employ", "update ", "deactivate ", "delete "]
    q_lower_pass   = question.lower()
    if (existing_answer
            and state.get("tool_used")
            and any(w in q_lower_pass for w in write_keywords)
            and not state.get("api_error")):
        print("[Formatter] Passing through write-op answer from executor", flush=True)
        return {"final_answer": existing_answer}

    # ── Access denied (from planner sentinel or state flag) ───────────────────
    if state.get("access_denied"):
        resource = state.get("denied_resource", "this information")
        answer = (
            f"🔒 **Access Restricted**\n\n"
            f"Sorry, you don't have permission to view **{resource}**.\n"
            f"This information is only available to HR and Admin users."
        )
        return {"final_answer": answer, "tool_used": False}

    # Check for ACCESS_DENIED sentinel row
    if sql_result and len(sql_result) == 1:
        row = sql_result[0]
        if row.get("error_type") == "ACCESS_DENIED":
            reason  = row.get("reason", "default")
            message = ACCESS_DENIED_MESSAGES.get(reason, ACCESS_DENIED_MESSAGES["default"])
            return {"final_answer": message, "tool_used": False}

    # ── Chitchat ───────────────────────────────────────────────────────────────
    if intent == "chitchat":
        q_lower = question.strip().lower()
        if any(w in q_lower for w in ["hi", "hello", "hey"]):
            answer = "Hello! How can I help you today? You can ask me about employees, departments, policies, and more."
        elif any(w in q_lower for w in ["thanks", "thank you", "thx"]):
            answer = "You're welcome! Let me know if there's anything else I can help with."
        elif any(w in q_lower for w in ["okay", "ok", "got it", "great", "nice", "cool"]):
            answer = "Got it! Feel free to ask me anything about your team or company policies."
        else:
            first_word = question.split()[0].title() if question.split() else "That"
            answer = f"Got it! Would you like me to **look up {first_word}'s details**, or is there something specific you'd like to know?"
        print(f"[Formatter] chitchat → conversational response", flush=True)
        return {"final_answer": answer, "tool_used": False}

    # ── ERP max retries error ─────────────────────────────────────────────────
    if sql_error and retry_count >= MAX_RETRIES:
        return {
            "final_answer": (
                "⚠️ **Something went wrong**\n\n"
                "I wasn't able to retrieve that data. Please try rephrasing your question.\n\n"
                f"_Error: {sql_error}_"
            ),
            "tool_used": False,
        }

    # ── ERP + ERP Verify — LLM answers from full data context ─────────────────
    if intent in ("erp", "erp_verify"):
        if not sql_result:
            return {
                "final_answer": (
                    "I couldn't find any records matching your query.\n\n"
                    "Double-check the name or department and try again."
                ),
                "tool_used": False,
            }

        # ── Fast-path: single created/updated record — no LLM needed ─────────
        # Triggered when: write keyword in question AND result looks like a created record
        # Handles two response shapes:
        #   Shape A (list endpoint): row has "employee_id" key
        #   Shape B (create endpoint): row has "id" + "first_name" keys
        if len(sql_result) == 1:
            row     = sql_result[0]
            q_lower = question.lower()
            write_keywords = ["add ", "create ", "new employ", "added", "created"]
            is_write = any(w in q_lower for w in write_keywords)
            has_emp  = row.get("employee_id") or (row.get("id") and row.get("first_name"))

            if is_write and has_emp:
                first   = row.get("first_name", "")
                last    = row.get("last_name", "")
                name    = f"{first} {last}".strip()
                emp_id  = row.get("employee_id", f"ID-{row.get('id','')}")
                email   = row.get("email", "")
                uid     = row.get("user_id", "")
                # loginUsername comes from the API response body top level
                api_res     = state.get("api_result") or {}
                login_user  = api_res.get("loginUsername", "")
                login_line = f"**Login Username:** `{login_user}`\n" if login_user else ""
                answer = (
                    f"Employee **{name}** has been added successfully!\n\n"
                    f"**Employee ID:** {emp_id}\n"
                    f"**Email:** {email}\n"
                    f"**User ID:** {uid}\n"
                    + login_line
                    + "\nThey can now log in using their **username** and password."
                )
                return {"final_answer": answer, "tool_used": True}

        rows     = _clean_for_llm(sql_result)
        data_str = json.dumps(rows, indent=2)

        system_prompt = f"""You are OfficeGPT, an intelligent HR assistant.
You have been given data returned by the HRMS API. This data may be the result of a
read query (listing employees) OR a write operation (creating/updating an employee).

Answer the user's question or confirm the action based ONLY on this data.

Guidelines:
- If data contains employee_id or id field and the question was "add/create employee":
  → Confirm success: "Employee [name] has been created successfully."
  → Show key details: Employee ID, name, email, user_id
- Listing questions (show all, list by dept): respond with a clean markdown table
- Single employee questions: respond with a neat profile card using bold labels
- Verification questions (is X the Y?): clearly state Correct or Incorrect with facts
- Count/stat questions: give a direct number with context
- If a person is not found: say so clearly and suggest checking spelling
- Never say you "cannot" do something if the data shows it was already done
- Never invent or assume data — only use what is provided
- Keep answers professional and concise
- User role: {user_role}"""

        user_prompt = f"Employee data:\n{data_str}\n\nQuestion: {question}"

        print(f"[Formatter] LLM answering from {len(rows)} employee rows", flush=True)
        answer = _call_groq(system_prompt, user_prompt, max_tokens=800)

        if not answer:
            rows_norm = _normalize(sql_result)
            count     = len(rows_norm)
            if count == 1:
                answer = _md_card(rows_norm[0])
            else:
                answer = f"Found **{count}** result(s):\n\n" + _md_table(rows_norm)

        return {"final_answer": answer, "tool_used": True}

    # ── Policy ────────────────────────────────────────────────────────────────
    if intent == "policy":
        if not rag_result or "not available" in (rag_result or "").lower():
            return {
                "final_answer": (
                    "I couldn't find relevant policy information for your question.\n\n"
                    "Try rephrasing, or contact HR directly for assistance."
                ),
                "tool_used": False,
            }

        system_prompt = """You are OfficeGPT, a helpful HR assistant.
Answer the user's question based on the policy documents provided.
Be conversational, clear, and concise. Use bullet points where helpful."""

        user_prompt = f"Policy context:\n{rag_result}\n\nQuestion: {question}"
        answer = _call_groq(system_prompt, user_prompt, max_tokens=600)
        if not answer:
            answer = rag_result

        return {"final_answer": answer, "tool_used": False, "sources": state.get("sources", [])}

    # ── Hybrid ────────────────────────────────────────────────────────────────
    if intent == "hybrid":
        parts = []
        if sql_result:
            rows = _clean_for_llm(sql_result)
            parts.append(f"Employee data:\n{json.dumps(rows, indent=2)}")
        if rag_result and "not available" not in (rag_result or "").lower():
            parts.append(f"Policy context:\n{rag_result}")

        if not parts:
            return {"final_answer": "No relevant data found.", "tool_used": False}

        system_prompt = """You are OfficeGPT. Answer the question using both the employee data and policy context provided. Be concise and accurate."""
        user_prompt   = "\n\n".join(parts) + f"\n\nQuestion: {question}"
        answer = _call_groq(system_prompt, user_prompt, max_tokens=600)

        if not answer:
            fallback_parts = []
            if sql_result:
                rows_norm = _normalize(sql_result)
                if len(rows_norm) == 1:
                    fallback_parts.append("## Employee Data\n\n" + _md_card(rows_norm[0]))
                else:
                    fallback_parts.append(f"## Employee Data\n\nFound **{len(rows_norm)}** records:\n\n" + _md_table(rows_norm))
            if rag_result:
                fallback_parts.append("## Policy\n\n" + rag_result)
            answer = "\n\n---\n\n".join(fallback_parts) if fallback_parts else "No relevant data found."

        return {"final_answer": answer, "tool_used": bool(sql_result), "sources": state.get("sources", [])}

    return {"final_answer": "I'm not sure how to help with that. Could you rephrase?", "tool_used": False}