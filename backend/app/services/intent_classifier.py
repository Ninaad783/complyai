"""
Intent Classifier — routes queries to general | rag | sql | agent
"""
import logging
import re
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

INTENT_PROMPT = """Classify this user query into exactly one category:
- "general" → greetings (hi, hello, hey), pleasantries, asking what the system does, general assistance
- "rag" → questions about policies, compliance guidelines, uploaded documents, specific regulations, contracts
- "sql" → questions asking for data counts, tables, employee lists, salaries, financials, metrics
- "agent" → multi-step requests like "run audit", "generate risk assessment", "cross-reference employees with policy"

Reply with ONLY the word: general, rag, sql, or agent

Query: {query}
Category:"""

CONVERSATIONAL_GREETINGS = {
    "hi", "hello", "hey", "hiya", "howdy", "sup", "greetings",
    "good morning", "good afternoon", "good evening", "good day",
    "who are you", "what are you", "what can you do", "help",
    "introduce yourself", "tell me about yourself", "what is complyai",
    "start", "restart", "test"
}


async def classify_intent(query: str) -> str:
    try:
        q_lower = query.lower()
        clean_q = re.sub(r"[^\w\s]", "", q_lower).strip()

        # 1. Fast greeting check: avoid triggering RAG document search for simple hellos
        if clean_q in CONVERSATIONAL_GREETINGS:
            return "general"
        if (clean_q.startswith(("hi ", "hello ", "hey ", "greetings ")) and len(clean_q.split()) <= 4):
            return "general"

        # 2. Fast heuristic checks to save quota and latency
        if any(w in q_lower for w in ["audit", "workflow", "assess risk", "pipeline", "cross-reference"]):
            return "agent"
        if any(w in q_lower for w in ["how many", "count", "salary", "salaries", "revenue", "profit", "quarter", "expenses"]):
            return "sql"

        if not settings.GOOGLE_API_KEY:
            return "rag"

        # 3. LLM classification for nuanced queries
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(INTENT_PROMPT.format(query=query))
        if response and response.text:
            intent = response.text.strip().lower().replace(".", "").split()[0]
            if intent in ["general", "rag", "sql", "agent"]:
                return intent
    except Exception as e:
        logger.warning(f"Intent classification error: {e}")
    return "rag"
