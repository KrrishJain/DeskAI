"""
db_resolver.py — Minimal DB lookup for name/email/code → numeric ID resolution.

PURPOSE:
  The REST API search endpoint matches firstName OR lastName individually,
  so "Sneha Patel" (full name) returns 0 results. This module uses the
  existing db.py connection to resolve identifiers to numeric IDs,
  which are then used in API calls.

SCOPE — this module does ONE thing only:
  resolve_employee(identifier, company_id) → int | None

No other DB access. No writes. Only SELECT on employees + users tables.
All actual data fetching still goes through the API layer.
"""

from __future__ import annotations
from db import run_query


def resolve_employee(identifier: str, company_id: int) -> int | None:
    """
    Resolve any employee identifier to the numeric database id.

    Handles:
      - Full name:      "Sneha Patel"      → matches first+last name combined
      - First name only:"Sneha"            → matches first_name
      - Employee code:  "EMP-MMUWI300"     → matches employee_id column
      - Email:          "sneha@company.com"→ matches email column
      - Numeric string: "22"               → returns 22 directly

    Returns:
      Integer id if found, None if not found.
    """
    if not identifier or not str(identifier).strip():
        return None

    identifier = str(identifier).strip()

    # Already a numeric ID — return directly
    if identifier.isdigit():
        return int(identifier)

    print(f"[DB Resolver] Resolving '{identifier}' for company={company_id}", flush=True)

    # Build search SQL — try multiple match strategies in one query
    # Priority: exact full name > partial full name > first name > email > employee_id code
    sql = """
    SELECT id, first_name, last_name, email, employee_id
    FROM employees
    WHERE company_id = :company_id
      AND is_active = true
      AND (
          -- Full name exact (case-insensitive)
          LOWER(first_name || ' ' || last_name) = LOWER(:full)
          -- Full name partial
          OR LOWER(first_name || ' ' || last_name) ILIKE :partial
          -- First name only
          OR LOWER(first_name) = LOWER(:term)
          -- Last name only
          OR LOWER(last_name) = LOWER(:term)
          -- Email exact
          OR LOWER(email) = LOWER(:term)
          -- Employee code (EMP-xxx)
          OR LOWER(employee_id) = LOWER(:term)
          OR LOWER(employee_id) ILIKE :partial
      )
    ORDER BY
      -- Rank exact full name match first
      CASE WHEN LOWER(first_name || ' ' || last_name) = LOWER(:full) THEN 0 ELSE 1 END,
      first_name
    LIMIT 5
    """

    params = {
        "company_id": company_id,
        "full":       identifier,
        "partial":    f"%{identifier}%",
        "term":       identifier,
    }

    try:
        rows = run_query(sql, params)
    except Exception as exc:
        print(f"[DB Resolver] Query failed: {exc}", flush=True)
        return None

    if not rows:
        print(f"[DB Resolver] No match for '{identifier}'", flush=True)
        return None

    if len(rows) == 1:
        result_id = rows[0]["id"]
        name = f"{rows[0]['first_name']} {rows[0]['last_name']}"
        print(f"[DB Resolver] Resolved '{identifier}' → id={result_id} ({name})", flush=True)
        return int(result_id)

    # Multiple matches — try to pick the best one
    # If identifier has a space, it's likely a full name — pick closest match
    if " " in identifier:
        parts  = identifier.lower().split()
        fn, ln = parts[0], parts[-1]
        for row in rows:
            if (row["first_name"] or "").lower() == fn and (row["last_name"] or "").lower() == ln:
                print(f"[DB Resolver] Best match: id={row['id']} ({row['first_name']} {row['last_name']})", flush=True)
                return int(row["id"])

    # Return first result with a warning
    result_id = rows[0]["id"]
    name = f"{rows[0]['first_name']} {rows[0]['last_name']}"
    print(f"[DB Resolver] Multiple matches for '{identifier}' — using first: id={result_id} ({name})", flush=True)
    return int(result_id)


def resolve_employees_batch(identifiers: list[str], company_id: int) -> dict[str, int]:
    """
    Resolve multiple identifiers at once. Returns {identifier: id} dict.
    Used for bulk operations.
    """
    return {
        ident: resolve_employee(ident, company_id)
        for ident in identifiers
        if ident
    }