const AlignDashboard = (() => {
  const CIRCUMFERENCE = 2 * Math.PI * 54; // gauge circle radius is 54
  const COLORS = { Strong: "#34A853", Moderate: "#FBBC05", Low: "#EA4335" };
  const NOTES = {
    Strong: "Excellent alignment. Your resume closely matches this job.",
    Moderate: "Good start. A few targeted changes could raise your match.",
    Low: "Low alignment. Review the missing skills and tailor your resume.",
  };
  const NO_JD_SKILLS_NOTE =
    "No recognisable skills were found in the job description, so this score is based on text similarity only.";

  const $ = (id) => document.getElementById(id);
  let chart = null;

  // ---------- Safe DOM helpers (textContent only, never innerHTML) ----------
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function listOf(items) {
    const ul = make("ul");
    items.forEach((item) => ul.append(make("li", "", item)));
    return ul;
  }

  function renderChips(container, items, variant, emptyText) {
    container.replaceChildren();
    if (!items.length) {
      container.append(make("p", "muted", emptyText));
      return;
    }
    items.forEach((item) => container.append(make("span", `chip ${variant}`, item)));
  }

  function renderList(container, items) {
    container.replaceChildren(...items.map((text) => make("li", "", text)));
  }

  // ---------- Score gauge ----------
  function animateScore(score, label) {
    const fill = $("gauge-fill");
    const value = $("score-value");

    fill.style.stroke = COLORS[label];
    fill.style.strokeDasharray = CIRCUMFERENCE;
    fill.style.transition = "none";
    fill.style.strokeDashoffset = CIRCUMFERENCE;
    fill.getBoundingClientRect(); // force a reflow so the animation restarts
    fill.style.transition = "";
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);
    });

    const start = performance.now();
    const duration = 900;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      value.textContent = Math.round(score * progress);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- Chart ----------
  function renderChart(matchedCount, missingCount) {
    const canvas = $("skills-chart");
    const note = $("chart-note");
    if (chart) chart.destroy();

    const hasData = matchedCount + missingCount > 0;
    canvas.parentElement.classList.toggle("hidden", !hasData);
    note.classList.toggle("hidden", hasData);
    if (!hasData) {
      note.textContent = "No job description skills to chart.";
      return;
    }
    if (typeof Chart === "undefined") return; // Chart.js failed to load

    chart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Matched", "Missing"],
        datasets: [{
          data: [matchedCount, missingCount],
          backgroundColor: [COLORS.Strong, COLORS.Low],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  // ---------- Skills found in the resume ----------
  function renderResumeSkills(skills, matchedSet) {
    const box = $("resume-skills");
    box.replaceChildren();

    const groups = Object.entries(skills.technical);
    if (skills.soft.length) groups.push(["Soft skills", skills.soft]);

    if (!groups.length) {
      box.append(make("p", "muted", "No known skills were detected in your resume."));
      return;
    }

    groups.forEach(([category, items]) => {
      box.append(make("h4", "category-title", category));
      const row = make("div", "chips");
      items.forEach((skill) => {
        const variant = matchedSet.has(skill.toLowerCase()) ? "matched" : "";
        row.append(make("span", `chip ${variant}`, skill));
      });
      box.append(row);
    });
  }

  // ---------- Resume sections ----------
  function renderSections(info) {
    const { education, experience, projects, certifications } = info;

    const eduNodes = [];
    if (education.entries.length) {
      eduNodes.push(listOf(education.entries));
      const meta = [];
      if (education.cgpa) meta.push(`CGPA: ${education.cgpa}`);
      if (education.years.length) meta.push(`Years: ${education.years.join(", ")}`);
      if (meta.length) eduNodes.push(make("p", "muted", meta.join(" · ")));
    } else {
      eduNodes.push(make("p", "muted", "No education section found."));
    }
    $("detail-education").replaceChildren(...eduNodes);

    $("detail-experience").replaceChildren(
      experience.entries.length
        ? listOf(experience.entries)
        : make("p", "muted", "No experience or internship section found.")
    );

    const projectNodes = projects.length
      ? projects.map((project) => {
          const item = make("div", "project-item");
          item.append(make("strong", "", project.title));
          if (project.description) item.append(make("p", "", project.description));
          return item;
        })
      : [make("p", "muted", "No projects section found.")];
    $("detail-projects").replaceChildren(...projectNodes);

    $("detail-certifications").replaceChildren(
      certifications.length
        ? listOf(certifications)
        : make("p", "muted", "No certifications found.")
    );
  }

    // ---------- AI suggestions ----------
  function renderAI(ai, aiError) {
    const errorBox = $("ai-error");
    const body = $("ai-body");

    errorBox.classList.toggle("hidden", !aiError);
    body.classList.toggle("hidden", !ai);
    if (aiError) errorBox.textContent = aiError;
    if (!ai) return;

    $("ai-summary").textContent = ai.summary;
    renderList($("ai-improvements"), ai.improvement_suggestions);

    $("ai-skills").replaceChildren(
      ...ai.skills_to_add.map((item) => {
        const li = make("li");
        li.append(make("strong", "", item.skill));
        if (item.how) li.append(document.createTextNode(`: ${item.how}`));
        return li;
      })
    );

    const bullets = ai.rewritten_bullets.map((pair) => {
      const box = make("div", "bullet-pair");
      box.append(make("p", "bullet-before", pair.original));
      box.append(make("p", "bullet-after", pair.improved));
      return box;
    });
    $("ai-bullets").replaceChildren(
      ...(bullets.length ? bullets : [make("p", "muted", "No bullet rewrites suggested.")])
    );

    renderChips($("ai-keywords"), ai.keywords_to_include, "", "No extra keywords suggested.");
  }

  // ---------- Public API ----------
    function render(data) {
    const { match, info, insights, ai, ai_error: aiError } = data;
    const matchedSet = new Set(match.skills.matched.map((s) => s.toLowerCase()));
    const resumeSkillCount =
      Object.values(info.skills.technical).flat().length + info.skills.soft.length;

    const badge = $("score-label");
    badge.textContent = match.label;
    badge.style.background = COLORS[match.label];
    $("score-note").textContent =
      match.skill_match_ratio === null ? NO_JD_SKILLS_NOTE : NOTES[match.label];

    $("stat-matched").textContent = match.skills.matched.length;
    $("stat-missing").textContent = match.skills.missing.length;
    $("stat-found").textContent = resumeSkillCount;
    $("stat-similarity").textContent = `${Math.round(match.tfidf_similarity * 100)}%`;

    renderChips($("matched-skills"), match.skills.matched, "matched", "No matching skills found.");
    renderChips($("missing-skills"), match.skills.missing, "missing", "Nothing missing. Great!");
    renderList($("strengths-list"), insights.strengths);
    renderList($("improvements-list"), insights.improvements);
    renderResumeSkills(info.skills, matchedSet);
    renderSections(info);
    renderAI(ai, aiError);
    renderChart(match.skills.matched.length, match.skills.missing.length);

    const results = $("results");
    results.classList.remove("hidden");
    animateScore(match.score, match.label);
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hide() {
    $("results").classList.add("hidden");
  }

  return { render, hide };
})();