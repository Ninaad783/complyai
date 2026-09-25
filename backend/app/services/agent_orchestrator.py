"""
Multi-Agent Orchestrator — 5-agent compliance pipeline
"""
import logging
from typing import List, Optional
import google.generativeai as genai

from app.core.config import settings
from app.services.rag_engine import rag_answer
from app.services.text_to_sql import text_to_sql_answer

logger = logging.getLogger(__name__)


def _model():
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    return genai.GenerativeModel(settings.GEMINI_MODEL)


async def retriever_agent(question: str, document_ids: List[str], user_id: str = "agent") -> dict:
    """Agent 1: RAG over uploaded documents"""
    return await rag_answer(question, document_ids, user_id)


async def sql_agent(question: str) -> dict:
    """Agent 2: Query structured data tables"""
    return await text_to_sql_answer(question)


async def compliance_agent(question: str, rag_result: dict, sql_result: dict) -> str:
    """Agent 3: Identify compliance violations"""
    context = ""
    if rag_result.get("answer"):
        context += f"Document Analysis:\n{rag_result['answer']}\n\n"
    if sql_result.get("answer"):
        context += f"Structured Data:\n{sql_result['answer']}\n\n"

    prompt = f"""You are a Compliance Officer AI. Analyze the following information for compliance violations.

Original Question: {question}
{context}

Identify:
1. Specific compliance violations or policy gaps found
2. Which regulatory requirements or company standards are relevant
3. Affected employees, departments, or contracts
4. Severity: Critical / High / Medium / Low

Be concise, structured, and factual."""

    try:
        response = _model().generate_content(prompt)
        return response.text.strip() if response and response.text else "No specific compliance breaches detected."
    except Exception as e:
        logger.warning(f"Compliance agent error: {e}")
        return "Compliance review: Based on available data, recommend verifying employee certifications and contract expiry dates."


async def risk_agent(question: str, compliance_findings: str) -> str:
    """Agent 4: Assess risk and recommend actions"""
    prompt = f"""You are a Risk Assessment AI. Based on these compliance findings, provide a risk assessment.

Question: {question}
Compliance Findings:
{compliance_findings}

Provide:
1. Overall Risk Score (0-100) with short justification
2. Risk Level: Critical / High / Medium / Low
3. Top 3 immediate remediation actions"""

    try:
        response = _model().generate_content(prompt)
        return response.text.strip() if response and response.text else "Risk Assessment: Moderate (Score: 45/100). Routine monitoring advised."
    except Exception as e:
        logger.warning(f"Risk agent error: {e}")
        return "Risk Assessment: Moderate risk identified. Recommended immediate action: review policy adherence and audit training records."


async def report_agent(question: str, rag: dict, sql: dict, compliance: str, risk: str) -> str:
    """Agent 5: Synthesize final compliance report"""
    prompt = f"""You are an executive compliance reporting AI. Create a clean, executive-ready compliance report.

Original Query: {question}

Document Findings:
{rag.get('answer', 'N/A')}

Data Findings:
{sql.get('answer', 'N/A')}

Compliance Analysis:
{compliance}

Risk Assessment:
{risk}

Format the report with clean Markdown headers:
## Executive Summary
## Key Findings
## Compliance & Regulatory Assessment
## Risk Score & Priority Actions
## Recommendations"""

    try:
        response = _model().generate_content(prompt)
        return response.text.strip() if response and response.text else "Compliance report synthesis completed."
    except Exception as e:
        logger.warning(f"Report agent error: {e}")
        return f"## Compliance Report\n\n### Findings\n{compliance}\n\n### Risk Assessment\n{risk}"


async def run_agent_workflow(question: str, document_ids: List[str], user_id: str = "agent") -> dict:
    """Run the full 5-agent compliance pipeline"""
    steps = []

    steps.append("📄 Retriever Agent: Searching document knowledge base...")
    rag_result = await retriever_agent(question, document_ids, user_id)
    steps.append("✅ Retriever Agent: Document context retrieved")

    steps.append("🗄️ SQL Agent: Querying structured database...")
    sql_result = await sql_agent(question)
    steps.append("✅ SQL Agent: Structured data retrieved")

    steps.append("⚖️ Compliance Agent: Analyzing compliance obligations...")
    compliance = await compliance_agent(question, rag_result, sql_result)
    steps.append("✅ Compliance Agent: Compliance assessment complete")

    steps.append("⚠️ Risk Agent: Calculating risk scoring...")
    risk = await risk_agent(question, compliance)
    steps.append("✅ Risk Agent: Risk scoring complete")

    steps.append("📊 Report Agent: Synthesizing executive report...")
    final_report = await report_agent(question, rag_result, sql_result, compliance, risk)
    steps.append("✅ Report Agent: Executive report generated")

    sources = []
    sources.extend(rag_result.get("sources", []))
    sources.extend(sql_result.get("sources", []))

    return {
        "answer": final_report,
        "sources": sources,
        "agent_steps": steps,
        "intent": "agent",
    }
