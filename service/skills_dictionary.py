import json
import re
from pathlib import Path

SKILLS_FILE = Path(__file__).resolve().parent.parent / "data" / "skills.json"


def _build_pattern(aliases: list[str]) -> re.Pattern:
    """Build a regex that matches any alias as a whole word.

    The lookbehind and lookahead stop partial matches such as "sql" inside
    "mysql", "java" inside "javascript", or "js" inside "next.js".
    """
    ordered = sorted(set(aliases), key=len, reverse=True)
    body = "|".join(re.escape(alias) for alias in ordered)
    return re.compile(rf"(?<![a-z0-9+#.])(?:{body})(?![a-z0-9+#])")


def _load_dictionary():
    with open(SKILLS_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    technical = {
        category: {skill: _build_pattern(aliases) for skill, aliases in skills.items()}
        for category, skills in raw["technical"].items()
    }
    soft = {skill: _build_pattern(aliases) for skill, aliases in raw["soft"].items()}
    return technical, soft


_TECHNICAL, _SOFT = _load_dictionary()


def find_skills(text: str) -> dict:
    """Find known skills in text.

    Returns {"technical": {category: [skills]}, "soft": [skills]}.
    """
    lowered = text.lower()

    technical = {}
    for category, skills in _TECHNICAL.items():
        found = [name for name, pattern in skills.items() if pattern.search(lowered)]
        if found:
            technical[category] = found

    soft = [name for name, pattern in _SOFT.items() if pattern.search(lowered)]
    return {"technical": technical, "soft": soft}


def flatten_skills(skills: dict) -> list[str]:
    """Turn the grouped result of find_skills into one flat list."""
    flat = [skill for group in skills["technical"].values() for skill in group]
    return flat + skills["soft"]