"""
agents/api_executor.py — Layer 3: API Executor Agent
REPLACES: sql_executor.py

KEY FIX: Removed duplicate function body that was causing logic errors.
         missing_info guard is now the very first check in the node.
"""

from __future__ import annotations
from agents.state import OfficeGPTState
from datetime import date, datetime
import decimal
import re
import requests as http_requests
import os

MAX_RETRIES = 3
BASE_URL        = os.getenv("ERP_API_BASE_URL", "http://localhost:5000/api")
REQUEST_TIMEOUT = int(os.getenv("ERP_API_TIMEOUT", "15"))


class _APIError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message     = message

class _AuthError(_APIError):       pass
class _NotFoundError(_APIError):   pass
class _ValidationError(_APIError): pass


def _api_request(method: str, path: str, token: str, *, params=None, json=None) -> dict:
    url     = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    cookies = {"smarthr_token": token}

    token_preview = f"{token[:20]}..." if token and len(token) > 20 else (token or "EMPTY")
    print(f"[API Executor] -> {method} {url}", flush=True)
    print(f"[API Executor] -> Cookie smarthr_token: {token_preview}", flush=True)
    if params: print(f"[API Executor] -> Params: {params}", flush=True)
    if json:   print(f"[API Executor] -> Body keys: {list(json.keys())}", flush=True)

    try:
        resp = http_requests.request(
            method=method.upper(), url=url,
            headers=headers, cookies=cookies,
            params=params or None, json=json or None,
            timeout=REQUEST_TIMEOUT,
        )
    except http_requests.exceptions.ConnectionError as exc:
        raise _APIError(0, f"Cannot reach ERP backend at {BASE_URL}: {exc}") from exc
    except http_requests.exceptions.Timeout:
        raise _APIError(0, f"Request timed out after {REQUEST_TIMEOUT}s")

    print(f"[API Executor] <- HTTP {resp.status_code}", flush=True)

    try:
        body = resp.json()
    except ValueError:
        body = {"message": resp.text or "empty response"}

    if resp.status_code in (401, 403): raise _AuthError(resp.status_code, body.get("message", "Unauthorized"))
    if resp.status_code == 404:        raise _NotFoundError(404, body.get("message", "Resource not found"))
    if resp.status_code in (400, 409, 422): raise _ValidationError(resp.status_code, body.get("message", "Validation error"))
    if not resp.ok: raise _APIError(resp.status_code, body.get("message", "Unexpected API error"))
    return body


_TOOL_MAP = {
    "get_employee_stats":   ("GET",    "/employees/stats/overview"),
    "list_employees":       ("GET",    "/employees"),
    "get_employee":         ("GET",    "/employees/{employee_id}"),
    "create_employee":      ("POST",   "/employees"),
    "update_employee":      ("PUT",    "/employees/{employee_id}"),
    "deactivate_employee":  ("DELETE", "/employees/{employee_id}"),
    "list_leaves":          ("GET",    "/leaves"),
    "create_leave_request": ("POST",   "/leaves"),
    "update_leave_status":  ("PUT",    "/leaves/{leave_id}/status"),
    "delete_leave":         ("DELETE", "/leaves/{leave_id}"),
    "list_assets":          ("GET",    "/assets"),
    "create_asset":         ("POST",   "/assets"),
    "update_asset":         ("PUT",    "/assets/{asset_id}"),
    "delete_asset":         ("DELETE", "/assets/{asset_id}"),
    "list_documents":       ("GET",    "/documents"),
    "create_document":      ("POST",   "/documents"),
    "update_document":      ("PUT",    "/documents/{document_id}"),
    "delete_document":      ("DELETE", "/documents/{document_id}"),
    "get_my_profile":       ("GET",    "/user/profile"),
    "update_my_profile":    ("PUT",    "/user/profile"),
}
_PATH_PARAMS = {"employee_id", "leave_id", "asset_id", "document_id"}


