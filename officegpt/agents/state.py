"""
agents/state.py — Shared LangGraph state TypedDict
"""

from typing import TypedDict, Optional, List, Dict, Any


class OfficeGPTState(TypedDict):

    # ── Input ────────────────────────────────────────────────────────────────
    user_question: str
    company_id:    int
    user_role:     str          # 'admin' | 'hr' | 'employee'
    user_id:       int

    # ── Auth token ────────────────────────────────────────────────────────────
    token: str

    # ── Conversation memory ───────────────────────────────────────────────────
    chat_history:  List[Dict[str, str]]

    # ── Routing ───────────────────────────────────────────────────────────────
    intent:        str
    forced_intent: Optional[str]

    # ── ERP path — SQL fields (kept for formatter compatibility) ──────────────
    sql_plan:    Optional[str]
    sql_params:  Dict[str, Any]
    sql_result:  Optional[List[dict]]
    sql_error:   Optional[str]
    retry_count: int
    access_denied:   bool
    denied_resource: Optional[str]

    # ── ERP path — API fields ─────────────────────────────────────────────────
    api_plan:   Optional[Dict[str, Any]]
    api_result: Optional[Dict[str, Any]]
    api_error:  Optional[str]

    # ── Missing info flag (NEW) ───────────────────────────────────────────────
    # Set to True by erp_planner when required fields are missing from the
    # user's question (e.g. "add employee" with no name/email/password).
    # When True: final_answer contains the ask-for-details message,
    #            formatter passes it through without any LLM call,
    #            api_executor skips execution entirely.
    missing_info: Optional[bool]

    # ── RAG path ──────────────────────────────────────────────────────────────
    rag_result: Optional[str]
    sources:    List[dict]

    # ── Output ────────────────────────────────────────────────────────────────
    final_answer: str
    tool_used:    bool