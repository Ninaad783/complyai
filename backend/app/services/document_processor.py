"""
Document Processor — parses PDF/DOCX/CSV/XLSX, chunks, generates embeddings with Gemini, stores in SQLite
"""
import asyncio
import json
import logging
import os
from typing import List, Optional
import google.generativeai as genai
from sqlalchemy import update

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.models import Document, DocumentChunk

logger = logging.getLogger(__name__)


def parse_pdf(file_path: str) -> List[dict]:
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"content": text.strip(), "page_number": i + 1})
    return pages


def parse_docx(file_path: str) -> List[dict]:
    from docx import Document as DocxDoc
    doc = DocxDoc(file_path)
    text = "\n".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
    return [{"content": text, "page_number": 1}] if text else []


def parse_csv(file_path: str) -> List[dict]:
    import pandas as pd
    df = pd.read_csv(file_path)
    chunks = []
    batch_size = 40
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i + batch_size]
        chunks.append({
            "content": batch.to_string(index=False),
            "page_number": (i // batch_size) + 1
        })
    return chunks


def parse_xlsx(file_path: str) -> List[dict]:
    import pandas as pd
    xf = pd.ExcelFile(file_path)
    chunks = []
    for sheet_name in xf.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        chunks.append({
            "content": f"Sheet: {sheet_name}\n{df.to_string(index=False)}",
            "page_number": 1
        })
    return chunks


def parse_txt(file_path: str) -> List[dict]:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read().strip()
    return [{"content": text, "page_number": 1}] if text else []


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks


async def get_embedding(content: str, max_retries: int = 2) -> Optional[List[float]]:
    if not settings.GOOGLE_API_KEY:
        return None
    for attempt in range(max_retries):
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            emb_model = settings.EMBEDDING_MODEL or "models/gemini-embedding-001"
            if emb_model == "models/embedding-001" or "gemini" not in emb_model:
                emb_model = "models/gemini-embedding-001"
            result = genai.embed_content(
                model=emb_model,
                content=content[:2048]
            )
            return result.get("embedding")
        except Exception as e:
            logger.warning(f"Document chunk embedding attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1.0 * (attempt + 1))
    return None


async def process_document_background(doc_id: str, file_path: str, file_type: str):
    logger.info(f"Starting background processing for document: {doc_id} ({file_type})")
    async with AsyncSessionLocal() as db:
        try:
            parsers = {
                "pdf": parse_pdf,
                "docx": parse_docx,
                "csv": parse_csv,
                "xlsx": parse_xlsx,
                "txt": parse_txt,
            }
            parser = parsers.get(file_type)
            if not parser:
                raise ValueError(f"Unsupported file type: {file_type}")

            pages = parser(file_path)
            if not pages:
                # If empty or image-only
                pages = [{"content": f"Document {os.path.basename(file_path)} uploaded.", "page_number": 1}]

            all_chunks = []
            for page in pages:
                content = page["content"]
                if len(content.split()) > 450:
                    sub_chunks = chunk_text(content)
                    for sub in sub_chunks:
                        all_chunks.append({"content": sub, "page_number": page["page_number"]})
                else:
                    all_chunks.append(page)

            # Limit chunks to prevent excessive API quota consumption on large files
            max_chunks_to_embed = 30
            for i, chunk in enumerate(all_chunks[:max_chunks_to_embed]):
                embedding = None
                try:
                    embedding = await get_embedding(chunk["content"])
                    await asyncio.sleep(0.3)  # Respect free tier rate limit
                except Exception as e:
                    logger.warning(f"Error embedding chunk {i}: {e}")

                doc_chunk = DocumentChunk(
                    document_id=doc_id,
                    chunk_index=i,
                    content=chunk["content"],
                    page_number=chunk["page_number"],
                    embedding_json=json.dumps(embedding) if embedding else None,
                )
                db.add(doc_chunk)

            # Mark as ready
            await db.execute(
                update(Document)
                .where(Document.id == doc_id)
                .values(status="ready", page_count=len(pages))
            )
            await db.commit()
            logger.info(f"Successfully processed document {doc_id} with {len(all_chunks)} chunks.")

        except Exception as e:
            logger.error(f"Failed to process document {doc_id}: {e}", exc_info=True)
            await db.execute(
                update(Document).where(Document.id == doc_id).values(status="failed")
            )
            await db.commit()
