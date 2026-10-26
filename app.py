from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from config import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB
from service.pdf_extractor import extract_text
from service.info_extractor import extract_resume_info
from service.skills_dictionary import find_skills
from service.matcher import calculate_match
from service.insights import build_insights
from service.ai_suggestions import AIServiceError, generate_suggestions
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


    info = extract_resume_info(resume_text)
    jd_skills = find_skills(job_description)
    match = calculate_match(resume_text, job_description, info["skills"], jd_skills)
    insights = build_insights(info, match)

    try:
        ai = generate_suggestions(resume_text, job_description, match)
        ai_error = None
    except AIServiceError as err:
        ai, ai_error = None, str(err)

    return jsonify(
        success=True,
        match=match,
        info=info,
        jd_skills=jd_skills,
        insights=insights,
        ai=ai,
        ai_error=ai_error,
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