"""
officegpt_graph.py — LangGraph StateGraph with TinyDB conversation memory

CHANGES FROM ORIGINAL:
  - Import sql_executor_node     → api_executor_node
  - Import route_after_executor  → from agents.api_executor
  - Import route_after_planner   → from agents.api_executor
  - Node name "sql_executor"     → "api_executor"
  - Edge mapping "sql_executor"  → "api_executor"
  - initial_state: removed sql_plan/sql_result, added api_plan/api_result/api_error/token
  - run_graph() signature: added token param

Everything else (TinyDB, MemorySaver, build_graph, get_graph) is unchanged.
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env", override=True)

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from agents.state import OfficeGPTState
from agents import (
    supervisor_node,       route_after_supervisor,
    erp_planner_node,
    rag_agent_node,
    formatter_node,
    context_resolver_node,
)

# ── Replaced: sql_executor → api_executor ────────────────────────────────────
from agents.api_executor import (
    api_executor_node,
    route_after_executor,
    route_after_planner,
)

# ── TinyDB conversation memory (unchanged) ────────────────────────────────────
from chat_store import get_history, save_turn


def build_graph():
    builder = StateGraph(OfficeGPTState)

    builder.add_node("context_resolver", context_resolver_node)
    builder.add_node("supervisor",       supervisor_node)
    builder.add_node("erp_planner",      erp_planner_node)
    builder.add_node("api_executor",     api_executor_node)   # ← was sql_executor
    builder.add_node("rag_agent",        rag_agent_node)
    builder.add_node("formatter",        formatter_node)

    builder.add_edge(START, "context_resolver")
    builder.add_edge("context_resolver", "supervisor")

    builder.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {"erp_planner": "erp_planner", "rag_agent": "rag_agent", "formatter": "formatter"}
    )

    builder.add_conditional_edges(
        "erp_planner",
        route_after_planner,
        {"formatter": "formatter", "api_executor": "api_executor"}   # ← was sql_executor
    )

    builder.add_conditional_edges(
        "api_executor",                  # ← was sql_executor
        route_after_executor,
        {
            "erp_planner": "erp_planner",
            "rag_agent":   "rag_agent",
            "formatter":   "formatter",
        }
    )

    builder.add_edge("rag_agent",  "formatter")
    builder.add_edge("formatter",  END)

    return builder.compile(checkpointer=MemorySaver())


_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def run_graph(
    user_question: str,
    company_id:    int = 1,
    user_role:     str = "employee",
    user_id:       int = 0,
    thread_id:     str = "default",
    forced_intent: str = None,
    token:         str = "",           # ← NEW: JWT forwarded from server.py
) -> dict:
    graph = get_graph()

    history = get_history(thread_id)

    initial_state: OfficeGPTState = {
        "user_question":   user_question,
        "company_id":      company_id,
        "user_role":       user_role,
        "user_id":         user_id,
        "token":           token,          # ← NEW
        "chat_history":    history,
        "intent":          forced_intent or "",
        "forced_intent":   forced_intent,
        # SQL fields — kept for formatter compat, no longer written by planner
        "sql_plan":        None,
        "sql_params":      {},
        "sql_result":      None,
        "sql_error":       None,
        # API fields — new
        "api_plan":        None,
        "api_result":      None,
        "api_error":       None,
        "retry_count":     0,
        "rag_result":      None,
        "sources":         [],
        "final_answer":    "",
        "tool_used":       False,
        "access_denied":   False,
        "denied_resource": None,
    }

    config = {"configurable": {"thread_id": thread_id}}

    try:
        result = graph.invoke(initial_state, config=config)
        answer = result.get("final_answer") or "I couldn't find an answer."

        resolved_q = result.get("user_question", user_question)
        save_turn(
            thread_id=thread_id,
            user_id=user_id,
            company_id=company_id,
            user_msg=resolved_q,
            bot_msg=answer,
        )
        print(f"[Memory] thread={thread_id} saved to TinyDB", flush=True)

        return {
            "answer":    answer,
            "sources":   result.get("sources", []),
            "intent":    result.get("intent", ""),
            "tool_used": result.get("tool_used", False),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "answer":    f"⚠️ An error occurred: {str(e)}",
            "sources":   [],
            "intent":    "",
            "tool_used": False,
        }