from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import get_current_user
from app.models.models import User
from app.services.agent_orchestrator import run_agent_workflow

router = APIRouter()


class AgentRunRequest(BaseModel):
    query: str
    document_ids: list[str] = []
    agent_type: str = "compliance"  # compliance, risk, summary


@router.post("/run")
async def run_agent(
    data: AgentRunRequest,
    current_user: User = Depends(get_current_user),
):
    result = await run_agent_workflow(data.query, data.document_ids)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "agent_steps": result.get("agent_steps", []),
        "intent": "agent",
    }
