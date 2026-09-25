"""
Unit tests for ComplyAI RAG Evaluation Engine
"""
import pytest
from app.services.evaluator import evaluate_rag_response


def test_evaluator_with_citations():
    sources = [
        {"document": "security_policy.pdf", "page": 1, "relevance": 0.88},
        {"document": "data_retention.docx", "page": 3, "relevance": 0.92},
    ]
    metrics = evaluate_rag_response(
        question="What is the data retention period?",
        answer="According to Section 2 of security_policy.pdf, data is retained for 365 days after termination.",
        sources=sources,
        intent="rag",
    )

    assert metrics["faithfulness"] >= 80
    assert metrics["relevancy"] >= 80
    assert metrics["context_precision"] >= 80
    assert metrics["hallucination_risk"] == "Low"
    assert metrics["eval_status"] == "Verified Grounded"


def test_evaluator_general_intent():
    metrics = evaluate_rag_response(
        question="Hello, what can you do?",
        answer="I can help you review policies, query data, and run compliance audits.",
        sources=[],
        intent="general",
    )

    assert metrics["faithfulness"] >= 90
    assert metrics["hallucination_risk"] == "Low"
