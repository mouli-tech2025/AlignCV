import pytest

from service.ai_suggestions import (
    AIServiceError,
    _parse_json,
    build_prompt,
    generate_suggestions,
    normalise_suggestions,
)
from utils.text_utils import redact_contact_details

MATCH = {
    "score": 55,
    "label": "Moderate",
    "skills": {"matched": ["Python"], "missing": ["Docker", "Git"], "extra": []},
}


def test_parse_json_strips_code_fences():
    raw = '```json\n{"summary": "Good fit"}\n```'
    assert _parse_json(raw) == {"summary": "Good fit"}


def test_parse_json_rejects_garbage():
    with pytest.raises(AIServiceError):
        _parse_json("Sorry, I can't help with that.")


def test_normalise_drops_malformed_items():
    raw = {
        "summary": "Decent fit.",
        "improvement_suggestions": ["Add Docker", 42, "", None],
        "skills_to_add": [{"skill": "Docker", "how": "Containerise a project"}, "Git", {"how": "no skill"}],
        "rewritten_bullets": [{"original": "Worked on X", "improved": "Built X"}, {"original": "only half"}],
        "keywords_to_include": "not a list",
    }
    result = normalise_suggestions(raw)
    assert result["improvement_suggestions"] == ["Add Docker"]
    assert [s["skill"] for s in result["skills_to_add"]] == ["Docker", "Git"]
    assert len(result["rewritten_bullets"]) == 1
    assert result["keywords_to_include"] == []


def test_normalise_rejects_empty_answer():
    with pytest.raises(AIServiceError):
        normalise_suggestions({})


def test_redaction_hides_contact_details_but_keeps_dates():
    text = "Mail me at john@example.com or +91 98765 43210. B.Tech 2022 - 2026"
    redacted = redact_contact_details(text)
    assert "john@example.com" not in redacted
    assert "98765" not in redacted
    assert "2022 - 2026" in redacted


def test_prompt_contains_missing_skills_and_no_email():
    prompt = build_prompt("Python dev, john@example.com", "Need Docker and Git", MATCH)
    assert "Docker, Git" in prompt
    assert "john@example.com" not in prompt


def test_missing_api_key_gives_friendly_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(AIServiceError, match="not configured"):
        generate_suggestions("resume", "job description", MATCH)