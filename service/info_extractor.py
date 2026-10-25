import re
from collections import defaultdict

from service.skills_dictionary import find_skills

BULLET_CHARS = "•●▪■◦○*-–—·►➢✓"
MAX_ENTRIES = 12
MAX_PROJECTS = 8

SECTION_HEADERS = {
    "education": [
        "education", "academic background", "academic qualifications",
        "educational qualifications", "qualifications", "academics",
    ],
    "experience": [
        "experience", "work experience", "professional experience", "internships",
        "internship", "internship experience", "employment history", "work history",
    ],
    "projects": [
        "projects", "project", "academic projects", "personal projects",
        "key projects", "project work",
    ],
    "certifications": [
        "certifications", "certification", "certificates", "courses",
        "licenses & certifications", "licenses and certifications",
        "courses & certifications", "certifications & courses",
    ],
    "skills": [
        "skills", "technical skills", "key skills", "core competencies",
        "skills & tools", "technologies", "tech stack", "technical proficiency",
        "skills summary",
    ],
    "achievements": [
        "achievements", "awards", "honors & awards", "accomplishments",
        "extracurricular activities", "positions of responsibility",
    ],
    "summary": [
        "summary", "professional summary", "profile", "objective",
        "career objective", "about me",
    ],
}
_HEADER_LOOKUP = {
    name: section for section, names in SECTION_HEADERS.items() for name in names
}

DEGREE_PATTERN = re.compile(
    r"(?<![a-z])(?:b\.?\s?tech|m\.?\s?tech|b\.e\.?|m\.e\.?|b\.?\s?sc|m\.?\s?sc|"
    r"bca|mca|bba|mba|b\.?\s?com|m\.?\s?com|ph\.?\s?d|bachelor(?:'?s)?|"
    r"master(?:'?s)?|diploma|higher secondary|senior secondary|"
    r"12th|10th|hsc|ssc)(?![a-z])",
    re.IGNORECASE,
)
YEAR_PATTERN = re.compile(r"\b(?:19|20)\d{2}\b")
PERCENT_PATTERN = re.compile(r"\b\d{2}(?:\.\d{1,2})?\s*%")
CGPA_PATTERNS = [
    re.compile(r"(?:cgpa|gpa)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)", re.IGNORECASE),
    re.compile(r"(\d(?:\.\d{1,2})?)\s*/\s*10\b"),
]

MONTH = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*"
DATE_RANGE = re.compile(
    rf"(?:{MONTH})?(?:19|20)\d{{2}}\s*(?:-|–|—|to)\s*"
    rf"(?:(?:{MONTH})?(?:19|20)\d{{2}}|present|current|ongoing|now)",
    re.IGNORECASE,
)
INTERNSHIP_PATTERN = re.compile(r"\bintern(?:ship)?s?\b", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"\+?\d[\d\s\-()]{8,16}\d")


# ---------- Helpers ----------
def _is_bullet(line: str) -> bool:
    return len(line) > 1 and line[0] in BULLET_CHARS


def _strip_bullet(line: str) -> str:
    return line.lstrip(BULLET_CHARS + " \t").strip()


def _unique(items) -> list[str]:
    """Remove duplicates (ignoring case) while keeping the original order."""
    seen = {}
    for item in items:
        seen.setdefault(item.lower(), item)
    return list(seen.values())


def _clean_lines(text: str) -> list[str]:
    """Split text into non-empty lines, joining lone bullet symbols to the next line.

    PDFs often put the bullet "•" and its text on separate lines.
    """
    lines = []
    pending_bullet = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if len(line) <= 2 and all(ch in BULLET_CHARS for ch in line):
            pending_bullet = True
            continue
        if pending_bullet:
            line = f"• {line}"
            pending_bullet = False
        lines.append(line)
    return lines


def _match_header(line: str) -> str | None:
    """Return the section name if the line is a section header, else None."""
    if len(line) > 40 or _is_bullet(line):
        return None
    normalised = re.sub(r"[^a-z& ]", "", line.lower())
    normalised = re.sub(r"\s+", " ", normalised).strip()
    return _HEADER_LOOKUP.get(normalised)


# ---------- Section splitting ----------
def split_sections(text: str) -> dict[str, list[str]]:
    """Split resume text into sections keyed by name (education, projects, ...).

    Anything before the first header is stored under "header".
    """
    sections = defaultdict(list)
    current = "header"
    for line in _clean_lines(text):
        header = _match_header(line)
        if header:
            current = header
            continue
        sections[current].append(line)
    return dict(sections)


