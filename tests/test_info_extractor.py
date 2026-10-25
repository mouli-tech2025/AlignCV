from service.info_extractor import extract_resume_info, split_sections
from service.skills_dictionary import find_skills

SAMPLE_RESUME = """John Doe
john@example.com | +91 98765 43210
Education
B.Tech in Computer Science, XYZ University, 2022 - 2026
CGPA: 8.5
Experience
Python Intern, ABC Corp
Jun 2024 - Aug 2024
• Built REST APIs using Flask
Projects
AlignCV
• Resume analyzer built with Flask and scikit-learn
Certifications
• Google Data Analytics Certificate
Skills
Python, SQL, Teamwork
"""


def test_finds_skills_in_correct_categories():
    skills = find_skills("Skilled in Python, Flask, MySQL and React.js")["technical"]
    assert "Python" in skills["Programming Languages"]
    assert "Flask" in skills["Web Development"]
    assert "React" in skills["Web Development"]
    assert "MySQL" in skills["Databases"]


def test_no_partial_matches():
    skills = find_skills("MySQL and Next.js developer")["technical"]
    assert "SQL" not in skills["Databases"]
    assert "Programming Languages" not in skills  # no false JavaScript match


def test_java_is_not_javascript():
    assert find_skills("Java developer")["technical"]["Programming Languages"] == ["Java"]


def test_split_sections_finds_headers():
    sections = split_sections(SAMPLE_RESUME)
    assert {"education", "experience", "projects", "certifications", "skills"} <= set(sections)


def test_extract_resume_info():
    info = extract_resume_info(SAMPLE_RESUME)
    assert info["education"]["cgpa"] == "8.5"
    assert "B.Tech" in info["education"]["degrees"]
    assert info["experience"]["has_internship"] is True
    assert info["experience"]["date_ranges"] == ["Jun 2024 - Aug 2024"]
    assert info["projects"][0]["title"] == "AlignCV"
    assert info["contact"]["email"] is True
    assert info["contact"]["phone"] is True