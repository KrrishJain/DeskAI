"""
db.py — SQLAlchemy connection pool for NeonDB (PostgreSQL).
Engine is lazy-loaded — only connects when first query runs.
"""

import os
import re
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# ── Lazy engine — created on first use, not on import ────────────────────────
_engine = None
_SessionLocal = None


def _get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL not set in .env")

        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import NullPool

        _engine = create_engine(
            DATABASE_URL,
            poolclass=NullPool,
            connect_args={"sslmode": "require"} if "neon.tech" in DATABASE_URL else {},
            echo=False,
        )
        _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)

    return _engine, _SessionLocal


def run_query(sql: str, params: dict = None) -> list:
    """Execute a raw SQL SELECT query and return list of row dicts."""
    _validate_sql(sql)
    from sqlalchemy import text

    _, SessionLocal = _get_engine()
    with SessionLocal() as session:
        result = session.execute(text(sql), params or {})
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        return rows


def _validate_sql(sql: str):
    """Block any non-SELECT SQL."""
    normalized = sql.strip().upper()
    dangerous = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"]
    for keyword in dangerous:
        if re.search(rf'\b{keyword}\b', normalized):
            raise ValueError(f"🚫 Blocked SQL keyword: {keyword}. Only SELECT queries allowed.")
    if not normalized.startswith("SELECT") and not normalized.startswith("WITH"):
        raise ValueError("🚫 Only SELECT and WITH (CTE) queries are permitted.")


def test_connection() -> bool:
    """Quick connectivity check."""
    try:
        from sqlalchemy import text
        _, SessionLocal = _get_engine()
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB] Connection failed: {e}")
        return False