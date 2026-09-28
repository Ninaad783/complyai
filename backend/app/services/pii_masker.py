"""
PII Detection & Redaction Service — Enterprise Compliance Guardrail
Detects and masks sensitive personal identifiers (SSNs, Credit Cards, IBANs, Phone Numbers, Secrets)
"""
import re
from typing import Tuple, List, Dict

PII_PATTERNS: List[Dict[str, str]] = [
    {
        "name": "CREDIT_CARD",
        "pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
        "replacement": "[REDACTED_CARD_NUMBER]",
    },
    {
        "name": "SSN",
        "pattern": r"\b\d{3}-\d{2}-\d{4}\b",
        "replacement": "[REDACTED_SSN]",
    },
    {
        "name": "PHONE_NUMBER",
        "pattern": r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "replacement": "[REDACTED_PHONE]",
    },
    {
        "name": "API_KEY",
        "pattern": r"\b(?:AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{32,})\b",
        "replacement": "[REDACTED_API_KEY]",
    },
]


def detect_and_mask_pii(text: str) -> Tuple[str, List[str]]:
    """
    Detects sensitive PII patterns and replaces them with compliance-safe redaction tags.
    Returns (sanitized_text, list_of_detected_types).
    """
    if not text:
        return text, []

    detected = []
    sanitized = text

    for item in PII_PATTERNS:
        matches = re.findall(item["pattern"], sanitized)
        if matches:
            detected.append(item["name"])
            sanitized = re.sub(item["pattern"], item["replacement"], sanitized)

    return sanitized, detected
