import fitz  # PyMuPDF

from config import MIN_RESUME_TEXT_LENGTH
from utils.errors import AppError
from utils.text_utils import clean_text


def extract_text(file_bytes: bytes) -> str:
    """Extract and clean all text from a PDF given as bytes."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        raise AppError(
            "We couldn't open this PDF. It may be corrupted or password-protected.", 422
        )

    with doc:
        if doc.needs_pass:
            raise AppError(
                "This PDF is password-protected. Please upload an unlocked version.", 422
            )
        pages = [page.get_text() for page in doc]

    text = clean_text("\n".join(pages))

    if len(text) < MIN_RESUME_TEXT_LENGTH:
        raise AppError(
            "No readable text was found. This may be a scanned or image-only PDF.", 422
        )

    return text