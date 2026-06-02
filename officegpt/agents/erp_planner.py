"""
agents/erp_planner.py — Layer 2: API Tool Planner
"""

import os, re, json, time, requests
from pathlib import Path
from agents.state import OfficeGPTState
from langsmith import traceable

GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions"
MAX_RETRIES = 3

ROLE_ACCESS = {
    "employee": {
        "blocked_fields": [
            "basic","da","hra","conveyance","medical","allowance","others_earn",
            "tds","esi","pf","leave_deduction","prof_tax","labour_welfare","others_ded",
            "total_earnings","total_deductions","net_salary","salary_month","payslip_no",
            "bank_name","account_number","ifsc_code","branch_name",
            "email","phone","password_hash",
        ],
        "description": "Can see: name, department, designation, joining date, employee_id, is_active. CANNOT see: email, phone, salary, payroll, bank details of other employees.",
    },
    "hr":    {"blocked_fields": ["password_hash"], "description": "Full access to all HR data."},
    "admin": {"blocked_fields": ["password_hash"], "description": "Full access to everything."},
}

AVAILABLE_TOOLS = """
AVAILABLE TOOLS — choose exactly one:

EMPLOYEES:
  get_employee_stats    params: none
                        use for: total count, new hires this month, overview stats

  list_employees        params: search (str), department_id (int), designation_id (int), page (int), limit (int)
                        use for: list employees, search by name, filter by department

  get_employee          params: employee_id (int, REQUIRED — numeric DB id only, e.g. 22)
                        use for: ONLY when user gives a numeric integer id
                        NEVER use for name queries or EMP-xxx codes — use list_employees instead

  create_employee       REQUIRED params: first_name, last_name, email, password
                        OPTIONAL params: username, phone, employee_id, department_id (int),
                                         designation_id (int), joining_date (YYYY-MM-DD),
                                         bank_name, account_number, ifsc_code, branch_name
                        use for: adding a new employee
                        RULE: if first_name, last_name, email OR password are not explicitly
                              in the user message → output MISSING_INFO json (see rule 8 below)
                        NEVER invent values — no "unknown", "employ", "test", empty strings

LEAVES:
  list_leaves           params: none
  create_leave_request  params: employee_id (int,REQ), leave_type (str,REQ), start_date (REQ), end_date (REQ), reason (optional)
  update_leave_status   params: leave_id (int,REQ), status ("approved"|"rejected",REQ), remarks (optional)
  delete_leave          params: leave_id (int,REQ)

ASSETS:
  list_assets           params: none
  create_asset          params: asset_name (str,REQ), asset_type (str,REQ), employee_id (int optional)

DOCUMENTS:
  list_documents        params: none

USER PROFILE:
  get_my_profile        params: none — use for "my profile", "my details"
"""

PLANNER_SYSTEM = f"""You are an API Planner for an HRMS system.
Convert the user question into ONE JSON tool call. Never write SQL.

{AVAILABLE_TOOLS}

OUTPUT FORMAT — valid JSON only, no markdown, no comments:
{{
  "tool": "<tool_name>",
  "params": {{"<param>": <value>}},
  "reasoning": "<one sentence>"
}}

CRITICAL RULES:
1. Name/detail queries ("show Sneha Patel", "all details of X", "show EMP-MMUWI300"):
   ALWAYS use list_employees with search="<name or code>".
   The executor auto-upgrades to get_employee after resolving the numeric ID.
   NEVER use get_employee directly.
2. List all employees (no specific person): list_employees with empty params {{}}.
3. Never use get_employee — executor handles the two-step resolve.
4. Stats/counts/overview: get_employee_stats.
5. My profile: get_my_profile.
6. Never pass empty strings — omit unknown params.
7. Dates: YYYY-MM-DD only.
8. No comments inside JSON (no // ...).
9. department_id and designation_id MUST be integers. If the user gives a department NAME
   (e.g. "Engineering", "SIONXX") instead of a number, OMIT department_id from params entirely.
   Never pass a string like "SIONXX" as department_id.
10. joining_date MUST be YYYY-MM-DD format. If the user gives "2026-02-2025" or any invalid
    date, OMIT joining_date from params. Do not guess or fix the date.
"""


def _get_groq_key():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
    return os.getenv("GROQ_API_KEY", "")

def _get_model():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
    return os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