def _dispatch(tool_name: str, params: dict, token: str) -> dict:
    if tool_name not in _TOOL_MAP:
        raise _APIError(0, f"Unknown tool: '{tool_name}'")
    method, path_template = _TOOL_MAP[tool_name]
    path  = path_template
    clean = {k: v for k, v in params.items() if v is not None and v != ""}
    # params already coerced by api_executor_node — just strip None/empty here
    remaining = {}
    for key, val in clean.items():
        if key in _PATH_PARAMS: path = path.replace(f"{{{key}}}", str(val))
        else:                   remaining[key] = val
    unresolved = re.findall(r'\{(\w+)\}', path)
    if unresolved:
        raise _APIError(0, f"Missing path param(s): {unresolved} for '{tool_name}'")
    if method in ("GET", "DELETE"):
        return _api_request(method, path, token, params=remaining or None)
    else:
        return _api_request(method, path, token, json=_to_camel(remaining) or None)


# Fields that must be integers — coerce or drop if invalid
_INT_FIELDS = {"department_id", "designation_id", "employee_id", "leave_id", "asset_id", "document_id"}
# Fields that should NOT be coerced — passed through as strings
_STRING_FIELDS = {"employee_name", "search", "first_name", "last_name", "email", "username",
                  "phone", "leave_type", "status", "reason", "remarks", "asset_name",
                  "asset_type", "document_type", "document_name", "bank_name",
                  "account_number", "ifsc_code", "branch_name"}

def _coerce_params(params: dict) -> dict:
    import re as _re
    cleaned = {}
    for k, v in params.items():
        if v is None or v == "":
            continue
        if k in _INT_FIELDS:
            try:
                val_int = int(v)
                if val_int <= 0:
                    # 0 or negative is not a valid DB id — drop it
                    print(f"[API Executor] Dropping {k}={v!r} — not a valid id (must be > 0)", flush=True)
                else:
                    cleaned[k] = val_int
            except (ValueError, TypeError):
                print(f"[API Executor] Dropping {k}={v!r} — not a valid integer", flush=True)
            continue
        if k == "joining_date" and isinstance(v, str):
            if _re.fullmatch(r"\d{4}-\d{2}-\d{2}", v.strip()):
                cleaned[k] = v.strip()
            else:
                print(f"[API Executor] Dropping joining_date={v!r} — not YYYY-MM-DD", flush=True)
            continue
        if isinstance(v, str):
            cleaned[k] = v.strip()
        else:
            cleaned[k] = v
    return cleaned


def _to_camel(d: dict) -> dict:
    def camel(s):
        parts = s.split("_")
        return parts[0] + "".join(p.capitalize() for p in parts[1:])
    return {camel(k): v for k, v in d.items() if v is not None and v != ""}


def _serialize(val):
    if isinstance(val, (date, datetime)): return val.isoformat()
    if isinstance(val, decimal.Decimal):  return float(val)
    return val

def _normalize_rows(rows):
    return [{k: _serialize(v) for k, v in row.items()} for row in rows]

def _format_as_table(rows):
    if not rows: return "_No records found._"
    headers = list(rows[0].keys())
    pretty  = [h.replace("_", " ").title() for h in headers]
    lines   = ["| " + " | ".join(pretty) + " |",
               "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        cells = []
        for h in headers:
            val = row.get(h)
            if val is None:             cells.append("-")
            elif isinstance(val, bool): cells.append("Yes" if val else "No")
            else:                       cells.append(str(val))
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)

