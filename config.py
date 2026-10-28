import os

from dotenv import load_dotenv

load_dotenv()  # reads the .env file so os.getenv() can see settings
MAX_UPLOAD_MB = 5
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

MIN_JD_LENGTH = 50
MAX_JD_LENGTH = 10000

MIN_RESUME_TEXT_LENGTH = 50
# Match score weights (must add up to 1.0)
SKILL_MATCH_WEIGHT = 0.6
TFIDF_WEIGHT = 0.4

# Raw TF-IDF similarity between a resume and a JD is naturally low (0.2 to 0.4 is
# already a strong overlap), so we scale it: a similarity at or above this value counts as 100%.
TFIDF_FULL_SCORE_AT = 0.4

SCORE_STRONG = 70
SCORE_MODERATE = 40

GEMINI_FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.7-flash,gemini-3.5-flash-lite").split(",")
    if m.strip()
]
# AI suggestions (the API key itself is read from the GEMINI_API_KEY environment variable)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
AI_TIMEOUT_SECONDS = 90
AI_MAX_ATTEMPTS = 1
AI_RETRY_DELAY_SECONDS = 1
AI_MAX_RESUME_CHARS = 6000
AI_MAX_JD_CHARS = 4000