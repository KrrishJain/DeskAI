import json
import requests
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

API_BASE = "http://localhost:5000/api"


# ============================================================
# INTENT DETECTION
# ============================================================

ERP_SIGNALS = [
    "employ", "staff", "worker", "team member",
    "colleague", "hire", "hired", "new hire", "headcount",
    "who is", "who are", "show me", "list", "fetch",
    "find", "search", "tell me about", "what is", "what are",
    "give me", "display",
    "designation", "department", "dept", "joining date", "joined",
    "email", "phone", "contact", "manager", "position",
    "this month", "last month", "recently", "new joiner",
]

# Prefix matching — "employ" catches "employee", "employees", "employ"
ERP_PREFIXES = ["employ"]

POLICY_OVERRIDE_SIGNALS = [
    "policy", "rule", "regulation", "procedure", "guideline", "handbook",
    "maternity", "paternity", "leave policy", "pip", "termination policy",
    "probation policy", "work from home policy", "remote policy",
]

def is_erp_query(question: str) -> bool:
    q = question.lower()
    if any(p in q for p in POLICY_OVERRIDE_SIGNALS):
        return False
    if any(s in q for s in ERP_SIGNALS):
        return True
    # Word-level prefix match handles truncated words like "employ"
    for word in q.split():
        for prefix in ERP_PREFIXES:
            if word.startswith(prefix):
                return True
    return False

def extract_user_question(prompt: str) -> str:
    prompt_lower = prompt.lower()
    if "question:" in prompt_lower:
        idx = prompt_lower.rfind("question:")
        after = prompt[idx + len("question:"):].strip()
        if "\nanswer:" in after.lower():
            after = after[:after.lower().index("\nanswer:")].strip()
        return after.strip()
    lines = [l.strip() for l in prompt.strip().split("\n") if l.strip()]
    return lines[-1] if lines else prompt


# ============================================================
# ERP API CALLER — forwards user's auth token
# ============================================================

class ERPClient:
    """
    All ERP API calls go through this class.
    The auth_token is the user's JWT from the React frontend,
    forwarded so ERP APIs stay protected.
    """
    def __init__(self, auth_token: str = None):
        self.auth_token = auth_token
        self.headers = {"Content-Type": "application/json"}
        if auth_token:
            self.headers["Authorization"] = f"Bearer {auth_token}"

    def get(self, path: str):
        res = requests.get(f"{API_BASE}{path}", headers=self.headers, timeout=10)
        if res.status_code == 401:
            raise RuntimeError("Unauthorized: Invalid or expired token.")
        if res.status_code == 403:
            raise RuntimeError("Forbidden: You don't have permission to access this resource.")
        res.raise_for_status()
        return res.json()

    def list_employees(self, department=None, designation=None, joined_this_month=False, name=None):
        raw = self.get("/employees")

        print("=== ERP RAW RESPONSE ===", flush=True)
        print(json.dumps(raw, default=str)[:1000], flush=True)

        if isinstance(raw, list):
            employees = raw
        elif isinstance(raw, dict):
            employees = None
            for key in ["data", "employees", "results", "items"]:
                val = raw.get(key)
                if isinstance(val, list):
                    employees = val
                    print(f"=== EXTRACTED {len(val)} employees from key '{key}' ===", flush=True)
                    break
            if employees is None:
                print("=== NO LIST FOUND IN DICT KEYS ===", flush=True)
                employees = []
        else:
            employees = []

        print(f"=== AFTER EXTRACT: {len(employees)} records ===", flush=True)
        if employees:
            print("=== FIRST RECORD ===", json.dumps(employees[0], default=str), flush=True)

        # Normalize
        normalized = []
        for e in employees:
            first = e.get("first_name") or ""
            last  = e.get("last_name") or ""
            normalized.append({
                "name":         f"{first} {last}".strip(),
                "first_name":   first.lower(),
                "last_name":    last.lower(),
                "employee_id":  e.get("employee_id") or str(e.get("id", "")),
                "department":   e.get("department") or "",
                "designation":  e.get("designation") or "",
                "joining_date": e.get("joining_date") or "",
                "email":        e.get("email") or "",
                "phone":        e.get("phone") or "",
                "is_active":    e.get("is_active", True),
            })

        # Filters
        if name:
            name_lower = name.lower()
            normalized = [
                e for e in normalized
                if name_lower in e["first_name"]
                or name_lower in e["last_name"]
                or name_lower in e["name"].lower()
            ]
        if department:
            normalized = [e for e in normalized if department.lower() in e["department"].lower()]
        if designation:
            normalized = [e for e in normalized if designation.lower() in e["designation"].lower()]
        if joined_this_month:
            from datetime import datetime
            now = datetime.now()
            prefix = f"{now.year}-{now.month:02d}"
            normalized = [e for e in normalized if str(e["joining_date"]).startswith(prefix)]

        return normalized

    def get_departments(self):
        raw = self.get("/departments")
        if isinstance(raw, dict):
            for key in ["data", "departments", "results"]:
                val = raw.get(key)
                if isinstance(val, list):
                    return val
        return raw if isinstance(raw, list) else []


