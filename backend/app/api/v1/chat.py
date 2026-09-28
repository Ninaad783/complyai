import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ChatSession, ChatMessage, User
from app.services.intent_classifier import classify_intent
from app.services.rag_engine import rag_answer
from app.services.text_to_sql import text_to_sql_answer
from app.services.agent_orchestrator import run_agent_workflow
from app.services.security_guard import check_prompt_injection, sanitize_input
from app.services.evaluator import evaluate_rag_response
from app.services.pii_masker import detect_and_mask_pii

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    document_ids: Optional[list[str]] = None


class NewSessionRequest(BaseModel):
    title: str = "New Chat"


@router.post("/sessions")
async def create_session(
    data: NewSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=data.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}


@router.get("/sessions")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [{"id": s.id, "title": s.title, "updated_at": s.updated_at.isoformat()} for s in sessions]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": json.loads(m.sources_json or "[]"),
            "intent": m.intent,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/ask")
async def ask(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clean_message = sanitize_input(data.message)
    clean_message, pii_detected = detect_and_mask_pii(clean_message)

    # Security Guard: Prompt Injection Check
    is_malicious, security_reason = check_prompt_injection(clean_message)

    # Get or create session
    if data.session_id:
        result = await db.execute(select(ChatSession).where(ChatSession.id == data.session_id))
        session = result.scalar_one_or_none()
        if not session:
            session = ChatSession(user_id=current_user.id, title=clean_message[:60])
            db.add(session)
            await db.flush()
    else:
        session = ChatSession(user_id=current_user.id, title=clean_message[:60])
        db.add(session)
        await db.flush()

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=clean_message, sources_json="[]")
    db.add(user_msg)

    if is_malicious:
        # Intercept prompt injection attempt safely
        blocked_answer = (
            f"🛡️ **Security Guardrail Triggered**\n\n"
            f"Your request was flagged for containing an adversarial or prompt injection pattern.\n\n"
            f"**Detail:** {security_reason}\n\n"
            f"To protect system compliance policies and data boundaries, this action was safely prevented. "
            f"Please submit a standard compliance query."
        )
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=blocked_answer,
            sources_json="[]",
            intent="security_blocked",
        )
        db.add(assistant_msg)
        await db.commit()
        return {
            "session_id": session.id,
            "message_id": assistant_msg.id,
            "answer": blocked_answer,
            "sources": [],
            "intent": "security_blocked",
            "metrics": {
                "faithfulness": 100,
                "relevancy": 100,
                "context_precision": 100,
                "hallucination_risk": "None (Blocked)",
                "eval_status": "Flagged Adversarial",
                "pii_detected": pii_detected,
            },
        }

    # Classify intent
    intent = await classify_intent(clean_message)

    # Route to handler
    try:
        if intent == "sql":
            result_data = await text_to_sql_answer(clean_message)
        elif intent == "agent":
            result_data = await run_agent_workflow(clean_message, data.document_ids or [], current_user.id)
        else:
            result_data = await rag_answer(clean_message, data.document_ids or [], current_user.id)
    except Exception as e:
        result_data = {"answer": f"Error: {str(e)}", "sources": [], "intent": intent}

    # Evaluate RAG metrics
    metrics = evaluate_rag_response(
        clean_message,
        result_data["answer"],
        result_data.get("sources", []),
        intent,
    )
    metrics["pii_detected"] = pii_detected

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result_data["answer"],
        sources_json=json.dumps(result_data.get("sources", [])),
        intent=intent,
    )
    db.add(assistant_msg)
    await db.commit()

    return {
        "session_id": session.id,
        "message_id": assistant_msg.id,
        "answer": result_data["answer"],
        "sources": result_data.get("sources", []),
        "intent": intent,
        "metrics": metrics,
    }
