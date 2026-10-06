import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Document, ChatSession, ChatMessage, ComplianceReport, User

router = APIRouter()


@router.get("/overview")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc_count = await db.scalar(select(func.count(Document.id)).where(Document.owner_id == current_user.id)) or 0
    session_count = await db.scalar(select(func.count(ChatSession.id)).where(ChatSession.user_id == current_user.id)) or 0
    ready_docs = await db.scalar(
        select(func.count(Document.id)).where(Document.owner_id == current_user.id, Document.status == "ready")
    ) or 0
    report_count = await db.scalar(
        select(func.count(ComplianceReport.id)).where(ComplianceReport.generated_by == current_user.id)
    ) or 0

    # Total messages count
    msg_stmt = (
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.user_id == current_user.id)
    )
    total_messages = await db.scalar(msg_stmt) or 0

    # Calculate dynamic risk score and violations from user reports
    reports_stmt = (
        select(ComplianceReport.risk_score, ComplianceReport.violations_count)
        .where(ComplianceReport.generated_by == current_user.id)
    )
    report_rows = (await db.execute(reports_stmt)).all()

    if report_rows:
        scores = [r[0] for r in report_rows if r[0] is not None]
        avg_risk = round(sum(scores) / len(scores)) if scores else 0
        total_violations = sum([r[1] for r in report_rows if r[1] is not None])
        compliance_rate = max(10, min(100, 100 - (avg_risk // 2)))
    elif ready_docs > 0:
        avg_risk = 25
        total_violations = 0
        compliance_rate = 95
    else:
        # Brand new user with no reports and no documents
        avg_risk = None
        total_violations = 0
        compliance_rate = None

    return {
        "documents": {"total": doc_count, "ready": ready_docs, "processing": doc_count - ready_docs},
        "chat_sessions": session_count,
        "messages": total_messages,
        "reports": report_count,
        "risk_score": avg_risk,
        "compliance_rate": compliance_rate,
        "violations": total_violations,
    }


@router.get("/activity")
async def get_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    activities = []

    # Recent documents
    doc_stmt = (
        select(Document)
        .where(Document.owner_id == current_user.id)
        .order_by(desc(Document.created_at))
        .limit(5)
    )
    docs = (await db.execute(doc_stmt)).scalars().all()
    for d in docs:
        activities.append({
            "id": f"doc_{d.id}",
            "type": "document",
            "title": f"Uploaded {d.original_filename}",
            "subtitle": f"{d.file_type.upper()} · Status: {d.status}",
            "timestamp": d.created_at.isoformat(),
            "icon": "📄",
        })

    # Recent reports
    rep_stmt = (
        select(ComplianceReport)
        .where(ComplianceReport.generated_by == current_user.id)
        .order_by(desc(ComplianceReport.created_at))
        .limit(5)
    )
    reps = (await db.execute(rep_stmt)).scalars().all()
    for r in reps:
        activities.append({
            "id": f"rep_{r.id}",
            "type": "report",
            "title": f"Generated {r.title}",
            "subtitle": f"Risk Score: {r.risk_score or 'N/A'}",
            "timestamp": r.created_at.isoformat(),
            "icon": "📊",
        })

    # Recent chats
    chat_stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(5)
    )
    chats = (await db.execute(chat_stmt)).scalars().all()
    for c in chats:
        activities.append({
            "id": f"chat_{c.id}",
            "type": "chat",
            "title": f"Chat: {c.title}",
            "subtitle": "Q&A Session",
            "timestamp": c.updated_at.isoformat(),
            "icon": "💬",
        })

    # Sort all by timestamp descending
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:8]


@router.get("/database-tables")
async def get_database_tables(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.text_to_sql import ensure_sample_tables
    from sqlalchemy import text
    await ensure_sample_tables()

    tables = ["employees", "contracts", "financial_data"]
    result = {}
    for t in tables:
        try:
            rows_res = await db.execute(text(f"SELECT * FROM {t} LIMIT 10"))
            keys = list(rows_res.keys())
            rows = [dict(zip(keys, row)) for row in rows_res.all()]
            count_res = await db.execute(text(f"SELECT COUNT(*) FROM {t}"))
            total = count_res.scalar() or 0
            result[t] = {
                "columns": keys,
                "total_records": total,
                "sample_rows": rows,
            }
        except Exception:
            result[t] = {"columns": [], "total_records": 0, "sample_rows": []}
    return result
