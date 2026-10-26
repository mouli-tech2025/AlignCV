// ================================================================
//  AlignCV – history.js
//  IIFE module: AlignHistory
//  Stores analysis entries in localStorage; renders history drawer.
// ================================================================

const AlignHistory = (() => {
  const STORAGE_KEY = "aligncv_history";
  const MAX_ENTRIES = 10;

  // ---------- Score color mapping (mirrors dashboard.js) ----------
  const SCORE_COLORS = {
    Strong:   { bg: "var(--mint-bg)",    text: "var(--mint-deep)" },
    Moderate: { bg: "var(--yellow-bg)",  text: "var(--yellow)"    },
    Low:      { bg: "var(--peach-bg)",   text: "var(--peach-deep)"},
  };

  // ---------- Safe make() helper (textContent only) ----------
  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // ---------- localStorage helpers ----------
  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeAll(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      showStorageError();
    }
  }

  function showStorageError() {
    const banner = document.getElementById("history-storage-error");
    if (banner) banner.classList.remove("hidden");
  }

  // ---------- Public data API ----------
  function save(data, meta) {
    const entries = readAll();

    // Prevent duplicates by id
    if (entries.some((e) => e.id === meta.id)) return;

    const entry = {
      id:        meta.id,
      savedAt:   new Date().toISOString(),
      fileName:  meta.fileName,
      jdSnippet: (meta.jdSnippet || "").slice(0, 80),
      score:     Math.round(data.match.score),
      label:     data.match.label,
      data,
    };

    // Prepend, then trim to MAX_ENTRIES
    const updated = [entry, ...entries].slice(0, MAX_ENTRIES);
    writeAll(updated);
    return entry;
  }

  function list() {
    return readAll();
  }

  function get(id) {
    return readAll().find((e) => e.id === id) || null;
  }

  function remove(id) {
    writeAll(readAll().filter((e) => e.id !== id));
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      showStorageError();
    }
  }

  function isSaved(id) {
    return readAll().some((e) => e.id === id);
  }

  function count() {
    return readAll().length;
  }

  // ================================================================
  //  UI – History Drawer
  // ================================================================

  // State
  let drawerOpen  = false;
  let prevFocus   = null;

  // Lazy-built drawer root
  let drawer      = null;
  let overlay     = null;
  let listEl      = null;
  let countBadge  = null;
  let historyBtn  = null;

  // ---------- Build drawer DOM (once) ----------
  function buildDrawer() {
    // Overlay
    overlay = make("div", "history-overlay hidden");
    overlay.setAttribute("aria-hidden", "true");
    overlay.addEventListener("click", closeDrawer);
    document.body.appendChild(overlay);

    // Drawer
    drawer = make("aside", "history-drawer hidden");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "Analysis History");

    // Header
    const header = make("div", "history-drawer-header");
    const title  = make("h2", "history-drawer-title", "Analysis History");

    const closeBtn = make("button", "history-close-btn");
    closeBtn.setAttribute("aria-label", "Close history");
    closeBtn.setAttribute("type", "button");
    const closeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    closeSvg.setAttribute("width", "18"); closeSvg.setAttribute("height", "18");
    closeSvg.setAttribute("viewBox", "0 0 24 24"); closeSvg.setAttribute("fill", "none");
    closeSvg.setAttribute("stroke", "currentColor"); closeSvg.setAttribute("stroke-width", "2.5");
    closeSvg.setAttribute("stroke-linecap", "round"); closeSvg.setAttribute("stroke-linejoin", "round");
    const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l1.setAttribute("x1","18"); l1.setAttribute("y1","6"); l1.setAttribute("x2","6"); l1.setAttribute("y2","18");
    const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l2.setAttribute("x1","6"); l2.setAttribute("y1","6"); l2.setAttribute("x2","18"); l2.setAttribute("y2","18");
    closeSvg.append(l1, l2);
    closeBtn.appendChild(closeSvg);
    closeBtn.addEventListener("click", closeDrawer);

    header.append(title, closeBtn);

    // Storage error banner
    const storageErr = make("div", "history-storage-error hidden");
    storageErr.setAttribute("id", "history-storage-error");
    storageErr.setAttribute("role", "alert");
    storageErr.textContent = "Storage is unavailable or full. Some history actions may not work.";

    // Privacy note
    const note = make("p", "history-note",
      "History is saved only in this browser. Resume text is never stored.");

    // List
    listEl = make("div", "history-list");
    listEl.setAttribute("id", "history-list");

    // Footer: clear all
    const footer = make("div", "history-drawer-footer");
    const clearBtn = make("button", "history-clear-btn", "Clear all");
    clearBtn.setAttribute("type", "button");
    clearBtn.setAttribute("id", "history-clear-btn");
    clearBtn.addEventListener("click", () => {
      if (window.confirm("Delete all saved analyses? This cannot be undone.")) {
        clear();
        refreshList();
        refreshHeaderBadge();
      }
    });
    footer.appendChild(clearBtn);

    drawer.append(header, storageErr, note, listEl, footer);
    document.body.appendChild(drawer);

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawerOpen) closeDrawer();
    });
  }

  // ---------- Render list ----------
  function refreshList() {
    if (!listEl) return;
    listEl.replaceChildren();

    const entries = list();

    if (!entries.length) {
      listEl.appendChild(make("p", "history-empty", "No saved analyses yet."));
      const clearBtn = document.getElementById("history-clear-btn");
      if (clearBtn) clearBtn.disabled = true;
      return;
    }

    const clearBtn = document.getElementById("history-clear-btn");
    if (clearBtn) clearBtn.disabled = false;

    entries.forEach((entry) => {
      listEl.appendChild(buildEntryCard(entry));
    });
  }

  // ---------- Build one entry card ----------
  function buildEntryCard(entry) {
    const card = make("div", "history-card");
    card.dataset.id = entry.id;

    // Badge + meta row
    const topRow = make("div", "history-card-top");

    const colors = SCORE_COLORS[entry.label] || SCORE_COLORS.Low;
    const badge = make("span", "history-score-badge", `${entry.score}`);
    badge.style.background = colors.bg;
    badge.style.color       = colors.text;

    const labelSpan = make("span", "history-label-text", entry.label);
    labelSpan.style.color = colors.text;

    const metaDiv = make("div", "history-meta");
    const savedDate = make("span", "history-date",
      new Date(entry.savedAt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    );
    metaDiv.append(savedDate);

    topRow.append(badge, labelSpan, metaDiv);

    // File name
    const fileRow = make("p", "history-filename", entry.fileName);

    // JD snippet
    const jdRow = make("p", "history-jd-snippet",
      entry.jdSnippet || "(no job description snippet)");

    // Actions
    const actions = make("div", "history-card-actions");

    const viewBtn = make("button", "history-action-btn history-view-btn", "View");
    viewBtn.setAttribute("type", "button");
    viewBtn.addEventListener("click", () => viewEntry(entry));

    const dlBtn = make("button", "history-action-btn history-dl-btn", "Download report");
    dlBtn.setAttribute("type", "button");
    dlBtn.addEventListener("click", () => {
      AlignReport.download(entry.data, {
        fileName:  entry.fileName,
        jdSnippet: entry.jdSnippet,
        createdAt: entry.savedAt,
      });
    });

    const delBtn = make("button", "history-action-btn history-del-btn", "Delete");
    delBtn.setAttribute("type", "button");
    delBtn.addEventListener("click", () => {
      remove(entry.id);
      refreshList();
      refreshHeaderBadge();
    });

    actions.append(viewBtn, dlBtn, delBtn);
    card.append(topRow, fileRow, jdRow, actions);
    return card;
  }

  // ---------- View a history entry ----------
  function viewEntry(entry) {
    closeDrawer();
    AlignDashboard.render(entry.data);
    showViewingBanner(entry);

    // Mark Save button as already saved
    const saveBtn = document.getElementById("save-history-btn");
    if (saveBtn) {
      saveBtn.textContent = "Saved \u2713";
      saveBtn.disabled = true;
    }
  }

  // ---------- "Viewing saved analysis" banner ----------
  function showViewingBanner(entry) {
    let banner = document.getElementById("history-viewing-banner");
    if (!banner) {
      banner = make("div", "history-viewing-banner");
      banner.setAttribute("id", "history-viewing-banner");
      banner.setAttribute("role", "status");

      const closeBtn = make("button", "history-banner-close");
      closeBtn.setAttribute("type", "button");
      closeBtn.setAttribute("aria-label", "Close banner");
      closeBtn.textContent = "\u00d7";
      closeBtn.addEventListener("click", () => banner.classList.add("hidden"));
      banner.appendChild(closeBtn);

      const results = document.getElementById("results");
      if (results) results.insertAdjacentElement("beforebegin", banner);
    }

    // Set text (safe – no innerHTML)
    const dateStr = new Date(entry.savedAt).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    const existingClose = banner.querySelector(".history-banner-close");
    banner.replaceChildren();

    const textNode = document.createTextNode(
      `Viewing saved analysis from ${dateStr}`
    );
    banner.appendChild(textNode);

    if (existingClose) {
      banner.appendChild(existingClose);
    } else {
      const closeBtn2 = make("button", "history-banner-close");
      closeBtn2.setAttribute("type", "button");
      closeBtn2.setAttribute("aria-label", "Close banner");
      closeBtn2.textContent = "\u00d7";
      closeBtn2.addEventListener("click", () => banner.classList.add("hidden"));
      banner.appendChild(closeBtn2);
    }

    banner.classList.remove("hidden");
  }

  function hideViewingBanner() {
    const banner = document.getElementById("history-viewing-banner");
    if (banner) banner.classList.add("hidden");
  }

  // ---------- Open / close drawer ----------
  function openDrawer() {
    if (!drawer) buildDrawer();
    refreshList();
    prevFocus = document.activeElement;
    drawer.classList.remove("hidden");
    overlay.classList.remove("hidden");
    overlay.removeAttribute("aria-hidden");
    drawerOpen = true;
    // Move focus to close button
    const closeBtn = drawer.querySelector(".history-close-btn");
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.add("hidden");
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    drawerOpen = false;
    if (prevFocus) prevFocus.focus();
  }

  // ---------- Refresh the "History (n)" badge ----------
  function refreshHeaderBadge() {
    if (!historyBtn) return;
    const n = count();
    historyBtn.textContent = `History (${n})`;
  }

  // ---------- Init (called once by main.js after DOM ready) ----------
  function init() {
    historyBtn = document.getElementById("history-open-btn");
    if (historyBtn) {
      refreshHeaderBadge();
      historyBtn.addEventListener("click", openDrawer);
    }
  }

  return {
    save, list, get, remove, clear, isSaved, count,
    init, openDrawer, closeDrawer,
    refreshHeaderBadge, hideViewingBanner,
  };
})();
