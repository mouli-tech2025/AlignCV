
//All fetch / validation / form logic preserved exactly.


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_JD_LENGTH = 50;

const analyzeBtn = document.getElementById("analyze-btn");
const form       = document.getElementById("analyze-form");
const dropZone   = document.getElementById("drop-zone");
const fileInput  = document.getElementById("resume-input");
const fileInfo   = document.getElementById("file-info");
const fileName   = document.getElementById("file-name");
const removeBtn  = document.getElementById("remove-file");
const jdInput    = document.getElementById("jd-input");
const charCount  = document.getElementById("char-count");
const alertBox   = document.getElementById("alert");

let selectedFile = null;

// Latest analysis state (kept in memory, not persisted)
let latestData = null;
let latestMeta = null;



// ---- Alerts ----
function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove("hidden");
  alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideAlert() {
  alertBox.classList.add("hidden");
}

// ---- File validation ----
function validateFile(file) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf)                return "Only PDF files are supported.";
  if (file.size > MAX_FILE_SIZE) return "File is too large. Maximum size is 5 MB.";
  if (file.size === 0)       return "This file is empty.";
  return null;
}

function setFile(file) {
  const error = validateFile(file);
  if (error) { showAlert(error); return; }
  hideAlert();
  selectedFile = file;
  fileName.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  fileInfo.classList.remove("hidden");
}

function clearFile() {
  selectedFile = null;
  fileInput.value = "";
  fileInfo.classList.add("hidden");
}

// ---- File events ----
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

removeBtn.addEventListener("click", clearFile);

["dragenter", "dragover"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  })
);

["dragleave", "drop"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  })
);

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

// ---- Job description char count ----
jdInput.addEventListener("input", () => {
  charCount.textContent = `${jdInput.value.length} / 10000`;
});

// ---- Loading state (visual class toggles only) ----
function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  const btnText    = analyzeBtn.querySelector(".btn-text");
  const btnIcon    = analyzeBtn.querySelector(".btn-icon");
  const btnSpinner = analyzeBtn.querySelector(".btn-spinner");
  if (btnText)    btnText.textContent = isLoading ? "Analyzing\u2026" : "Analyze Resume";
  if (btnIcon)    btnIcon.classList.toggle("hidden", isLoading);
  if (btnSpinner) btnSpinner.classList.toggle("hidden", !isLoading);
}

// ---- Reset Save button (called when a new analysis starts) ----
function resetSaveBtn() {
  const saveBtn = document.getElementById("save-history-btn");
  if (!saveBtn) return;
  saveBtn.textContent = "Save to history";
  saveBtn.disabled = false;
}

// ---- Show result action buttons ----
function showResultActions() {
  const actionsEl = document.getElementById("result-actions");
  if (actionsEl) actionsEl.classList.remove("hidden");
}

// ---- Submit (fetch logic UNCHANGED) ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  if (!selectedFile) {
    showAlert("Please upload your resume as a PDF.");
    return;
  }

  const jd = jdInput.value.trim();
  if (jd.length < MIN_JD_LENGTH) {
    showAlert("Please paste a job description (at least 50 characters).");
    return;
  }

  const formData = new FormData();
  formData.append("resume", selectedFile);
  formData.append("job_description", jd);

  // Reset state for fresh analysis
  AlignDashboard.hide();
  AlignHistory.hideViewingBanner();
  resetSaveBtn();
  setLoading(true);

  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await response.json();

    if (!response.ok || !data.success) {
      showAlert(data.error || "Something went wrong. Please try again.");
      return;
    }

    // Store latest result
    latestData = data;
    latestMeta = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName:  selectedFile.name,
      jdSnippet: jd.slice(0, 80),
      createdAt: new Date().toISOString(),
    };

    AlignDashboard.render(data);
    showResultActions();
    AlignHistory.refreshHeaderBadge();
  } catch {
    showAlert("Could not reach the server. Please check your connection and try again.");
  } finally {
    setLoading(false);
  }
});

// ---- Result action buttons ----
(function initResultActions() {
  const dlBtn   = document.getElementById("download-report-btn");
  const pdfBtn  = document.getElementById("save-pdf-btn");
  const saveBtn = document.getElementById("save-history-btn");

  if (dlBtn) {
    dlBtn.addEventListener("click", () => {
      if (!latestData || !latestMeta) return;
      AlignReport.download(latestData, latestMeta);
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => window.print());
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!latestData || !latestMeta) return;
      if (AlignHistory.isSaved(latestMeta.id)) {
        saveBtn.textContent = "Saved \u2713";
        saveBtn.disabled = true;
        return;
      }
      AlignHistory.save(latestData, latestMeta);
      saveBtn.textContent = "Saved \u2713";
      saveBtn.disabled = true;
      AlignHistory.refreshHeaderBadge();
    });
  }
})();





