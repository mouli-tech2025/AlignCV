from config import SCORE_STRONG

MAX_LISTED = 6

CONTACT_LABELS = {
    "email": "an email address",
    "phone": "a phone number",
    "linkedin": "a LinkedIn link",
    "github": "a GitHub link",
}


def _join(items: list[str], limit: int = MAX_LISTED) -> str:
    """Join items into text, e.g. 'A, B, C and 2 more'."""
    shown = ", ".join(items[:limit])
    remaining = len(items) - limit
    return f"{shown} and {remaining} more" if remaining > 0 else shown


def _plural(count: int, word: str) -> str:
    return f"{count} {word}{'' if count == 1 else 's'}"


def build_strengths(info: dict, match: dict) -> list[str]:
    strengths = []
    matched = match["skills"]["matched"]
    missing = match["skills"]["missing"]

    if matched:
        total = len(matched) + len(missing)
        strengths.append(
            f"Your resume covers {len(matched)} of the {total} skills in the job "
            f"description, including {_join(matched)}."
        )

    if info["projects"]:
        strengths.append(
            f"You list {_plural(len(info['projects']), 'project')}, which shows "
            "hands-on practice."
        )

    experience = info["experience"]
    if experience["entries"] or experience["has_internship"]:
        strengths.append("You include work or internship experience.")

    if info["certifications"]:
        strengths.append("Certifications show initiative and continuous learning.")

    profiles = [
        label for key, label in (("github", "GitHub"), ("linkedin", "LinkedIn"))
        if info["contact"][key]
    ]
    if profiles:
        strengths.append(
            f"You link your {' and '.join(profiles)}, so recruiters can easily see more of your work."
        )

    if info["education"]["cgpa"]:
        strengths.append("You state your CGPA, giving a clear academic benchmark.")

    if not strengths:
        strengths.append(
            "Your resume was read successfully. Use the suggestions below to strengthen it."
        )
    return strengths


def build_improvements(info: dict, match: dict) -> list[str]:
    improvements = []
    missing = match["skills"]["missing"]
    sections = info["sections_found"]

    if match["skill_match_ratio"] is None:
        improvements.append(
            "No recognisable skills were found in the job description. Paste the full "
            "posting, including the requirements, for a more accurate score."
        )
    elif missing:
        improvements.append(
            f"The job description mentions {_join(missing)}. If you have worked with "
            "these, add them to your Skills section or describe them in your projects."
        )

    if match["score"] < SCORE_STRONG:
        improvements.append(
            "Use the job description's own keywords where they honestly describe your "
            "work, so both recruiters and ATS software see the match."
        )

    if "skills" not in sections:
        improvements.append(
            "Add a dedicated Skills section so your skills are easy to find at a glance."
        )

    experience = info["experience"]
    if not (experience["entries"] or experience["has_internship"]):
        improvements.append(
            "Add an Experience or Internships section. Part-time work, freelancing, "
            "open-source contributions and hackathons all count."
        )

    if not info["projects"]:
        improvements.append(
            "Add a Projects section with 2 to 3 projects, including the tools you used "
            "and what you achieved."
        )
    else:
        undescribed = sum(1 for p in info["projects"] if not p["description"])
        if undescribed:
            improvements.append(
                f"{_plural(undescribed, 'project')} {'has' if undescribed == 1 else 'have'} "
                "no description. Add 1 to 2 lines on what you built, your role and the result."
            )

    if not info["certifications"]:
        improvements.append(
            "Consider adding relevant certifications or online courses."
        )

    missing_contact = [
        label for key, label in CONTACT_LABELS.items() if not info["contact"][key]
    ]
    if missing_contact:
        improvements.append(f"Add {_join(missing_contact)} to your contact details.")

    return improvements


def build_insights(info: dict, match: dict) -> dict:
    return {
        "strengths": build_strengths(info, match),
        "improvements": build_improvements(info, match),
    }