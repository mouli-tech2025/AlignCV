from service.matcher import calculate_match, compare_skills, score_label
from service.skills_dictionary import find_skills


def test_compare_skills():
    resume = find_skills("Python Flask SQL teamwork")
    jd = find_skills("Python Docker SQL")
    result = compare_skills(resume, jd)
    assert result["matched"] == ["Python", "SQL"]
    assert result["missing"] == ["Docker"]
    assert "Flask" in result["extra"]


def test_identical_texts_score_100():
    text = "Python Flask SQL developer building REST APIs"
    skills = find_skills(text)
    assert calculate_match(text, text, skills, skills)["score"] == 100


def test_no_overlap_scores_low():
    resume = "Python Flask SQL"
    jd = "Photoshop Illustrator Figma designer"
    result = calculate_match(resume, jd, find_skills(resume), find_skills(jd))
    assert result["score"] < 20


def test_jd_without_known_skills_falls_back_to_text_similarity():
    resume = "Python developer"
    jd = "We want a friendly person who loves coffee"
    result = calculate_match(resume, jd, find_skills(resume), find_skills(jd))
    assert result["skill_match_ratio"] is None


def test_score_labels():
    assert score_label(80) == "Strong"
    assert score_label(50) == "Moderate"
    assert score_label(10) == "Low"