def _format_single_employee(row):
    lines = []
    label_map = {
        "first_name": None, "last_name": None,
        "employee_id": "Employee ID", "department": "Department",
        "designation": "Designation", "joining_date": "Joining Date",
        "email": "Email", "phone": "Phone", "is_active": "Status",
        "net_salary": "Net Salary", "salary_month": "Salary Month",
        "status": "Status", "days": "Days", "reason": "Reason",
    }
    first = row.get("first_name", "")
    last  = row.get("last_name", "")
    if first or last:
        lines.append(f"**{(first + ' ' + last).strip()}**")
    for key, label in label_map.items():
        if label is None: continue
        val = row.get(key)
        if val is None: continue
        if key == "is_active":  val = "Active" if val else "Inactive"
        if key == "net_salary": val = f"Rs. {float(val):,.2f}"
        lines.append(f"**{label}:** {val}")
    known = set(label_map.keys()) | {"first_name", "last_name"}
    for key, val in row.items():
        if key not in known and val is not None:
            lines.append(f"**{key.replace('_',' ').title()}:** {val}")
    return "\n".join(lines)

def _format_results(rows, question):
    if len(rows) == 0: return "No records found matching your query."
    if len(rows) == 1: return _format_single_employee(rows[0])
    return f"Found **{len(rows)} record(s)**:\n\n{_format_as_table(rows)}"

def _extract_rows(api_response):
    data = api_response.get("data")
    if data is None:           return []
    if isinstance(data, dict): return [data]
    if isinstance(data, list): return data
    return []


# ── CHANGED: now uses db_resolver instead of API search ──────────────────────
def _resolve_employee_id(search_value: str, company_id: int) -> int | None:
    """
    Resolve name / email / EMP-xxx code → numeric database id.
    Uses db_resolver.py which runs a direct SQL query with full-name ILIKE support.

    WHY NOT THE API: GET /employees?search=X matches firstName OR lastName separately,
    so "Sneha Patel" (full name) returns 0 results. The SQL query concatenates both.
    """
    try:
        from db_resolver import resolve_employee
        return resolve_employee(search_value, company_id)
    except Exception as exc:
        print(f"[API Executor] DB resolve failed: {exc}", flush=True)
        return None


# ── Main executor node ────────────────────────────────────────────────────────

