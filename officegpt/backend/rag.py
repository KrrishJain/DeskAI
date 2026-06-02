"""
RAG orchestration:
- Builds the strict prompt required for RAG
- Ensures the LLM is instructed to answer ONLY from the provided context
- Validates the generated answer against the supplied context and returns "I don't know" if not supported

Data flow:
- `build_prompt(question, docs)` -> returns (prompt_str, combined_context, sources)
- `validate_answer(answer, context)` -> returns validated answer (or "I don't know")
"""
from typing import List, Dict, Tuple

SYSTEM_PROMPT = (
    """ You are OfficeGPT — a precise, trustworthy internal company policy assistant that answers strictly based on the provided company policy document.

INPUT FORMAT: Always "ROLE: QUESTION" or just "QUESTION" (treat as Employee if no role).

ROLE-BASED RESPONSE LEVELS:
- Employee: Clear, employee-facing explanation of the relevant policy. Include exact numbers, tables, tiers, steps if they exist in context.
- Manager: Same as Employee + additional procedural guidance, authority info, and steps managers must follow.
- HR_Manager: Full visibility — include procedural details, authority tables, legal notes, escalation paths, and HR-specific actions.
- Admin: Focus on compliance, oversight, audit-related aspects.
- Unknown role → default to Employee level.

STRICT GROUNDING RULES – YOU MUST FOLLOW THESE EXACTLY:
1. Base your entire answer ONLY on the provided CONTEXT. Do NOT add, assume, or invent information.
2. Preserve exact numbers, accrual rates, days, hours, tables, bullet lists, and step-by-step processes exactly as they appear (or very close paraphrases). Do NOT summarize away quantitative details.
3. If the CONTEXT contains a table (e.g. PTO tiers, PIP steps, authority levels), reproduce it fully or in clear markdown format — do NOT say "details not provided" when they are.
4. If the exact answer is not in CONTEXT, respond ONLY with:  
   "This information is not available in current company policy."
   Do NOT guess, do NOT suggest external resources, do NOT say "refer to HR" unless the policy itself says so.
5. Never claim information is missing if any relevant part exists in context.
6. Do NOT reference external websites, handbooks, or sources (Justworks, SHRM, etc.) unless they appear in the provided context.
7. If the question asks for an action (start PIP, terminate, etc.), reply only with:  
   ACTION_REQUIRED: <brief summary of first required step(s)>
8. For sensitive/personal matters (disciplinary records, individual leave balance, termination of specific person):  
   "Please contact HR directly for this request."

ANSWER STYLE:
- Professional, concise but complete — prefer clarity over brevity when numbers/steps are involved.
- Use bullet points, numbered lists, or markdown tables when the policy uses them.
- Quote or clearly paraphrase important sentences instead of vague summaries.
- Start directly with the answer — no chit-chat or unnecessary introductions.

Your goal is maximum helpfulness and zero hallucination while staying 100% faithful to the document."""
)


def build_prompt(question: str, docs: List[Dict]) -> Tuple[str, str, List[Dict]]:
    """Build the final prompt for the LLM using the strict system prompt and retrieved docs.

    Returns: (prompt_text, combined_context, sources_list)
    """
    # Combine docs into a single context block with clear source markers
    parts = []
    sources = []
    for i, d in enumerate(docs):
        src = d.get("source", "unknown")
        page = d.get("page", 1)
        text = d.get("text", "")
        parts.append(f"SOURCE: {src} | PAGE: {page}\n{text}\n---")
        sources.append({"source": src, "page": page})

    combined_context = "\n".join(parts).strip()

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"CONTEXT:\n{combined_context}\n\n"
        f"QUESTION: {question}\n\n"
        "ANSWER:"
    )
    return prompt, combined_context, sources


def validate_answer(answer: str, context: str) -> str:
    """Validate that the answer can be traced to the provided context.

    Heuristic approach:
    - If the answer is exactly "I don't know" (case-insensitive), return it.
    - Otherwise, check whether at least one long phrase or token from the answer appears in the context.
    - If no overlap found, return "I don't know".

    This is a conservative safeguard to avoid hallucinations; adjust heuristics as needed.
    """
    if not answer:
        return "I don't know"

    normalized = answer.strip().lower()
    if normalized == "i don't know" or normalized == "idk":
        return "I don't know"

    # If no context, must return I don't know
    if not context or context.strip() == "":
        return "I don't know"

    # Heuristic: look for any contiguous substring of length >= 20 present in context
    ans = answer.strip()
    # Check for long substrings
    for i in range(0, max(1, len(ans) - 19)):
        # Relaxed: check for substring length >= 12
        substr = ans[i : i + 12].strip().lower()
        if len(substr) >= 8 and substr in context.lower():
            return answer

    # Fallback: check for presence of several medium-length words in context
    words = [w for w in ''.join(c if c.isalnum() else ' ' for c in ans).split() if len(w) > 5]
    matches = 0
    for w in words:
        if w.lower() in context.lower():
            matches += 1
    if matches >= 2:
        return answer

    # No evidence the answer derives from context
    return "I don't know"