//  VISUAL ADDITIONS (class-toggle / preference only)


// ---- Dark Mode ----
(function initDarkMode() {
  const darkBtn  = document.getElementById("dark-mode-btn");
  if (!darkBtn) return;
  const iconSun  = document.getElementById("icon-sun");
  const iconMoon = document.getElementById("icon-moon");

  const saved = localStorage.getItem("aligncv-dark");
  if (saved === "1") applyDark(true);

  darkBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("aligncv-dark", isDark ? "1" : "0");
    applyDark(isDark);
  });

  function applyDark(isDark) {
    document.body.classList.toggle("dark", isDark);
    if (iconSun)  iconSun.classList.toggle("hidden", isDark);
    if (iconMoon) iconMoon.classList.toggle("hidden", !isDark);
  }
})();

// ---- Sidebar Toggle ----
(function initSidebar() {
  const sidebar     = document.getElementById("site-sidebar");
  const toggleBtn   = document.getElementById("sidebar-toggle");
  const reopenBtn   = document.getElementById("sidebar-reopen-btn");
  const backdrop    = document.getElementById("sidebar-backdrop");
  const chevron     = document.getElementById("sidebar-chevron");
  const isMobile    = () => window.innerWidth <= 768;

  if (!sidebar) return;

  // Restore saved preference (key "alignCvSidebar")
  const saved = localStorage.getItem("alignCvSidebar");
  if (saved === "closed" && !isMobile()) {
    closeSidebar(false);
  } else if (isMobile()) {
    // Mobile: start closed (overlay mode)
    document.body.classList.remove("sidebar-open");
  }

  function openSidebar() {
    if (isMobile()) {
      document.body.classList.add("sidebar-open");
      if (backdrop) backdrop.classList.remove("hidden");
    } else {
      document.body.classList.remove("sidebar-closed");
      if (reopenBtn) reopenBtn.classList.add("hidden");
    }
    if (chevron) chevron.setAttribute("points", "15 18 9 12 15 6");
    if (!isMobile()) localStorage.setItem("alignCvSidebar", "open");
  }

  function closeSidebar(saveState = true) {
    if (isMobile()) {
      document.body.classList.remove("sidebar-open");
      if (backdrop) backdrop.classList.add("hidden");
    } else {
      document.body.classList.add("sidebar-closed");
      if (reopenBtn) reopenBtn.classList.remove("hidden");
    }
    if (chevron) chevron.setAttribute("points", "9 18 15 12 9 6");
    if (!isMobile() && saveState) localStorage.setItem("alignCvSidebar", "closed");
  }

  if (toggleBtn) toggleBtn.addEventListener("click", () => {
    const isOpen = isMobile()
      ? document.body.classList.contains("sidebar-open")
      : !document.body.classList.contains("sidebar-closed");
    if (isOpen) closeSidebar(); else openSidebar();
  });

  if (reopenBtn) reopenBtn.addEventListener("click", openSidebar);

  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  // Sidebar nav active state
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      sidebarItems.forEach((s) => s.classList.remove("active"));
      item.classList.add("active");
      // On mobile, close sidebar after navigation
      if (isMobile()) closeSidebar();
    });
  });
})();

// ---- Gauge SVG gradient injection ----
// Injects a <defs> gradient into the gauge SVG so the ring uses purple→lavender
(function injectGaugeGradient() {
  const gaugeSvg = document.querySelector(".gauge svg");
  if (!gaugeSvg) return;

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#9567f4"/>
      <stop offset="100%" stop-color="#6c4fd6"/>
    </linearGradient>
  `;
  gaugeSvg.insertBefore(defs, gaugeSvg.firstChild);
})();

// ---- Init AlignHistory ----
AlignHistory.init();

// ---- Print: open all <details> before printing, restore after ----
(function initPrintHandlers() {
  let detailsStates = [];

  window.addEventListener("beforeprint", () => {
    const allDetails = document.querySelectorAll("details");
    detailsStates = Array.from(allDetails).map((d) => ({
      el: d, wasOpen: d.open
    }));
    allDetails.forEach((d) => { d.open = true; });
  });

  window.addEventListener("afterprint", () => {
    detailsStates.forEach(({ el, wasOpen }) => {
      el.open = wasOpen;
    });
    detailsStates = [];
  });
})();
