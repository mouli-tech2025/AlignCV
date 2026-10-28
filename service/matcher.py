from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import (
    SCORE_MODERATE,
    SCORE_STRONG,
    SKILL_MATCH_WEIGHT,
    TFIDF_FULL_SCORE_AT,
    TFIDF_WEIGHT,
)
from service.skills_dictionary import flatten_skills


def tfidf_similarity(resume_text: str, jd_text: str) -> float:
    """Cosine similarity (0 to 1) between the TF-IDF vectors of two texts."""
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english", ngram_range=(1, 2), sublinear_tf=True
        )
        matrix = vectorizer.fit_transform([resume_text, jd_text])
    except ValueError:  # e.g. a text with only stop words
        return 0.0
    return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])


def compare_skills(resume_skills: dict, jd_skills: dict) -> dict:
    """Split skills into matched, missing (in JD only) and extra (in resume only)."""
    resume_flat = flatten_skills(resume_skills)
    jd_flat = flatten_skills(jd_skills)

    resume_set = {skill.lower() for skill in resume_flat}
    jd_set = {skill.lower() for skill in jd_flat}

    matched = [s for s in jd_flat if s.lower() in resume_set]
    missing = [s for s in jd_flat if s.lower() not in resume_set]
    extra = [s for s in resume_flat if s.lower() not in jd_set]

    ratio = len(matched) / len(jd_flat) if jd_flat else None
    return {"matched": matched, "missing": missing, "extra": extra, "ratio": ratio}


def score_label(score: int) -> str:
    if score >= SCORE_STRONG:
        return "Strong"
    if score >= SCORE_MODERATE:
        return "Moderate"
    return "Low"


def calculate_match(
    resume_text: str, jd_text: str, resume_skills: dict, jd_skills: dict
) -> dict:
    """Combine skill overlap and text similarity into one 0-100 match score."""
    similarity = tfidf_similarity(resume_text, jd_text)
    similarity_part = min(similarity / TFIDF_FULL_SCORE_AT, 1.0)
    skills = compare_skills(resume_skills, jd_skills)

    if skills["ratio"] is None:
    
    # The JD has no recognisable skills, so rely on text similarity alone
        final = similarity_part
    else:
        final = SKILL_MATCH_WEIGHT * skills["ratio"] + TFIDF_WEIGHT * similarity_part

    score = round(final * 100)
    return {
        "score": score,
        "label": score_label(score),
        "tfidf_similarity": round(similarity, 3),
        "skill_match_ratio": None if skills["ratio"] is None else round(skills["ratio"], 3),
        "skills": {
            "matched": skills["matched"],
            "missing": skills["missing"],
            "extra": skills["extra"],
        },
    }