def _call_groq(messages, max_tokens=400):
    key    = _get_groq_key()
    model  = _get_model()
    delays = [5, 15, 30]
    for attempt, delay in enumerate(delays, 1):
        resp = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": 0},
            timeout=45,
        )
        if resp.status_code == 429:
            print(f"[Planner] Rate limited — waiting {delay}s...", flush=True)
            time.sleep(delay)
            continue
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    raise RuntimeError("Groq rate limit exceeded.")


# ── Required params & placeholder detection ───────────────────────────────────

_REQUIRED_PARAMS = {
    "create_employee":      ["first_name", "last_name", "email", "password"],
    "create_leave_request": ["employee_id", "leave_type", "start_date", "end_date"],
    "update_leave_status":  ["leave_id", "status"],
    "create_asset":         ["asset_name", "asset_type"],
    "create_document":      ["employee_id", "document_type", "document_name"],
    "update_employee":      ["employee_id"],
    "deactivate_employee":  ["employee_id"],
    "delete_leave":         ["leave_id"],
}

_PARAM_LABELS = {
    "first_name": "First name", "last_name": "Last name",
    "email": "Email address", "password": "Password",
    "username": "Username (optional — auto-generated if not provided)",
    "phone": "Phone number (optional)",
    "employee_id": "Employee ID (optional — auto-generated if not provided)",
    "department_id": "Department (optional)", "designation_id": "Designation (optional)",
    "joining_date": "Joining date (YYYY-MM-DD, optional)",
    "bank_name": "Bank name (optional)", "account_number": "Account number (optional)",
    "ifsc_code": "IFSC / Routing code (optional)", "branch_name": "Branch name (optional)",
    "leave_type": "Leave type (sick / casual / earned / maternity)",
    "start_date": "Start date (YYYY-MM-DD)", "end_date": "End date (YYYY-MM-DD)",
    "reason": "Reason (optional)", "status": "Status — approved or rejected",
    "leave_id": "Leave request ID", "asset_name": "Asset name",
    "asset_type": "Asset type (e.g. laptop, phone, vehicle)",
    "document_type": "Document type", "document_name": "Document name",
}

# Any value the LLM uses to mean "I don't know" → treat as missing
_PLACEHOLDER_VALUES = {
    "", "unknown", "none", "null", "n/a", "na", "not provided", "not known",
    "placeholder", "example", "test", "missing", "tbd", "xxx", "sample",
    "employ", "employee", "john", "doe", "user@example.com", "new employee name",
}

def _check_missing_params(tool: str, params: dict) -> list[str]:
    missing = []
    for p in _REQUIRED_PARAMS.get(tool, []):
        val = params.get(p)
        if val is None or (isinstance(val, str) and val.strip().lower() in _PLACEHOLDER_VALUES):
            missing.append(p)
    return missing


# ── Missing info response builder ─────────────────────────────────────────────

def _build_missing_response(tool: str, missing: list[str]) -> dict:
    tool_labels = {
        "create_employee": "add a new employee",
        "MISSING_INFO":    "add a new employee",
        "create_leave_request": "submit a leave request",
        "update_leave_status":  "update a leave status",
        "create_asset":         "register an asset",
        "create_document":      "add a document",
        "update_employee":      "update an employee",
        "deactivate_employee":  "deactivate an employee",
        "delete_leave":         "delete a leave request",
    }
    action = tool_labels.get(tool, tool.replace("_", " "))

    # For create_employee always show the full form
    if tool in ("create_employee", "MISSING_INFO"):
        ask_msg = (
            "To **add a new employee**, please provide the following details:\n\n"
            "**Required:**\n"
            "• **First name**\n"
            "• **Last name**\n"
            "• **Email address**\n"
            "• **Password**\n\n"
            "**Optional:**\n"
            "• Username (auto-generated if not provided)\n"
            "• Phone number\n"
            "• Department\n"
            "• Designation\n"
            "• Joining date (YYYY-MM-DD)\n"
            "• Bank name, Account number, IFSC code, Branch name\n\n"
            "_Example: Add employee John Doe, john@company.com, password Pass@123, department Engineering_"
        )
    else:
        labels  = [_PARAM_LABELS.get(f, f.replace("_", " ").title()) for f in missing]
        ask_msg = (
            f"To **{action}**, please provide:\n"
            + "\n".join(f"• **{l}**" for l in labels)
        )

    print(f"[Planner] MISSING_INFO for {tool} — need: {missing}", flush=True)
    return {
        "api_plan":     None,
        "api_error":    None,
        "access_denied":False,
        "missing_info": True,
        "retry_count":  MAX_RETRIES,   # stop retry loop
        "sql_result":   None,
        "sql_error":    None,
        "final_answer": ask_msg,
        "tool_used":    False,
    }