# ---------- Individual extractors ----------
def extract_education(lines: list[str], full_text: str) -> dict:
    source = "\n".join(lines) if lines else full_text

    cgpa = None
    for pattern in CGPA_PATTERNS:
        match = pattern.search(source)
        if match:
            cgpa = match.group(1)
            break

    return {
        "entries": [_strip_bullet(line) for line in lines][:MAX_ENTRIES],
        "degrees": _unique(m.group(0).strip() for m in DEGREE_PATTERN.finditer(source)),
        "years": sorted(set(YEAR_PATTERN.findall(source))),
        "cgpa": cgpa,
        "percentages": _unique(PERCENT_PATTERN.findall(source)),
    }


def extract_experience(lines: list[str], full_text: str) -> dict:
    source = "\n".join(lines)
    return {
        "entries": [_strip_bullet(line) for line in lines][:MAX_ENTRIES],
        "date_ranges": _unique(m.group(0).strip() for m in DATE_RANGE.finditer(source)),
        "has_internship": bool(INTERNSHIP_PATTERN.search(full_text)),
    }

ACTION_VERBS = {
    "built", "developed", "worked", "collaborated", "designed", "implemented",
    "created", "integrated", "engineered", "led", "managed", "used", "utilized",
    "deployed", "contributed", "improved", "optimized", "trained", "analyzed",
    "automated", "tested", "wrote", "processed", "achieved",
}
# Lines like "Programming Languages: C, Java" belong to Skills, not Projects
SKILL_LABEL_LINE = re.compile(
    r"^(?:programming|languages?|libraries|frameworks?|tools?|frontend|backend|"
    r"databases?|ai|ml|technologies|platforms?|cloud|devops|soft skills|core)\b[^:]{0,40}:",
    re.IGNORECASE,
)


def _is_project_title(line: str) -> bool:
    """A title is short, has no sentence punctuation, and isn't a tech-stack
    line ("A | B | C"), a "Label: value" line, or a sentence starting with a verb."""
    if len(line) > 90 or line.endswith((".", ",", ";")):
        return False
    if "|" in line or ":" in line:
        return False
    return line.split()[0].lower().strip(",.") not in ACTION_VERBS

def extract_projects(lines: list[str]) -> list[dict]:
    """Group lines into projects: a title line starts a new project, and the
    lines after it (bullets, tech stack, sentences) become its description."""
    has_titles = any(not _is_bullet(line) and _is_project_title(line) for line in lines)
    projects = []

    for line in lines:
        if SKILL_LABEL_LINE.match(line):
            continue
        text = _strip_bullet(line)

        if _is_bullet(line) or not _is_project_title(line):
            if has_titles and projects:
                projects[-1]["description"] = f"{projects[-1]['description']} {text}".strip()
            elif not has_titles:
                projects.append({"title": text[:80], "description": text})
        else:
            projects.append({"title": text, "description": ""})

    return [
        {"title": p["title"], "description": p["description"][:400]}
        for p in projects[:MAX_PROJECTS]
    ]


def extract_certifications(lines: list[str]) -> list[str]:
    cleaned = [_strip_bullet(line) for line in lines]
    return [entry for entry in cleaned if len(entry) >= 4][:MAX_ENTRIES]


def _has_phone(text: str) -> bool:
    for match in PHONE_PATTERN.finditer(text):
        digits = re.sub(r"\D", "", match.group())
        if 10 <= len(digits) <= 13:
            return True
    return False


def detect_contact_info(text: str) -> dict:
    """Only report WHETHER contact details exist. Never return the values."""
    lowered = text.lower()
    return {
        "email": bool(EMAIL_PATTERN.search(text)),
        "phone": _has_phone(text),
        "linkedin": "linkedin.com" in lowered,
        "github": "github.com" in lowered,
    }


# ---------- Main entry point ----------
def extract_resume_info(text: str) -> dict:
    """Extract skills, sections and contact flags from cleaned resume text."""
    sections = split_sections(text)
    ordered_names = [
        "summary", "education", "experience", "projects",
        "skills", "certifications", "achievements",
    ]

    return {
        "skills": find_skills(text),
        "sections_found": [name for name in ordered_names if name in sections],
        "education": extract_education(sections.get("education", []), text),
        "experience": extract_experience(sections.get("experience", []), text),
        "projects": extract_projects(sections.get("projects", [])),
        "certifications": extract_certifications(sections.get("certifications", [])),
        "contact": detect_contact_info(text),
    }