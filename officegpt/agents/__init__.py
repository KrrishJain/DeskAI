"""
agents/__init__.py — Export all nodes and routing functions.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agents.supervisor   import supervisor_node, route_after_supervisor
from agents.erp_planner  import erp_planner_node
from agents.sql_executor import sql_executor_node, route_after_executor
from agents.rag_agent    import rag_agent_node
from agents.formatter         import formatter_node
from agents.context_resolver  import context_resolver_node

__all__ = [
    "supervisor_node",    "route_after_supervisor",
    "erp_planner_node",
    "sql_executor_node",  "route_after_executor",
    "rag_agent_node",
    "formatter_node",
    "context_resolver_node",
]