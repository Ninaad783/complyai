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
    "text/plain": "txt",
}


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Detect type by extension first, then content_type fallback
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    ext_map = {"pdf": "pdf", "docx": "docx", "xlsx": "xlsx", "csv": "csv", "txt": "txt"}
    file_type = ext_map.get(ext) or ALLOWED_TYPES.get(file.content_type)
    if not file_type:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, XLSX, CSV, or TXT.")

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


SAMPLE_PACK_DOCS = [
    {
        "name": "SOC2_and_ISO27001_Information_Security_Policy",
        "filename": "SOC2_and_ISO27001_Information_Security_Policy.txt",
        "content": (
            "# ComplyAI Enterprise Information Security & Access Policy (SOC-2 Type II & ISO-27001)\n\n"
            "## 1. Scope & Objective\n"
            "This policy defines organizational requirements for securing information assets, customer data, and system boundaries across ComplyAI infrastructure in accordance with SOC-2 Trust Services Criteria and ISO/IEC 27001:2022.\n\n"
            "## 2. Authentication and Password Controls\n"
            "- Minimum Password Length: All internal users and system accounts must maintain passwords with a minimum of 14 characters.\n"
            "- Complexity: Passwords must include uppercase letters, lowercase letters, numbers, and at least one special character.\n"
            "- Rotation: Passwords must be changed every 90 days. Re-use of the last 12 passwords is prohibited.\n"
            "- Multi-Factor Authentication (MFA): Mandatory for all employees across corporate email, SSO, internal dashboards, and VPN. Hardware security keys (FIDO2) are strictly required for production cloud administrators.\n\n"
            "## 3. Data Retention and Classification\n"
            "- Financial & Billing Records: Retained for a mandatory statutory period of 7 years.\n"
            "- Security Audit & Access Logs: Retained in tamper-evident object storage for 3 years.\n"
            "- Customer Operational Data: Retained solely for the duration of the active subscription agreement. Purged within 30 days of contract termination.\n\n"
            "## 4. Encryption Standards\n"
            "- Data at Rest: AES-256-GCM encryption is enforced on all databases, storage volumes, and backup archives.\n"
            "- Data in Transit: TLS 1.3 is mandatory for all external and internal API communications. TLS 1.0 and 1.1 are permanently disabled.\n\n"
            "## 5. Security Audits & Continuous Monitoring\n"
            "- Penetration Testing: Conducted annually by an independent CREST-accredited firm.\n"
            "- Audits: External SOC-2 Type II audit occurs biannually; ISO-27001 surveillance audit occurs annually.\n"
        ),
    },
    {
        "name": "Vendor_Risk_Management_and_GDPR_DPA",
        "filename": "Vendor_Risk_Management_and_GDPR_DPA.txt",
        "content": (
            "# ComplyAI Vendor Risk Management Framework & Data Processing Agreement (DPA)\n\n"
            "## 1. Purpose & Regulatory Alignment\n"
            "This document establishes vendor due diligence, risk classification tiers, and Standard Contractual Clauses (SCCs) complying with GDPR Article 28 and CCPA.\n\n"
            "## 2. Vendor Classification Tiers\n"
            "- Tier 1 (High Risk): Third parties storing or processing confidential customer data. Annual SOC 2 Type II or ISO 27001 certification and SIG Core review required.\n"
            "- Tier 2 (Medium Risk): Critical SaaS applications and developer tooling. Annual vendor review required.\n"
            "- Tier 3 (Low Risk): General office equipment suppliers and non-sensitive platforms.\n\n"
            "## 3. Subprocessor Notification Clauses\n"
            "- Vendors must provide at least 30 business days prior written notice before onboarding any new subprocessor.\n"
            "- ComplyAI retains the explicit right to object to any proposed subprocessor on data privacy grounds within 14 calendar days of receiving notice.\n"
            "- If an objection cannot be mitigated within 30 days, ComplyAI may terminate the agreement without penalty.\n\n"
            "## 4. Security Incident & Breach Notification\n"
            "- Any verified or suspected security breach compromising personal or corporate data must be notified in writing within 24 hours of first detection via security@complyai.internal.\n"
            "- Vendor must provide an incident post-mortem and forensic analysis within 72 hours.\n\n"
            "## 5. Limitation of Liability\n"
            "- Aggregate liability for standard commercial breaches is capped at 1x annual contract value.\n"
            "- Liability for data protection breaches or gross negligence is explicitly capped at 3x annual contract value or $2,000,000, whichever is greater.\n"
        ),
    },
    {
        "name": "Corporate_Code_of_Ethics_and_Whistleblower_Policy",
        "filename": "Corporate_Code_of_Ethics_and_Whistleblower_Policy.txt",
        "content": (
            "# ComplyAI Corporate Code of Ethics, Anti-Bribery & Whistleblower Charter\n\n"
            "## 1. Ethical Governance Standard\n"
            "ComplyAI operates with total transparency, ethical integrity, and adherence to anti-corruption laws worldwide, including the US FCPA and the UK Bribery Act 2010.\n\n"
            "## 2. Gifts, Hospitality & Anti-Bribery Rules\n"
            "- Zero-Tolerance: No employee or contractor may offer, give, solicit, or accept any bribe, kickback, or unlawful financial inducement.\n"
            "- Gift Threshold: Business gifts or event invitations exceeding $100 in value require prior written approval from the Chief Compliance Officer.\n"
            "- Government Officials: Gifts or meals for government representatives of any value are strictly forbidden.\n\n"
            "## 3. Insider Trading & Market Abuse\n"
            "- Prohibition of MNPI: Anyone possessing Material Non-Public Information is strictly forbidden from trading securities or tipping third parties.\n"
            "- Trading Blackout Windows: Regular blackout periods commence 2 weeks prior to fiscal quarter close and conclude 48 hours following public release of quarterly financial results.\n\n"
            "## 4. Whistleblower Protections & Reporting Channels\n"
            "- Confidential Hotline: Accessible 24/7 at complyai-ethics.internal and toll-free at +1-800-555-COMPLY.\n"
            "- Anonymity & Non-Retaliation: Reports may be submitted completely anonymously. ComplyAI enforces zero tolerance for retaliation against whistleblowers reporting in good faith.\n"
        ),
    },
]


@router.post("/seed-sample-pack")
async def seed_sample_pack(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    result = await db.execute(
        select(Document.name).where(Document.owner_id == current_user.id)
    )
    existing_names = set(result.scalars().all())

    seeded_docs = []
    for item in SAMPLE_PACK_DOCS:
        if item["name"] in existing_names:
            continue

        file_id = str(uuid.uuid4())
        file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}_{item['filename']}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(item["content"])

        doc = Document(
            name=item["name"],
            original_filename=item["filename"],
            file_type="txt",
            file_size=len(item["content"].encode("utf-8")),
            file_path=file_path,
            status="processing",
            owner_id=current_user.id,
        )
        db.add(doc)
        await db.flush()

        background_tasks.add_task(process_document_background, doc.id, file_path, "txt")
        seeded_docs.append({"id": doc.id, "name": doc.name})

    await db.commit()

    if not seeded_docs:
        return {
            "message": "All sample compliance documents are already present in your library.",
            "count": 0,
            "documents": [],
        }

    return {
        "message": f"Successfully loaded {len(seeded_docs)} enterprise compliance documents. Embedding in background.",
        "count": len(seeded_docs),
        "documents": seeded_docs,
    }


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
