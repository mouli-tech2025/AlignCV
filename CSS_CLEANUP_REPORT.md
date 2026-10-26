# CSS Cleanup Report — AlignCV `style.css`

## File Size Before / After

| Metric | Before | After | Saved |
|---|---|---|---|
| Lines | 3,806 | 3,245 | **561 lines** |
| Bytes | 106,805 (104.3 KB) | 93,777 (91.6 KB) | **13,028 bytes (12.2%)** |

---

## What Was Removed

### 1. Unused Classes (never appear in HTML or JS)

| Selector(s) | Reason |
|---|---|
| `.btn-ghost`, `.btn-ghost:hover` | "How It Works" button removed from `index.html` |
| `.ai-footer`, `.btn-report` (×2 defs) | `<div class="ai-footer">` and `#view-report-btn` removed from HTML |
| `.btn-coral`, `.btn-mint`, `.btn-yellow`, `.btn-blue` (+ hover/active) | Optional color buttons never added to HTML |
| `.pill-active`, `.pill-pending`, `.pill-archived` | Never used in HTML or JS |
| `.sidebar.collapsed .sidebar-deco`, `.sidebar.closed .sidebar-deco` | JS sets `body.sidebar-closed`/`body.sidebar-open`; never these element classes |

### 2. Unused Legacy Selector Aliases (removed from compound selectors)

| Removed | Kept counterpart |
|---|---|
| `.icon-purple` | `.icon-lavender` |
| `.icon-green` | `.icon-mint` |
| `.icon-orange` | `.icon-peach` |

Labeled "Legacy aliases" in original CSS; never appear in HTML or JS.

### 3. Unused Utility Rules

| Selector | Reason |
|---|---|
| `.chart-wrap` | Never in `index.html` or any JS file |
| `body.dark-mode .clay-icon--mint` | Typo — JS adds `body.dark`, never `body.dark-mode` |

### 4. Superseded Duplicates (later rule wins for all matched elements)

| Removed | Kept (wins) |
|---|---|
| `.skill-coverage-card .coverage-chart-container` 210px circle ver. | 320px `border-radius:24px` version |
| `.skill-coverage-card .coverage-chart-container` 260px block ver. | Same 320px version |
| `.skill-coverage-card #skills-chart` `position:relative` version | `position:absolute !important; inset:0` version |
| `.coverage-center strong` / `.coverage-center span` (unscoped) | `.skill-coverage-card #coverage-percentage` + `.coverage-center-label` |
| `.coverage-legend` / `.coverage-legend-item` (unscoped, tiny) | `.skill-coverage-card .coverage-legend` / `.coverage-legend-item` scoped |
| `.coverage-dot` 9px version | `.skill-coverage-card .coverage-dot` 22px version |
| `.coverage-dot.matched` / `.coverage-dot.missing` | Never matches — HTML uses `matched-dot`/`missing-dot` classes |

### 5. Entire "REALISTIC CLAYMORPHISM THEME" Section Removed (~370 lines, 6.9 KB)

All class rules in this third `:root` + rule block were 100% unused:

**Unused `:root` variables:** `--clay-bg`, `--clay-surface`, `--clay-lavender`, `--clay-text`, `--clay-muted`, `--clay-shadow-raised`, `--clay-shadow-pressed`

**Unused card classes:** `.metric-card`, `.stat-card`, `.skill-card`, `.analysis-card`, `.result-card`, `.dashboard-card`, `.feature-card`, `.matched-card`, `.match-card`, `.purple-card`, `.missing-card`, `.error-card`, `.peach-card`, `.resume-card`, `.search-card`, `.mint-card`, `.similarity-card`, `.pink-card`

**Unused component classes:** `.clay-arrow`, `.arrow-button`, `.carousel-arrow`, `.score-gauge-track`, `.score-gauge-progress`, `.skill-tag`, `.skill-badge`, `.skill-chip`, `.clay-icon--purple`

**Dead body rule:** `color: var(--clay-text)` with `radial-gradient` bg — color actually comes from `var(--text-dark)` in base rule

**Dead nav rule:** `.navbar, nav { backdrop-filter: blur(16px) }` — `.navbar` not in HTML; `nav` element has backdrop-filter removed by the `none !important` override

**Dead `@media (prefers-reduced-motion)` block** — only listed the above unused classes

### 6. Print Selector List Cleanup

Removed `.ai-footer`, `.btn-report`, `#view-report-btn` from `@media print` `display:none !important` list — elements no longer exist in HTML.

---

## Deliberately KEPT (looked unused but protected)

| Selector | Reason |
|---|---|
| `.skill-coverage-card` (1st definition) | Provides `border-radius`, `padding`, `background`, `box-shadow`; later def only adds flex layout |
| `.clay-icon--peach` (dark mode override) | `clay-icon--peach` is used in `index.html` |
| All `@keyframes` | All referenced by animation properties in kept rules |
| All `@media print` rules | Required for "Save as PDF" feature |
| All `body.dark` rules | Required for dark mode toggle |
| All `@media (max-width:...)` blocks | Apply to HTML-present selectors |
| All `:hover`, `:focus`, `:active`, `::before/::after` | State styles always protected |
| `.hidden`, `.dragover`, `.dark`, `.sidebar-closed`, `.sidebar-open`, `.active` | Applied by JS at runtime |

---

## Manual Verification Steps

Hard-refresh (`Cmd+Shift+R`) then check these views match the pre-cleanup appearance:

1. **Home page** — hero, upload form, sidebar (light mode)
2. **Dark mode** — toggle the theme; all surfaces, text, chips should match
3. **Analysis result** — run a real analysis; score gauge, stat tiles, chip colors, details accordion
4. **History drawer** — open/close, save entry, view/download/delete
5. **Mobile (390 px)** — sidebar overlay, single-column layout, hero stack
6. **Print preview** — "Save as PDF"; only results visible, no header/sidebar/form
7. **Browser console** — no new JS or CSS errors
