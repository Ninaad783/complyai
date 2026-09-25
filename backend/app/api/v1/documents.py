import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import Document, User
from app.services.document_processor import process_document_background

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
    "text/plain": "csv",  # some browsers send this for .csv
}


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Detect type by content_type or extension fallback
    file_type = ALLOWED_TYPES.get(file.content_type)
    if not file_type:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        ext_map = {"pdf": "pdf", "docx": "docx", "xlsx": "xlsx", "csv": "csv"}
        file_type = ext_map.get(ext)
    if not file_type:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use PDF, DOCX, XLSX, or CSV.")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    safe_name = (file.filename or "upload").replace(" ", "_")
    file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}_{safe_name}")

    with open(file_path, "wb") as f:
        f.write(content)

    doc_name = (file.filename or "document").rsplit(".", 1)[0]
    doc = Document(
        name=doc_name,
        original_filename=file.filename or "document",
        file_type=file_type,
        file_size=len(content),
        file_path=file_path,
        status="processing",
        owner_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(process_document_background, doc.id, file_path, file_type)

    return {
        "id": doc.id,
        "name": doc.name,
        "status": "processing",
        "message": "Document uploaded! Processing & embedding in background...",
    }


@router.get("/")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.owner_id == current_user.id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "original_filename": d.original_filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "status": d.status,
            "page_count": d.page_count,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.owner_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": doc.id, "name": doc.name, "status": doc.status, "file_type": doc.file_type}


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.owner_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        if doc.file_path and os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully"}
