import re


def clean_text(text: str) -> str:
    """Normalise whitespace and remove stray characters from extracted text."""
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"\+?\d[\d\s\-()]{8,16}\d")


def _mask_phone(match: re.Match) -> str:
    digits = re.sub(r"\D", "", match.group())
    # Only mask real phone numbers, not date ranges like "2022 - 2026"
    return "[phone]" if 10 <= len(digits) <= 13 else match.group()


def redact_contact_details(text: str) -> str:
    """Replace emails and phone numbers with placeholders before sending text to an AI service."""
    text = EMAIL_PATTERN.sub("[email]", text)
    return PHONE_PATTERN.sub(_mask_phone, text)