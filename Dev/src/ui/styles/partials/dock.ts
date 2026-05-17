// Dock layout — the floating panel that hosts the tabbed UI. Animation
// (slide-in on mount), drag handle (header), minimize/expand states, status
// dot family, header icon buttons, and body padding all live here.

import { NS } from '../../../bootstrap/config';

export const DOCK_CSS = `
.${NS}-dock {
    position: fixed;
    right: 20px; bottom: 20px;
    width: 312px;
    border-radius: var(--${NS}-radius-glass);
    background: var(--${NS}-E1-bg);
    -webkit-backdrop-filter: blur(var(--${NS}-E1-blur)) saturate(var(--${NS}-E1-saturate)) brightness(var(--${NS}-E1-brightness));
    backdrop-filter: blur(var(--${NS}-E1-blur)) saturate(var(--${NS}-E1-saturate)) brightness(var(--${NS}-E1-brightness));
    border: 1px solid var(--${NS}-E1-border);
    box-shadow: var(--${NS}-E1-shadow), var(--${NS}-E1-edge);
    font-size: var(--${NS}-fs-md);
    color: var(--${NS}-text-primary);
    overflow: hidden;
    will-change: transform;
    animation: ${NS}-dockIn 0.42s var(--${NS}-ease-out) both;
}

/* Minimised mode — collapse to a pill with just the title chrome. */
.${NS}-dock.${NS}-mini {
    width: auto;
    border-radius: var(--${NS}-radius-pill);
    padding: 0;
}
.${NS}-dock.${NS}-mini .${NS}-body { display: none; }
.${NS}-dock.${NS}-mini .${NS}-tabbar { display: none; }
.${NS}-dock.${NS}-mini .${NS}-header {
    border-bottom: none;
    border-radius: var(--${NS}-radius-pill);
    padding: 6px 12px;
    gap: 8px;
}
.${NS}-dock.${NS}-mini .${NS}-title-text { display: none; }
.${NS}-dock.${NS}-mini .${NS}-mini-count { display: inline-flex; }
.${NS}-dock.${NS}-mini .${NS}-icon-btn:not(.${NS}-toggle-mini) { display: none; }

/* HEADER — drag handle */
.${NS}-header {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--${NS}-E2-border);
    cursor: move; user-select: none;
    position: relative; z-index: 1;
}
.${NS}-title {
    display: flex; align-items: center; gap: 8px;
    flex: 1; min-width: 0;
}
.${NS}-title-text {
    font-size: var(--${NS}-fs-md);
    font-weight: 600; letter-spacing: -0.1px;
    color: var(--${NS}-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.${NS}-mini-count {
    display: none;
    align-items: center; gap: 6px;
    font-size: var(--${NS}-fs-sm); font-weight: 600;
    color: var(--${NS}-text-primary);
    font-variant-numeric: tabular-nums;
}

/* STATUS DOT family */
.${NS}-status-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    background: var(--${NS}-text-muted);
    transition: background 220ms var(--${NS}-ease-snappy), box-shadow 220ms var(--${NS}-ease-snappy);
}
.${NS}-status-dot.${NS}-live {
    background: var(--${NS}-color-red);
    box-shadow: 0 0 0 3px var(--${NS}-status-live-glow);
    animation: ${NS}-pulse 1.6s ease-in-out infinite;
}
.${NS}-status-dot.${NS}-paused {
    background: var(--${NS}-color-orange);
    box-shadow: 0 0 0 3px var(--${NS}-status-paused-glow);
}

/* HEADER icon buttons */
.${NS}-header-actions {
    display: flex; gap: 4px; flex-shrink: 0;
}
.${NS}-icon-btn {
    width: 26px; height: 26px;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--${NS}-radius-md);
    color: var(--${NS}-text-secondary);
    cursor: pointer; padding: 0;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.${NS}-icon-btn:hover {
    background: var(--${NS}-E3-bg-hover);
    border-color: var(--${NS}-E3-border);
    color: var(--${NS}-text-primary);
}
.${NS}-icon-btn:focus-visible {
    outline: none; box-shadow: var(--${NS}-focus-ring);
}
.${NS}-icon-btn svg { width: 14px; height: 14px; }

/* BODY */
.${NS}-body {
    padding: 12px;
    display: flex; flex-direction: column; gap: 10px;
    position: relative; z-index: 1;
}

/* FOOTER */
.${NS}-footer {
    display: flex; align-items: center; justify-content: space-between;
    font-size: var(--${NS}-fs-xs);
    color: var(--${NS}-text-muted);
    padding-top: 4px;
}
.${NS}-footer-elapsed { font-variant-numeric: tabular-nums; }

/* STATS row (E2 panel) */
.${NS}-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 10px;
    background: var(--${NS}-E2-bg);
    border: 1px solid var(--${NS}-E2-border);
    border-radius: var(--${NS}-radius-lg);
    box-shadow: var(--${NS}-E2-shadow), var(--${NS}-E2-edge);
}
.${NS}-stat { text-align: center; padding: 4px 2px; min-width: 0; }
.${NS}-stat-value {
    font-size: var(--${NS}-fs-xl);
    font-weight: 700;
    color: var(--${NS}-text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.3px; line-height: 1.1;
}
.${NS}-stat-label {
    font-size: var(--${NS}-fs-xs);
    color: var(--${NS}-text-muted);
    margin-top: 2px;
    text-transform: uppercase; letter-spacing: 0.4px;
}

/* MODE row (E4 chip) */
.${NS}-mode-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 6px 10px;
    background: var(--${NS}-E4-bg);
    border: 1px solid var(--${NS}-E4-border);
    border-radius: var(--${NS}-radius-md);
    font-size: var(--${NS}-fs-sm);
    color: var(--${NS}-text-secondary);
}
.${NS}-mode-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: var(--${NS}-radius-pill);
    background: var(--${NS}-info-soft);
    border: 1px solid var(--${NS}-info-border);
    color: var(--${NS}-color-blue);
    font-weight: 600; font-size: var(--${NS}-fs-xs);
    letter-spacing: 0.2px;
}
.${NS}-mode-badge.${NS}-generic {
    background: var(--${NS}-neutral-soft);
    border-color: var(--${NS}-neutral-border);
    color: var(--${NS}-text-muted);
}
`;
