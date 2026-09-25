import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ComplianceReport, User
from app.services.agent_orchestrator import run_agent_workflow

router = APIRouter()


class GenerateReportRequest(BaseModel):
    title: str
    query: str
    document_ids: list[str] = []
    report_type: str = "compliance"


@router.post("/generate")
async def generate_report(
    data: GenerateReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = ComplianceReport(
        title=data.title,
        report_type=data.report_type,
        status="generating",
        generated_by=current_user.id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    result = await run_agent_workflow(data.query, data.document_ids, current_user.id)

    report.status = "ready"
    report.content_json = json.dumps({"answer": result["answer"], "sources": result["sources"]})
    report.risk_score = 72.0
    await db.commit()

    return {
        "id": report.id,
        "title": report.title,
        "status": "ready",
        "content": {"answer": result["answer"], "sources": result["sources"]},
    }


@router.get("/")
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ComplianceReport)
        .where(ComplianceReport.generated_by == current_user.id)
        .order_by(ComplianceReport.created_at.desc())
    )
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "status": r.status,
            "risk_score": r.risk_score,
            "violations_count": r.violations_count,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ComplianceReport).where(
            ComplianceReport.id == report_id,
            ComplianceReport.generated_by == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "id": report.id,
        "title": report.title,
        "content": json.loads(report.content_json or "{}"),
        "risk_score": report.risk_score,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
    }