def api_executor_node(state: OfficeGPTState) -> dict:
    # ── FIRST: if planner already handled it, do nothing ─────────────────
    if state.get("missing_info") or state.get("access_denied"):
        print("[API Executor] Skipping — planner already set final_answer", flush=True)
        return {}

    api_plan    = state.get("api_plan")
    token       = state.get("token", "")
    question    = state.get("user_question", "")
    retry_count = state.get("retry_count", 0)
    company_id  = state.get("company_id", 1)   # ← needed for db_resolver

    print(f"[API Executor] Attempt {retry_count + 1} | tool={api_plan.get('tool') if api_plan else None}", flush=True)

    if not api_plan:
        return {"api_error": "No API plan.", "sql_error": "No API plan.", "retry_count": retry_count + 1}

    if not token:
        print("[API Executor] No token in state", flush=True)
        return {"api_error": "Authentication token missing.", "sql_error": "Authentication token missing.",
                "retry_count": MAX_RETRIES, "tool_used": False}

    tool_name  = api_plan.get("tool")
    raw_params = {k: v for k, v in (api_plan.get("params") or {}).items() if v is not None and v != ""}
    params     = _coerce_params(raw_params)
    print(f"[API Executor] Coerced params: {params}", flush=True)

    # ── Two-step resolve: name/email/code → numeric id ────────────────────
    original_search = raw_params.get("employee_id") or raw_params.get("search", "")
    q_lower = question.lower()
    detail_keywords = ["all detail", "full detail", "show detail", "profile of",
                       "info of", "information of", "details of", "about"]
    needs_full_detail = any(k in q_lower for k in detail_keywords)

    if tool_name == "get_employee" and not params.get("employee_id") and original_search:
        # employee_id was a string (EMP-xxx or name) — use db_resolver to get numeric id
        print(f"[API Executor] Two-step A: resolving '{original_search}' via db_resolver", flush=True)
        numeric_id = _resolve_employee_id(str(original_search), company_id)
        if numeric_id:
            params["employee_id"] = numeric_id
        else:
            return {
                "api_error":    f"Could not find employee matching '{original_search}'.",
                "sql_error":    f"Could not find employee matching '{original_search}'.",
                "sql_result":   [],
                "final_answer": f"No employee found matching **{original_search}**. Please check the name or ID.",
                "retry_count":  MAX_RETRIES,
                "tool_used":    False,
            }

    elif tool_name == "list_employees" and needs_full_detail and params.get("search"):
        # Full detail request — resolve name to id via db_resolver, then call get_employee
        search_val = params["search"]
        print(f"[API Executor] Two-step B: full detail for '{search_val}' via db_resolver", flush=True)
        numeric_id = _resolve_employee_id(search_val, company_id)
        if numeric_id:
            tool_name = "get_employee"
            params    = {"employee_id": numeric_id}
            print(f"[API Executor] Upgraded to get_employee id={numeric_id}", flush=True)
        # If resolve fails, fall through to list_employees normally

    # ── Resolve employee name → employee_id for write operations ────────
    # Handles three cases:
    #   A) planner passed employee_name="Sneha Patel" (ideal)
    #   B) planner passed employee_id=0 (dropped by coerce) — extract name from question
    #   C) tool needs employee_id but it's missing — extract from question
    write_tools_needing_emp = {"create_leave_request", "create_asset", "create_document",
                                "update_employee", "deactivate_employee"}

    if tool_name in write_tools_needing_emp and not params.get("employee_id"):
        # Get name from employee_name param OR extract from question
        emp_name = params.pop("employee_name", None)

        if not emp_name:
            # Try to extract a name from the question using simple heuristics
            # Look for "for [Name]", "of [Name]", "employee [Name]"
            import re as _re
            name_patterns = [
                r"for employee ([A-Za-z]+(?:\s+[A-Za-z]+)+)",
                r"for ([A-Za-z]+(?:\s+[A-Za-z]+)+)",
                r"employee ([A-Za-z]+(?:\s+[A-Za-z]+)+)",
                r"of ([A-Za-z]+(?:\s+[A-Za-z]+)+)",
            ]
            for pattern in name_patterns:
                match = _re.search(pattern, question)
                if match:
                    emp_name = match.group(1).strip()
                    print(f"[API Executor] Extracted name from question: '{emp_name}'", flush=True)
                    break

        if emp_name:
            print(f"[API Executor] Resolving '{emp_name}' → employee_id via db_resolver", flush=True)
            numeric_id = _resolve_employee_id(emp_name, company_id)
            if numeric_id:
                params["employee_id"] = numeric_id
                print(f"[API Executor] Resolved '{emp_name}' → employee_id={numeric_id}", flush=True)
            else:
                return {
                    "api_error":    f"Could not find employee '{emp_name}'.",
                    "sql_error":    f"Could not find employee '{emp_name}'.",
                    "sql_result":   [],
                    "final_answer": f"No employee found matching **{emp_name}**. Please check the spelling.",
                    "retry_count":  MAX_RETRIES,
                    "tool_used":    False,
                }
        else:
            print(f"[API Executor] Could not extract employee name from question", flush=True)
    elif params.get("employee_name"):
        params.pop("employee_name")

    try:
        api_response = _dispatch(tool_name, params, token)
        rows         = _normalize_rows(_extract_rows(api_response))
        print(f"[API Executor] tool={tool_name} rows={len(rows)}", flush=True)
        if rows: print(f"[API Executor] Sample: {rows[0]}", flush=True)

        # For create_leave_request — build confirmation
        if tool_name == "create_leave_request" and rows:
            row       = rows[0]
            emp_name  = f"{row.get('first_name','')} {row.get('last_name','')}".strip()
            leave_type= row.get("leave_type", row.get("leaveType", ""))
            start     = row.get("starting_at", row.get("start_date", ""))
            end       = row.get("ending_on", row.get("end_date", ""))
            days      = row.get("days", "")
            status    = row.get("status", "pending")
            parts = ["Leave request submitted successfully!"]
            if emp_name:   parts.append(f"**Employee:** {emp_name}")
            if leave_type: parts.append(f"**Leave Type:** {leave_type}")
            if start:      parts.append(f"**From:** {start}")
            if end:        parts.append(f"**To:** {end}")
            if days:       parts.append(f"**Days:** {days}")
            parts.append(f"**Status:** {status}")
            formatted = "\n".join(parts)

        # For create_employee — build confirmation with loginUsername
        elif tool_name == "create_employee" and rows:
            row        = rows[0]
            first      = row.get("first_name", "")
            last       = row.get("last_name", "")
            name       = f"{first} {last}".strip()
            emp_id     = row.get("employee_id", "")
            email      = row.get("email", "")
            uid        = row.get("user_id", "")
            login_user = api_response.get("loginUsername", "")
            lines = [f"Employee **{name}** has been added successfully!\n"]
            if emp_id:     lines.append(f"**Employee ID:** {emp_id}")
            if email:      lines.append(f"**Email:** {email}")
            if login_user: lines.append(f"**Login Username:** `{login_user}`")
            if uid:        lines.append(f"**User ID:** {uid}")
            lines.append("\nThey can now log in using their **username** and password.")
            formatted = "\n".join(lines)
        else:
            formatted = _format_results(rows, question)

        return {
            "api_result": api_response, "api_error": None,
            "sql_result": rows,         "sql_error": None,
            "final_answer": formatted,
            "tool_used": True,
        }

    except _AuthError as exc:
        msg = f"Access denied: {exc.message}"
        print(f"[API Executor] AuthError: {msg}", flush=True)
        return {"api_error": msg, "sql_error": msg, "retry_count": MAX_RETRIES, "tool_used": False}

    except _NotFoundError as exc:
        msg = f"Not found: {exc.message}"
        print(f"[API Executor] NotFoundError: {msg}", flush=True)
        return {"api_error": msg, "sql_error": msg, "sql_result": [],
                "final_answer": f"No record found: {exc.message}",
                "retry_count": MAX_RETRIES, "tool_used": False}

    except _ValidationError as exc:
        msg = f"Validation error ({exc.status_code}): {exc.message}"
        print(f"[API Executor] ValidationError: {msg}", flush=True)
        return {"api_error": msg, "sql_error": msg, "retry_count": retry_count + 1, "tool_used": False}

    except _APIError as exc:
        msg = f"API error {exc.status_code}: {exc.message}"
        print(f"[API Executor] APIError: {msg}", flush=True)
        return {"api_error": msg, "sql_error": msg, "retry_count": retry_count + 1, "tool_used": False}

    except Exception as exc:
        msg = str(exc)
        print(f"[API Executor] Unexpected: {msg}", flush=True)
        return {"api_error": msg, "sql_error": msg, "retry_count": retry_count + 1, "tool_used": False}


# ── Routing ───────────────────────────────────────────────────────────────────

def route_after_planner(state: OfficeGPTState) -> str:
    if state.get("access_denied"): return "formatter"
    if state.get("missing_info"):  return "formatter"
    if not state.get("api_plan"):  return "formatter"
    return "api_executor"


def route_after_executor(state: OfficeGPTState) -> str:
    if state.get("missing_info") or state.get("access_denied"):
        return "formatter"
    api_error   = state.get("api_error")
    retry_count = state.get("retry_count", 0)
    if not api_error:
        return "rag_agent" if state.get("intent") == "hybrid" else "formatter"
    if retry_count < MAX_RETRIES:
        print(f"[API Executor] Retrying... ({retry_count}/{MAX_RETRIES})", flush=True)
        return "erp_planner"
    print("[API Executor] Max retries reached", flush=True)
    return "formatter"