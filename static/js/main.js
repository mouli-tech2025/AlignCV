const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_JD_LENGTH = 50;

const analyzeBtn = document.getElementById("analyze-btn");
const form = document.getElementById("analyze-form");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("resume-input");
const fileInfo = document.getElementById("file-info");
const fileName = document.getElementById("file-name");
const removeBtn = document.getElementById("remove-file");
const jdInput = document.getElementById("jd-input");
const charCount = document.getElementById("char-count");
const alertBox = document.getElementById("alert");

let selectedFile = null;

// ---------- Alerts ----------
function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove("hidden");
  alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideAlert() {
  alertBox.classList.add("hidden");
}

// ---------- File validation ----------
function validateFile(file) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files are supported.";
  if (file.size > MAX_FILE_SIZE) return "File is too large. Maximum size is 5 MB.";
  if (file.size === 0) return "This file is empty.";
  return null;
}

function setFile(file) {
  const error = validateFile(file);
  if (error) {
    showAlert(error);
    return;
  }
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

// ---------- File events ----------
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

// ---------- Job description ----------
jdInput.addEventListener("input", () => {
  charCount.textContent = `${jdInput.value.length} / 10000`;
});

// ---------- Submit ----------
function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? "Analyzing..." : "Analyze Resume";
}

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

  AlignDashboard.hide();
  setLoading(true);
  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await response.json();

    if (!response.ok || !data.success) {
      showAlert(data.error || "Something went wrong. Please try again.");
      return;
    }

    AlignDashboard.render(data);
    } catch (err) {
    console.error("Analyze failed:", err);
    showAlert("Could not reach the server. Please check your connection and try again.");
  } finally {
    setLoading(false);
    analyzeBtn.textContent = isLoading ? "Analyzing... this can take up to 20 seconds" : "Analyze Resume";
  }
});

