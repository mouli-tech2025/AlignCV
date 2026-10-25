from service.insights import build_insights

MATCH = {
    "score": 50,
    "skill_match_ratio": 0.5,
    "skills": {"matched": ["Python"], "missing": ["Docker"], "extra": []},
}


def make_info(**overrides):
    info = {
        "sections_found": ["education", "skills"],
        "education": {"cgpa": None},
        "experience": {"entries": [], "has_internship": False},
        "projects": [],
        "certifications": [],
        "contact": {"email": True, "phone": True, "linkedin": True, "github": True},
    }
    info.update(overrides)
    return info


def test_missing_skills_are_suggested():
    improvements = build_insights(make_info(), MATCH)["improvements"]
    assert any("Docker" in text for text in improvements)


def test_missing_experience_is_flagged():
    improvements = build_insights(make_info(), MATCH)["improvements"]
    assert any("Experience" in text for text in improvements)


def test_projects_without_description_are_flagged():
    info = make_info(projects=[{"title": "AlignCV", "description": ""}])
    improvements = build_insights(info, MATCH)["improvements"]
    assert any("no description" in text for text in improvements)


def test_strengths_mention_matched_skills():
    strengths = build_insights(make_info(), MATCH)["strengths"]
    assert any("Python" in text for text in strengths)


def test_strengths_never_empty():
    match = {**MATCH, "skills": {"matched": [], "missing": [], "extra": []}}
    info = make_info(contact={"email": False, "phone": False, "linkedin": False, "github": False})
    assert build_insights(info, match)["strengths"]