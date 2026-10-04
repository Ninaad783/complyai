"""
RAG Engine — Robust document intelligence using SQLite + Gemini embedding + cosine similarity
"""
import asyncio
import json
import logging
import re
from typing import List, Optional
import numpy as np
import google.generativeai as genai
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.models import DocumentChunk, Document

logger = logging.getLogger(__name__)

RAG_PROMPT = """You are ComplyAI, an expert enterprise compliance and intelligence analyst.
Answer the user's question accurately and professionally using the provided document context.

Instructions:
- Base your answer primarily on the provided document excerpts.
- Cite specific document names and page numbers where available.
- Highlight any compliance obligations, deadlines, or risks.
- If the document context does not fully answer the question, state what is covered and provide helpful professional guidance.

Document Context:
{context}

User Question: {question}

Answer:"""


async def get_embedding(content: str, max_retries: int = 2) -> Optional[List[float]]:
    """Generate embedding with retry and error handling."""
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
            logger.warning(f"Embedding attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1.0 * (attempt + 1))
    return None


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def keyword_overlap_score(query: str, text: str) -> float:
    """Fallback lexical ranking if embeddings are unavailable."""
    query_words = set(re.findall(r"\w+", query.lower()))
    if not query_words:
        return 0.0
    text_words = set(re.findall(r"\w+", text.lower()))
    common = query_words.intersection(text_words)
    return len(common) / len(query_words)


async def generate_with_gemini(prompt: str, max_retries: int = 2) -> str:
    """Generate text with Gemini with retry and fallback."""
    if not settings.GOOGLE_API_KEY:
        return "Gemini API key is not configured. Please check your backend .env file."
    
    for attempt in range(max_retries):
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning(f"Generation attempt {attempt + 1} failed: {e}")
            if "ResourceExhausted" in str(type(e)) or "429" in str(e):
                await asyncio.sleep(2.0 * (attempt + 1))
            elif attempt < max_retries - 1:
                await asyncio.sleep(1.0)
            else:
                return (
                    f"ComplyAI was temporarily unable to reach the Gemini service. "
                    f"Please try your request again in a few moments."
                )
    return "No response could be generated at this time."


async def rag_answer(question: str, document_ids: List[str], user_id: str) -> dict:
    """
    RAG Pipeline:
    1. Check user's documents in DB.
    2. If user has no documents or asks about documents status, provide a direct helpful response.
    3. Retrieve chunks with hybrid scoring (vector cosine similarity + keyword fallback).
    4. Generate structured answer with citations.
    """
    try:
        # Step 1: Check user's documents and chunks
        async with AsyncSessionLocal() as db:
            doc_stmt = select(Document).where(Document.owner_id == user_id)
            doc_res = await db.execute(doc_stmt)
            user_docs = doc_res.scalars().all()

            chunk_stmt = (
                select(DocumentChunk, Document.name, Document.original_filename)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(Document.owner_id == user_id)
            )
            if document_ids:
                chunk_stmt = chunk_stmt.where(Document.id.in_(document_ids))

            chunk_res = await db.execute(chunk_stmt)
            rows = chunk_res.all()

        # Handle case where user asks "what documents did I upload" or has no documents
        q_lower = question.lower()
        asking_about_uploads = any(
            k in q_lower for k in [
                "which document", "what document", "list document", "uploaded doc",
                "show document", "my document", "files uploaded", "documents uploaded"
            ]
        )

        if asking_about_uploads:
            if not user_docs:
                answer = (
                    "You have not uploaded any documents yet.\n\n"
                    "To get started, go to the **Documents** section in the left sidebar and upload your "
                    "compliance policies, vendor contracts, PDFs, or CSV/Excel data sheets."
                )
            else:
                doc_list = "\n".join([
                    f"- **{d.name}** (`{d.original_filename}`) — Status: `{d.status}`, Type: `{d.file_type.upper()}`, Pages: {d.page_count or 'N/A'}"
                    for d in user_docs
                ])
                answer = (
                    f"Here are the documents you have currently uploaded:\n\n{doc_list}\n\n"
                    f"You can ask me specific questions about any policy clause, compliance obligation, or risk finding within these documents."
                )
            return {"answer": answer, "sources": [], "intent": "rag"}

        # If user has no documents at all
        if not rows:
            fallback_prompt = (
                f"You are ComplyAI, an AI compliance and intelligence assistant.\n"
                f"The user asked: {question}\n\n"
                f"Note: The user currently has 0 documents uploaded in their library. "
                f"Answer their question informatively and professionally using general compliance best practices, "
                f"and politely mention that they can upload their organization's policies, PDFs, or contracts in the Documents tab for exact analysis."
            )
            answer = await generate_with_gemini(fallback_prompt)
            return {"answer": answer, "sources": [], "intent": "rag"}

        # Step 2: Score chunks
        query_embedding = await get_embedding(question)
        scored = []

        for chunk, doc_name, doc_filename in rows:
            score = 0.0
            if query_embedding and chunk.embedding_json:
                try:
                    chunk_emb = json.loads(chunk.embedding_json)
                    score = cosine_similarity(query_embedding, chunk_emb)
                except Exception:
                    score = keyword_overlap_score(question, chunk.content)
            else:
                score = keyword_overlap_score(question, chunk.content)

            scored.append((score, chunk, doc_name, doc_filename))

        # Sort by relevance and filter out irrelevant noise
        scored.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [item for item in scored[:5] if item[0] >= 0.10]

        # If no chunks passed the relevance threshold, respond informatively without attaching false citations
        if not top_chunks:
            fallback_prompt = (
                f"You are ComplyAI, an enterprise compliance intelligence analyst.\n"
                f"The user asked: {question}\n\n"
                f"Note: None of the user's uploaded documents contain relevant information for this query. "
                f"Answer their question informatively using standard enterprise compliance best practices, "
                f"and mention that this specific topic was not found in their currently uploaded documents."
            )
            answer = await generate_with_gemini(fallback_prompt)
            return {"answer": answer, "sources": [], "intent": "rag"}

        # Step 3: Build context and citation list
        context_parts = []
        sources = []

        for sim, chunk, doc_name, doc_filename in top_chunks:
            context_parts.append(
                f"[Document: {doc_name} | File: {doc_filename} | Page {chunk.page_number or 'N/A'}]\n"
                f"{chunk.content}"
            )
            if not any(s["document"] == doc_name for s in sources):
                sources.append({
                    "document": doc_name,
                    "filename": doc_filename,
                    "page": chunk.page_number,
                    "relevance": round(sim, 3),
                })

        context_str = "\n\n---\n\n".join(context_parts)
        prompt = RAG_PROMPT.format(context=context_str, question=question)

        answer = await generate_with_gemini(prompt)
        return {"answer": answer, "sources": sources, "intent": "rag"}

    except Exception as e:
        logger.error(f"RAG processing error: {e}", exc_info=True)
        # Even on unexpected error, provide a helpful answer using Gemini fallback
        fallback_prompt = (
            f"You are ComplyAI, an AI compliance assistant. Provide a helpful, professional answer "
            f"to this compliance query: {question}"
        )
        answer = await generate_with_gemini(fallback_prompt)
        return {"answer": answer, "sources": [], "intent": "rag"}
