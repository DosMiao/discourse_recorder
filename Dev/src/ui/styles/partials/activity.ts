// Activity Panel — pinned at the bottom of the dock body. Hosts a vertical
// stack of TaskCards, each with progress bar, ETA/throughput, stage chips,
// and an expandable failure list.
//
// Visual hierarchy:
//   E2 outer panel surface (matches stats grid)
//     E3 card per task
//       E4 chips for status pill and stage chips
//       bar fill uses the same accent gradient as the primary button
//
// Status colours are driven by a data-status attribute on the card so we
// don't need to thrash class names from JS.

import { NS } from '../../../bootstrap/config';

export const ACTIVITY_CSS = `
/* ── Panel container ──────────────────────────────────────── */
.${NS}-activity-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: var(--${NS}-E2-bg);
    border: 1px solid var(--${NS}-E2-border);
    border-radius: var(--${NS}-radius-lg);
    box-shadow: var(--${NS}-E2-shadow), var(--${NS}-E2-edge);
    max-height: 38vh;
    overflow-y: auto;
}
.${NS}-activity-panel[hidden] { display: none; }
.${NS}-activity-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* Mini-mode dock hides the body, which already takes the panel with it.
   No extra rule needed. */

/* ── Task card ────────────────────────────────────────────── */
.${NS}-task-card {
    background: var(--${NS}-E3-bg);
    border: 1px solid var(--${NS}-E3-border);
    border-radius: var(--${NS}-radius-md);
    box-shadow: var(--${NS}-E3-shadow);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.2s ease;
}
.${NS}-task-card[data-status="failed"] {
    border-color: var(--${NS}-danger-border);
}
.${NS}-task-card[data-status="cancelled"] {
    border-color: var(--${NS}-neutral-border);
    opacity: 0.85;
}
.${NS}-task-card[data-status="succeeded"] {
    border-color: var(--${NS}-success-border);
}

/* ── Header row ───────────────────────────────────────────── */
.${NS}-task-header {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}
.${NS}-task-kind-icon {
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;
}
.${NS}-task-title {
    flex: 1;
    min-width: 0;
    font: 600 var(--${NS}-fs-md)/1.2 var(--${NS}-font);
    color: var(--${NS}-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.${NS}-task-status-pill {
    flex-shrink: 0;
    padding: 1px 7px;
    border-radius: var(--${NS}-radius-pill);
    font: 600 var(--${NS}-fs-xs)/1.4 var(--${NS}-font);
    letter-spacing: 0.2px;
    text-transform: uppercase;
    background: var(--${NS}-info-soft);
    border: 1px solid var(--${NS}-info-border);
    color: var(--${NS}-color-blue);
}
.${NS}-task-card[data-status="succeeded"] .${NS}-task-status-pill {
    background: var(--${NS}-success-soft);
    border-color: var(--${NS}-success-border);
    color: var(--${NS}-color-green);
}
.${NS}-task-card[data-status="failed"] .${NS}-task-status-pill {
    background: var(--${NS}-danger-soft);
    border-color: var(--${NS}-danger-border);
    color: var(--${NS}-color-red);
}
.${NS}-task-card[data-status="cancelled"] .${NS}-task-status-pill {
    background: var(--${NS}-neutral-soft);
    border-color: var(--${NS}-neutral-border);
    color: var(--${NS}-text-muted);
}
.${NS}-task-card[data-status="pending"] .${NS}-task-status-pill {
    background: var(--${NS}-warning-soft);
    border-color: var(--${NS}-warning-border);
    color: var(--${NS}-color-orange);
}

/* Header buttons (cancel/dismiss) */
.${NS}-task-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--${NS}-radius-sm);
    width: 20px;
    height: 20px;
    padding: 0;
    cursor: pointer;
    color: var(--${NS}-text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.${NS}-task-btn:hover {
    background: var(--${NS}-E4-bg);
    border-color: var(--${NS}-E4-border);
    color: var(--${NS}-text-primary);
}
.${NS}-task-btn svg { width: 10px; height: 10px; }
.${NS}-task-btn[hidden] { display: none; }

/* ── Progress row ─────────────────────────────────────────── */
.${NS}-task-progress-row {
    display: flex;
    align-items: center;
    gap: 8px;
}
.${NS}-task-bar {
    flex: 1;
    height: 6px;
    background: var(--${NS}-E4-bg);
    border: 1px solid var(--${NS}-E4-border);
    border-radius: var(--${NS}-radius-pill);
    overflow: hidden;
    position: relative;
}
.${NS}-task-bar-fill {
    height: 100%;
    width: 0%;
    background: var(--${NS}-accent-gradient);
    border-radius: var(--${NS}-radius-pill);
    transition: width 0.25s var(--${NS}-ease-out);
}
.${NS}-task-card[data-status="succeeded"] .${NS}-task-bar-fill {
    background: linear-gradient(135deg, rgba(var(--${NS}-color-green-rgb),0.9), rgba(var(--${NS}-color-green-rgb),0.7));
}
.${NS}-task-card[data-status="failed"] .${NS}-task-bar-fill {
    background: linear-gradient(135deg, rgba(var(--${NS}-color-red-rgb),0.9), rgba(var(--${NS}-color-red-rgb),0.7));
}
.${NS}-task-card[data-status="cancelled"] .${NS}-task-bar-fill {
    background: linear-gradient(135deg, rgba(var(--${NS}-color-gray-rgb),0.7), rgba(var(--${NS}-color-gray-rgb),0.5));
}
.${NS}-task-card[data-status="running"] .${NS}-task-bar::after {
    /* Subtle moving shimmer to convey "still working" even if % is static */
    content: '';
    position: absolute;
    top: 0; left: -40%;
    width: 30%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
    animation: ${NS}-taskShimmer 1.6s linear infinite;
}
.${NS}-task-counter {
    flex-shrink: 0;
    font: 600 var(--${NS}-fs-xs)/1 var(--${NS}-font);
    color: var(--${NS}-text-secondary);
    font-variant-numeric: tabular-nums;
    min-width: 48px;
    text-align: right;
}

@keyframes ${NS}-taskShimmer {
    from { transform: translateX(0); }
    to   { transform: translateX(360%); }
}

/* ── Meta row (ETA · throughput · failed) ─────────────────── */
.${NS}-task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font: 500 var(--${NS}-fs-xs)/1.3 var(--${NS}-font);
    color: var(--${NS}-text-muted);
    font-variant-numeric: tabular-nums;
}
.${NS}-task-meta > span[hidden] { display: none; }
.${NS}-task-failed {
    color: var(--${NS}-color-red);
    font-weight: 600;
}
.${NS}-task-message {
    color: var(--${NS}-text-secondary);
    font-style: italic;
}

/* ── Stage chips ──────────────────────────────────────────── */
.${NS}-task-stages {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.${NS}-task-stages[hidden] { display: none; }
.${NS}-task-stage {
    font: 500 var(--${NS}-fs-xs)/1 var(--${NS}-font);
    padding: 3px 7px;
    border-radius: var(--${NS}-radius-pill);
    background: var(--${NS}-E4-bg);
    border: 1px solid var(--${NS}-E4-border);
    color: var(--${NS}-text-muted);
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.${NS}-task-stage[data-stage-status="active"],
.${NS}-task-stage.${NS}-task-stage-active {
    background: var(--${NS}-info-soft);
    border-color: var(--${NS}-info-border);
    color: var(--${NS}-color-blue);
    font-weight: 600;
}
.${NS}-task-stage[data-stage-status="done"] {
    background: var(--${NS}-success-soft);
    border-color: var(--${NS}-success-border);
    color: var(--${NS}-color-green);
}
.${NS}-task-stage[data-stage-status="skipped"] {
    opacity: 0.55;
    text-decoration: line-through;
}

/* ── Failures (collapsible) ───────────────────────────────── */
.${NS}-task-failures {
    margin-top: 2px;
    padding: 0;
    background: transparent;
}
.${NS}-task-failures[hidden] { display: none; }
.${NS}-task-failures-summary {
    cursor: pointer;
    list-style: none;
    font: 600 var(--${NS}-fs-xs)/1.3 var(--${NS}-font);
    color: var(--${NS}-color-red);
    padding: 4px 0;
    user-select: none;
}
.${NS}-task-failures-summary::-webkit-details-marker { display: none; }
.${NS}-task-failures-summary::before {
    content: '▸';
    display: inline-block;
    width: 12px;
    transition: transform 0.18s ease;
}
.${NS}-task-failures[open] .${NS}-task-failures-summary::before {
    transform: rotate(90deg);
}
.${NS}-task-failure-list {
    margin: 4px 0 0 12px;
    padding: 0;
    list-style: none;
    max-height: 160px;
    overflow-y: auto;
}
.${NS}-task-failure-item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 0;
    font: 500 var(--${NS}-fs-xs)/1.3 var(--${NS}-font-mono);
    border-bottom: 1px dashed var(--${NS}-E4-border);
}
.${NS}-task-failure-item:last-child { border-bottom: none; }
.${NS}-task-failure-label {
    color: var(--${NS}-text-secondary);
    word-break: break-all;
    flex: 1;
    min-width: 0;
}
.${NS}-task-failure-error {
    color: var(--${NS}-color-red);
    flex-shrink: 0;
    font-weight: 600;
}
.${NS}-task-failures-more {
    margin-top: 4px;
    padding-left: 12px;
    font: 500 var(--${NS}-fs-xs)/1.3 var(--${NS}-font);
    color: var(--${NS}-text-muted);
    font-style: italic;
}
.${NS}-task-failures-more[hidden] { display: none; }
.${NS}-task-failures-retry-slot {
    margin-top: 6px;
    padding-left: 12px;
}
.${NS}-task-retry {
    width: auto;
    height: auto;
    padding: 4px 10px;
    font: 600 var(--${NS}-fs-xs)/1 var(--${NS}-font);
    background: var(--${NS}-info-soft);
    border: 1px solid var(--${NS}-info-border);
    color: var(--${NS}-color-blue);
    border-radius: var(--${NS}-radius-md);
}
.${NS}-task-retry:hover {
    background: var(--${NS}-info-border);
    color: var(--${NS}-text-on-accent);
}

/* ── Mini-dock "running tasks" indicator ──────────────────── */
.${NS}-mini-task-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--${NS}-color-blue);
    box-shadow: 0 0 0 3px rgba(var(--${NS}-color-blue-rgb), 0.18);
    animation: ${NS}-pulse 1.6s ease-in-out infinite;
    margin-left: 4px;
    vertical-align: middle;
}
.${NS}-mini-task-dot[hidden] { display: none; }
`;
