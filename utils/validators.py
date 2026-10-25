from config import MAX_JD_LENGTH, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, MIN_JD_LENGTH
from utils.errors import AppError


def validate_resume_file(file) -> bytes:
    """Validate the uploaded file and return its raw bytes."""
    if file is None or file.filename == "":
        raise AppError("Please upload your resume as a PDF.", 400)

    if not file.filename.lower().endswith(".pdf"):
        raise AppError("Only PDF files are supported.", 400)

    data = file.read()

    if len(data) == 0:
        raise AppError("The uploaded file is empty.", 400)

    if len(data) > MAX_UPLOAD_BYTES:
        raise AppError(f"File is too large. Maximum size is {MAX_UPLOAD_MB} MB.", 413)

    if b"%PDF-" not in data[:1024]:
        raise AppError("This file doesn't look like a valid PDF.", 400)

    return data


def validate_job_description(job_description: str | None) -> str:
    """Validate the job description and return the cleaned text."""
    text = (job_description or "").strip()

    if len(text) < MIN_JD_LENGTH:
        raise AppError(
            f"Please paste a job description (at least {MIN_JD_LENGTH} characters).", 400
        )

    if len(text) > MAX_JD_LENGTH:
        raise AppError(
            f"Job description is too long. Maximum is {MAX_JD_LENGTH} characters.", 400
        )

    return text