# ============================================================
# TOOL SCHEMAS
# ============================================================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_employees",
            "description": (
                "Search and retrieve employee data from the ERP system. "
                "Use for ANY question about employees — listing all, finding by name, "
                "filtering by department/designation, checking who joined, getting contact info, etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Search by employee name (partial match). E.g. 'harsh', 'harsh gada'"
                    },
                    "department": {
                        "type": "string",
                        "description": "Filter by department. E.g. 'Marketing', 'IT Department', 'Human Resources'"
                    },
                    "designation": {
                        "type": "string",
                        "description": "Filter by job title. E.g. 'Manager', 'IT Manager', 'HR Manager'"
                    },
                    "joined_this_month": {
                        "type": "boolean",
                        "description": "If true, return only employees who joined this calendar month"
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_departments",
            "description": "Get a list of all departments in the company.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """You are OfficeGPT, a smart AI assistant built into an HRMS/ERP system.

You have two knowledge sources:
1. POLICY DOCUMENTS — context in the prompt (for HR rules, leave policies, procedures)
2. ERP TOOLS — live database access via tools (for employee data, departments, org info)

## TOOL CALLING RULES:

Use `list_employees` when the user asks ANYTHING about:
- Specific employees by name → set `name` parameter (e.g. name="harsh gada")
- Employees in a department → set `department` parameter
- Employees with a designation → set `designation` parameter
- New joiners / who joined this month → set `joined_this_month=true`
- All employees → call with no parameters
- Contact info, email, phone of a person → use `name` parameter
- Designation, department, joining date of a person → use `name` parameter

Use `get_departments` when asked about the list of departments.

Use POLICY CONTEXT (no tool) when asked about policies, rules, leave policy, benefits, procedures.

## RESPONSE FORMAT:

For a single employee result — use a clean bullet list:
**Name**
- Department: ...
- Designation: ...
- Email: ...

For multiple employees — use a markdown table.

Never say "I don't have access to ERP". You do. Use the tools.
Never return policy-not-found for employee questions."""


# ============================================================
# LLM CLASS
# ============================================================



class LLM:
    def __init__(self):
        self.api_key = GROQ_API_KEY
        print(self.api_key)
        self.model = "llama-3.1-8b-instant"
        self.url = "https://api.groq.com/openai/v1/chat/completions"
        self.timeout_seconds = 90

    def _call_groq(self, messages, tools=None, tool_choice="auto", max_tokens=1024):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0,
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice
        res = requests.post(self.url, headers=headers, json=payload, timeout=self.timeout_seconds)
        if res.status_code >= 400:
            raise RuntimeError(f"Groq API error ({res.status_code}): {res.text}")
        return res.json()

    def _format_employees(self, employees: list) -> str:
        if not employees:
            return "No employees found matching your query."
        if len(employees) == 1:
            e = employees[0]
            return (
                f"**{e.get('name', '-')}**\n\n"
                f"- **Employee ID:** {e.get('employee_id', '-')}\n"
                f"- **Department:** {e.get('department', '-')}\n"
                f"- **Designation:** {e.get('designation', '-')}\n"
                f"- **Joining Date:** {e.get('joining_date', '-')}\n"
                f"- **Email:** {e.get('email', '-')}\n"
                f"- **Phone:** {e.get('phone', '-')}\n"
            )
        lines = [
            "| Name | Employee ID | Department | Designation | Joining Date |",
            "| --- | --- | --- | --- | --- |",
        ]
        for e in employees:
            lines.append(
                f"| {e.get('name', '-')} "
                f"| {e.get('employee_id', '-')} "
                f"| {e.get('department', '-')} "
                f"| {e.get('designation', '-')} "
                f"| {e.get('joining_date', '-')} |"
            )
        return "\n".join(lines)

    def _process_erp_context(self, erp_context, user_question: str) -> Optional[str]:
        """
        Process pre-fetched ERP data from the browser.
        Browser fetched this using HttpOnly cookie — no auth needed here.
        """
        if not erp_context:
            return None

        q = user_question.lower()

        # Extract employee list from whatever shape the API returned
        if isinstance(erp_context, list):
            employees_raw = erp_context
        elif isinstance(erp_context, dict):
            employees_raw = None
            for key in ["data", "employees", "results", "items"]:
                val = erp_context.get(key)
                if isinstance(val, list):
                    employees_raw = val
                    break
            if employees_raw is None:
                return None
        else:
            return None

        # Normalize
        employees = []
        for e in employees_raw:
            first = e.get("first_name") or ""
            last  = e.get("last_name") or ""
            employees.append({
                "name":         f"{first} {last}".strip(),
                "first_name":   first.lower(),
                "last_name":    last.lower(),
                "employee_id":  e.get("employee_id") or str(e.get("id", "")),
                "department":   e.get("department") or "",
                "designation":  e.get("designation") or "",
                "joining_date": e.get("joining_date") or "",
                "email":        e.get("email") or "",
                "phone":        e.get("phone") or "",
            })

        print(f"=== ERP CONTEXT: {len(employees)} employees received from browser ===", flush=True)

        # Apply filters based on user question
        # Name filter
        name_filter = None
        words = q.split()
        all_names = [e["name"].lower() for e in employees]
        for i in range(len(words)):
            for j in range(i+1, min(i+4, len(words)+1)):
                candidate = " ".join(words[i:j])
                if any(candidate in name for name in all_names):
                    name_filter = candidate
                    break

        if name_filter:
            employees = [e for e in employees if name_filter in e["name"].lower()]

        # Department filter
        dept_map = {
            "marketing": "Marketing",
            "it department": "IT Department",
            "it": "IT Department",
            "human resources": "Human Resources",
            "hr": "Human Resources",
            "finance": "Finance",
            "sales": "Sales",
            "engineering": "Engineering",
            "operations": "Operations",
        }
        for key, value in dept_map.items():
            if key in q and any(k in q for k in ["employee", "staff", "in", "from", "of"]):
                employees = [e for e in employees if value.lower() in e["department"].lower()]
                break

        # Joined this month filter
        if "this month" in q or "joined this month" in q:
            from datetime import datetime
            now = datetime.now()
            prefix = f"{now.year}-{now.month:02d}"
            employees = [e for e in employees if str(e["joining_date"]).startswith(prefix)]

        formatted = self._format_employees(employees)
        count = len(employees)
        if count == 1:
            return formatted
        return f"Found **{count} employee(s)**:\n\n{formatted}"

    def generate_answer(self, prompt: str, max_tokens: int = 1024, erp_context=None, **kwargs):
        user_question = extract_user_question(prompt)
        erp = is_erp_query(user_question)
        print(f"=== Q: '{user_question}' | ERP: {erp} | has_erp_context: {erp_context is not None} ===", flush=True)

        # ── If browser pre-fetched ERP data, process it directly — no LLM tool call needed ──
        if erp and erp_context is not None:
            answer = self._process_erp_context(erp_context, user_question)
            if answer:
                return {"answer": answer, "tool_used": True}

        # Use clean question for ERP, full RAG prompt for policy
        llm_prompt = user_question if erp else prompt

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": llm_prompt},
        ]

        response = self._call_groq(messages, tools=TOOLS, tool_choice="auto", max_tokens=max_tokens)
        msg = response["choices"][0]["message"]

        # No tool call → RAG answer
        if "tool_calls" not in msg:
            return {"answer": (msg.get("content") or "").strip(), "tool_used": False}

        # Execute tool calls using the authenticated ERP client
        messages.append(msg)
        tool_results = {}

        for tool_call in msg["tool_calls"]:
            name = tool_call["function"]["name"]
            try:
                raw_args = tool_call["function"].get("arguments") or "{}"
                arguments = json.loads(raw_args) if isinstance(raw_args, str) else {}
                if not isinstance(arguments, dict):
                    arguments = {}
            except (json.JSONDecodeError, TypeError, ValueError):
                arguments = {}

            print(f"=== TOOL: {name}({arguments}) ===", flush=True)

            try:
                # Route tool calls through authenticated ERPClient
                if name == "list_employees":
                    result = erp_client.list_employees(**arguments)
                elif name == "get_departments":
                    result = erp_client.get_departments()
                else:
                    result = {"error": f"Unknown tool: {name}"}
            except RuntimeError as e:
                # Auth errors bubble up cleanly
                return {"answer": f"⚠️ {str(e)}", "tool_used": False}

            tool_results[name] = result
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": json.dumps(result, default=str),
            })

        # Format results in Python (reliable, no LLM formatting issues)
        if "list_employees" in tool_results:
            employees = tool_results["list_employees"]
            print(f"=== TOOL RESULT: list_employees returned type={type(employees)}, len={len(employees) if isinstance(employees, list) else 'N/A'} ===", flush=True)
            if isinstance(employees, list):
                formatted = self._format_employees(employees)
                count = len(employees)
                print(f"=== FINAL ANSWER (first 200 chars): {formatted[:200]} ===", flush=True)
                if count == 1:
                    return {"answer": formatted, "tool_used": True}
                return {"answer": f"Found **{count} employee(s)**:\n\n{formatted}", "tool_used": True}
            else:
                print(f"=== ERROR: tool result is not a list: {employees} ===", flush=True)

        if "get_departments" in tool_results:
            depts = tool_results["get_departments"]
            if isinstance(depts, list):
                names = [d.get("name") or d.get("department") or str(d) for d in depts]
                return {
                    "answer": "**Departments:**\n\n" + "\n".join(f"- {n}" for n in names),
                    "tool_used": True,
                }

        # Fallback: let LLM format
        final = self._call_groq(messages, max_tokens=max_tokens)
        return {"answer": final["choices"][0]["message"].get("content", "").strip(), "tool_used": True}


# ============================================================
# SINGLETON
# ============================================================

_llm_instance: Optional[LLM] = None

def get_llm_instance():
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = LLM()
    return _llm_instance