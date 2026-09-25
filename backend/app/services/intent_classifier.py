"""
Intent Classifier — routes queries to rag | sql | agent
"""
import logging
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

INTENT_PROMPT = """Classify this user query into exactly one category:
- "rag" → questions about policies, compliance guidelines, uploaded documents, general questions, contracts
- "sql" → questions asking for data counts, tables, employee lists, salaries, financials, metrics
- "agent" → multi-step requests like "run audit", "generate risk assessment", "cross-reference employees with policy"

Reply with ONLY the word: rag, sql, or agent

Query: {query}
Category:"""


async def classify_intent(query: str) -> str:
    try:
        q_lower = query.lower()
        # Fast heuristic checks to save quota and latency
        if any(w in q_lower for w in ["audit", "workflow", "assess risk", "pipeline", "cross-reference"]):
            return "agent"
        if any(w in q_lower for w in ["how many", "count", "salary", "salaries", "revenue", "profit", "quarter", "expenses"]):
            return "sql"

        if not settings.GOOGLE_API_KEY:
            return "rag"

        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(INTENT_PROMPT.format(query=query))
        if response and response.text:
            intent = response.text.strip().lower().replace(".", "").split()[0]
            if intent in ["rag", "sql", "agent"]:
                return intent
    except Exception as e:
        logger.warning(f"Intent classification error: {e}")
    return "rag"