# ── Access check ──────────────────────────────────────────────────────────────

def _is_access_denied(user_role: str, question: str):
    if user_role in ("hr", "admin"): return None
    q = question.lower()
    if any(w in q for w in ["salary","payroll","net pay","ctc","basic pay","payslip"]):
        return "salary and payroll information"
    if any(w in q for w in ["bank detail","account number","ifsc","bank account"]):
        return "bank account details"
    if any(w in q for w in ["phone number","mobile number","contact number","phone no"]):
        return "personal contact details of other employees"
    return None


def _parse_plan(raw: str):
    cleaned = re.sub(r"```(?:json)?|```", "", raw, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"//[^\n]*", "", cleaned)
    try:
        data = json.loads(cleaned)
        if "tool" in data and "params" in data:
            return data
    except json.JSONDecodeError:
        pass
    return None


# ── Main planner node ─────────────────────────────────────────────────────────

@traceable(name="erp_planner_node")
def erp_planner_node(state: OfficeGPTState) -> dict:
    question    = state["user_question"]
    user_role   = state.get("user_role", "employee")
    retry_count = state.get("retry_count", 0)
    api_error   = state.get("api_error")
    access      = ROLE_ACCESS.get(user_role, ROLE_ACCESS["employee"])

    print(f"[Planner] Attempt {retry_count+1}/{MAX_RETRIES} | role={user_role} | Q='{question}'", flush=True)

    denied = _is_access_denied(user_role, question)
    if denied:
        print(f"[Planner] ACCESS DENIED: {denied}", flush=True)
        return {"api_plan": None, "api_error": None, "access_denied": True, "denied_resource": denied}

    role_context = (
        f"User role: {user_role.upper()}\n"
        f"Access level: {access['description']}\n"
        f"Never return: {', '.join(access['blocked_fields'])}\n"
    )
    user_content = f"{role_context}\nQuestion: {question}"

    if retry_count > 0 and api_error:
        user_content += (
            f"\n\nPrevious plan failed: {state.get('api_plan')}\n"
            f"Error: {api_error}\n\nFix it. Output ONLY JSON."
        )

    messages = [
        {"role": "system", "content": PLANNER_SYSTEM},
        {"role": "user",   "content": user_content},
    ]

    try:
        raw = _call_groq(messages)
        print(f"[Planner] Raw LLM output: {raw}", flush=True)

        if raw.strip().upper().startswith("ACCESS_DENIED"):
            reason = raw.split(":", 1)[-1].strip() if ":" in raw else "restricted information"
            return {"api_plan": None, "api_error": None, "access_denied": True, "denied_resource": reason}

        plan = _parse_plan(raw)
        if not plan:
            raise ValueError(f"Unparseable LLM output: {raw[:200]}")

        print(f"[Planner] Tool selected: {plan['tool']}  params: {plan['params']}", flush=True)

        # Path 1: LLM returned MISSING_INFO tool
        if plan["tool"] == "MISSING_INFO":
            return _build_missing_response("MISSING_INFO", plan.get("missing", []))

        # Path 2: LLM included "missing" array alongside another tool
        if plan.get("missing"):
            return _build_missing_response(plan["tool"], plan["missing"])

        # Path 3: safety net — detect placeholder values in required params
        missing = _check_missing_params(plan["tool"], plan.get("params") or {})
        if missing:
            return _build_missing_response(plan["tool"], missing)

        return {
            "api_plan":        plan,
            "api_error":       None,
            "access_denied":   False,
            "denied_resource": None,
            "missing_info":    False,
        }

    except Exception as e:
        print(f"[Planner] Error: {e}", flush=True)
        return {"api_plan": None, "api_error": str(e), "access_denied": False}


def route_after_planner(state: OfficeGPTState) -> str:
    if state.get("access_denied"): return "formatter"
    if state.get("missing_info"):  return "formatter"
    if not state.get("api_plan"):  return "formatter"
    return "api_executor"