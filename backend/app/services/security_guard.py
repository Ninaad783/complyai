"""
Security Guard — Detects prompt injections, jailbreaks, and malicious document payloads
"""
import re
from typing import Tuple

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"reveal\s+(your\s+)?(system\s+prompt|hidden\s+prompt|instructions)",
    r"repeat\s+(everything|the\s+words)\s+above",
    r"you\s+are\s+now\s+(DAN|unrestricted|jailbroken|an\s+adversary)",
    r"bypass\s+(safety|content|policy)\s+filters",
    r"system\s*:\s*override",
    r"<\s*script\s*>",
]


def check_prompt_injection(text: str) -> Tuple[bool, str]:
    """
    Checks user input or document content for prompt injection signals.
    Returns (is_malicious, risk_reason).
    """
    if not text:
        return False, ""

    text_lower = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return True, f"Potential prompt injection pattern detected matching rule: '{pattern}'"

    return False, ""


def sanitize_input(text: str) -> str:
    """Strip dangerous characters or delimiters."""
    return text.replace("\x00", "").strip()
