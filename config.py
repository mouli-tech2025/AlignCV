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