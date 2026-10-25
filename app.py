from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from config import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB
from service.pdf_extractor import extract_text
from utils.errors import AppError
from utils.validators import validate_job_description, validate_resume_file

app = Flask(__name__)
# Allow 1 MB extra for the job description and form overhead
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES + 1024 * 1024


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return {"status": "ok"}


@app.route("/api/analyze", methods=["POST"])
def analyze():
    file_bytes = validate_resume_file(request.files.get("resume"))
    job_description = validate_job_description(request.form.get("job_description"))
    resume_text = extract_text(file_bytes)

    # Temporary response for testing. Later stages add the real analysis.
    return jsonify(
        success=True,
        resume_length=len(resume_text),
        job_description_length=len(job_description),
        resume_preview=resume_text[:600],
    )


@app.errorhandler(AppError)
def handle_app_error(err):
    return jsonify(success=False, error=err.message), err.status_code


@app.errorhandler(413)
def handle_too_large(_err):
    message = f"File is too large. Maximum size is {MAX_UPLOAD_MB} MB."
    return jsonify(success=False, error=message), 413


@app.errorhandler(Exception)
def handle_unexpected(err):
    if isinstance(err, HTTPException):
        return err
    app.logger.exception("Unexpected error: %s", err)
    return jsonify(success=False, error="Something went wrong. Please try again."), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)