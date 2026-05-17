// Component CSS — dock, header, stats, buttons, mode badge, toast, modal,
// segmented control, toggle switch. Surface elevation is wired through the
// token map so dark theme cascades automatically.

import { NS, THEME_CLASS, Z } from '../core/constants';

export const COMPONENTS_CSS = `
/* ── ROOT mount — invisible host providing stacking context ─── */
#${NS}-root {
    position: fixed; inset: 0; pointer-events: none;
    z-index: ${Z.dock};
    font-family: var(--${NS}-font);
    color: var(--${NS}-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
#${NS}-root > * { pointer-events: auto; }

/* ── DOCK — main floating panel (E1) ─────────────────────────── */
.${NS}-dock {
    position: fixed;
    right: 20px; bottom: 20px;
    width: 296px;
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

.${NS}-dock.${NS}-mini {
    width: auto;
    border-radius: var(--${NS}-radius-pill);
    padding: 0;
}
.${NS}-dock.${NS}-mini .${NS}-body { display: none; }
.${NS}-dock.${NS}-mini .${NS}-header {
    border-bottom: none;
    border-radius: var(--${NS}-radius-pill);
    padding: 6px 12px;
    gap: 8px;
}
.${NS}-dock.${NS}-mini .${NS}-title-text { display: none; }
.${NS}-dock.${NS}-mini .${NS}-mini-count { display: inline-flex; }
.${NS}-dock.${NS}-mini .${NS}-icon-btn:not(.${NS}-toggle-mini) { display: none; }

/* Rim lighting — mouse-tracked pseudo-element gradient (see ui/rimLighting.ts) */
.${NS}-dock::before,
.${NS}-dock::after {
    content: ""; position: absolute; inset: 0;
    border-radius: inherit; pointer-events: none; padding: 1px;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    background: linear-gradient(
        calc((135 + var(--${NS}-rim-mx, 0) * 1.2) * 1deg),
        rgba(15,30,60,0) 0%,
        rgba(15,30,60,0.04) 33%,
        rgba(15,30,60,0.10) 66%,
        rgba(15,30,60,0) 100%
    );
    transition: opacity 220ms var(--${NS}-ease-snappy);
    opacity: calc(0.5 + var(--${NS}-rim-hover, 0) * 0.3);
    mix-blend-mode: multiply;
}
.${NS}-dock::after { mix-blend-mode: overlay; opacity: calc(0.18 + var(--${NS}-rim-hover, 0) * 0.14); }

html.${THEME_CLASS} .${NS}-dock::before,
html.${THEME_CLASS} .${NS}-dock::after {
    background: linear-gradient(
        calc((135 + var(--${NS}-rim-mx, 0) * 1.2) * 1deg),
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.05) 33%,
        rgba(255,255,255,0.10) 66%,
        rgba(255,255,255,0) 100%
    );
}
html.${THEME_CLASS} .${NS}-dock::before { mix-blend-mode: screen; }
html.${THEME_CLASS} .${NS}-dock::after { mix-blend-mode: overlay; }

/* ── HEADER (drag handle) ────────────────────────────────────── */
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

/* ── STATUS DOT family ───────────────────────────────────────── */
.${NS}-status-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    background: var(--${NS}-text-muted);
    transition: background 220ms var(--${NS}-ease-snappy), box-shadow 220ms var(--${NS}-ease-snappy);
}
.${NS}-status-dot.${NS}-live {
    background: var(--${NS}-color-red);
    box-shadow: 0 0 0 3px rgba(215,49,38,0.18);
    animation: ${NS}-pulse 1.6s ease-in-out infinite;
}
html.${THEME_CLASS} .${NS}-status-dot.${NS}-live {
    box-shadow: 0 0 0 3px rgba(255,69,58,0.22);
}
.${NS}-status-dot.${NS}-paused {
    background: var(--${NS}-color-orange);
    box-shadow: 0 0 0 3px rgba(213,124,0,0.16);
}

/* ── ICON BUTTONS (header) ───────────────────────────────────── */
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

/* ── BODY ────────────────────────────────────────────────────── */
.${NS}-body {
    padding: 12px;
    display: flex; flex-direction: column; gap: 10px;
    position: relative; z-index: 1;
}

/* ── STATS row (E2) ──────────────────────────────────────────── */
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

/* ── MODE row (E4 chip) ──────────────────────────────────────── */
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
    background: rgba(142,142,147, 0.12);
    border-color: rgba(142,142,147, 0.30);
    color: var(--${NS}-text-muted);
}

/* ── BUTTONS ─────────────────────────────────────────────────── */
.${NS}-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: var(--${NS}-radius-lg);
    border: 1px solid var(--${NS}-E3-border);
    background: var(--${NS}-E3-bg);
    color: var(--${NS}-text-primary);
    font: 600 var(--${NS}-fs-md)/1.2 var(--${NS}-font);
    cursor: pointer;
    transition: transform 0.15s var(--${NS}-ease-bounce), background 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
    box-shadow: var(--${NS}-E3-shadow);
    outline: none; min-width: 0;
}
.${NS}-btn:hover:not(:disabled) {
    background: var(--${NS}-E3-bg-hover);
    transform: translateY(-1px);
}
.${NS}-btn:active:not(:disabled) { transform: translateY(0); }
.${NS}-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.${NS}-btn:focus-visible { box-shadow: var(--${NS}-focus-ring); }
.${NS}-btn svg { width: 14px; height: 14px; flex-shrink: 0; }

.${NS}-btn-primary {
    background: var(--${NS}-accent-gradient);
    color: var(--${NS}-text-on-accent);
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(var(--${NS}-color-blue-rgb), 0.30), inset 0 1px 0 rgba(255,255,255,0.25);
}
.${NS}-btn-primary:hover:not(:disabled) {
    background: var(--${NS}-accent-gradient);
    box-shadow: 0 6px 16px rgba(var(--${NS}-color-blue-rgb), 0.36), inset 0 1px 0 rgba(255,255,255,0.30);
}
.${NS}-btn-danger {
    background: var(--${NS}-stop-gradient);
    color: var(--${NS}-text-on-accent);
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(215,49,38,0.26), inset 0 1px 0 rgba(255,255,255,0.20);
}
.${NS}-btn-danger:hover:not(:disabled) {
    background: var(--${NS}-stop-gradient);
    box-shadow: 0 6px 16px rgba(215,49,38,0.32), inset 0 1px 0 rgba(255,255,255,0.25);
}
.${NS}-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.${NS}-btn-full { width: 100%; }

/* ── FOOTER ─────────────────────────────────────────────────── */
.${NS}-footer {
    display: flex; align-items: center; justify-content: space-between;
    font-size: var(--${NS}-fs-xs);
    color: var(--${NS}-text-muted);
    padding-top: 4px;
}
.${NS}-footer-elapsed { font-variant-numeric: tabular-nums; }

/* ── TOAST stack (bottom-center) ─────────────────────────────── */
.${NS}-toast-container {
    position: fixed; bottom: 24px; left: 50%;
    transform: translateX(-50%);
    z-index: ${Z.toast};
    display: flex; flex-direction: column-reverse; gap: 8px;
    pointer-events: none;
}
.${NS}-toast {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 14px 9px 12px;
    border-radius: var(--${NS}-radius-pill);
    background: var(--${NS}-E1-bg);
    -webkit-backdrop-filter: blur(var(--${NS}-E1-blur)) saturate(var(--${NS}-E1-saturate));
    backdrop-filter: blur(var(--${NS}-E1-blur)) saturate(var(--${NS}-E1-saturate));
    border: 1px solid var(--${NS}-E1-border);
    box-shadow: var(--${NS}-E1-shadow), var(--${NS}-E1-edge);
    color: var(--${NS}-text-primary);
    font: 500 var(--${NS}-fs-md)/1.2 var(--${NS}-font);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.22s var(--${NS}-ease-snappy), transform 0.22s var(--${NS}-ease-snappy);
    pointer-events: auto;
    max-width: 380px;
}
.${NS}-toast.${NS}-show { opacity: 1; transform: translateY(0); }
.${NS}-toast-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
}
.${NS}-toast.${NS}-success .${NS}-toast-icon { background: var(--${NS}-color-green); color: white; }
.${NS}-toast.${NS}-warning .${NS}-toast-icon { background: var(--${NS}-color-orange); color: white; }
.${NS}-toast.${NS}-error   .${NS}-toast-icon { background: var(--${NS}-color-red); color: white; }
.${NS}-toast.${NS}-info    .${NS}-toast-icon { background: var(--${NS}-color-blue); color: white; }
.${NS}-toast-icon svg { width: 12px; height: 12px; }

/* ── MODAL (settings) ───────────────────────────────────────── */
.${NS}-modal-overlay {
    position: fixed; inset: 0;
    z-index: ${Z.modal};
    background: var(--${NS}-scrim);
    -webkit-backdrop-filter: blur(var(--${NS}-scrim-blur));
    backdrop-filter: blur(var(--${NS}-scrim-blur));
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    opacity: 0;
    transition: opacity 0.25s ease;
}
.${NS}-modal-overlay.${NS}-show { opacity: 1; }
.${NS}-modal {
    width: min(420px, 100%);
    max-height: 90vh;
    background: var(--${NS}-E1-bg);
    -webkit-backdrop-filter: blur(var(--${NS}-E1-blur)) saturate(var(--${NS}-E1-saturate)) brightness(var(--${NS}-E1-brightness));
    backdrop-filter: blur(var(--${NS}-E1-blur)) saturate(var(--${NS}-E1-saturate)) brightness(var(--${NS}-E1-brightness));
    border: 1px solid var(--${NS}-E1-border);
    border-radius: var(--${NS}-radius-glass);
    box-shadow: var(--${NS}-E1-shadow), var(--${NS}-E1-edge);
    display: flex; flex-direction: column;
    overflow: hidden;
    transform: translateY(20px) scale(0.96); opacity: 0;
    transition: transform 0.28s var(--${NS}-ease-out), opacity 0.25s ease;
}
.${NS}-modal-overlay.${NS}-show .${NS}-modal {
    transform: translateY(0) scale(1); opacity: 1;
}
.${NS}-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--${NS}-E2-border);
}
.${NS}-modal-title {
    font-size: var(--${NS}-fs-xl);
    font-weight: 600;
    color: var(--${NS}-text-primary);
    letter-spacing: -0.2px; margin: 0;
}
.${NS}-modal-body { padding: 14px 16px; overflow-y: auto; max-height: 70vh; }
.${NS}-modal-section { margin-bottom: 16px; }
.${NS}-modal-section:last-child { margin-bottom: 0; }
.${NS}-modal-section-title {
    font-size: var(--${NS}-fs-sm);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--${NS}-text-muted);
    letter-spacing: 0.6px;
    margin: 0 0 8px 0;
}

/* ── SEGMENTED control ───────────────────────────────────────── */
.${NS}-segmented {
    display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
    gap: 0; padding: 3px;
    background: var(--${NS}-E4-bg);
    border: 1px solid var(--${NS}-E4-border);
    border-radius: var(--${NS}-radius-lg);
}
.${NS}-seg-btn {
    padding: 7px 8px;
    font: 600 var(--${NS}-fs-md)/1.2 var(--${NS}-font);
    background: transparent;
    border: 1px solid transparent;
    border-radius: calc(var(--${NS}-radius-lg) - 3px);
    color: var(--${NS}-text-secondary);
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
}
.${NS}-seg-btn[aria-pressed="true"] {
    background: var(--${NS}-E3-bg);
    color: var(--${NS}-text-primary);
    box-shadow: var(--${NS}-E3-shadow), var(--${NS}-E2-edge);
}
.${NS}-seg-btn:hover:not([aria-pressed="true"]) { color: var(--${NS}-text-primary); }
.${NS}-seg-btn svg { width: 13px; height: 13px; }

/* ── TOGGLE row + switch ────────────────────────────────────── */
.${NS}-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--${NS}-E2-border);
}
.${NS}-toggle-row:last-child { border-bottom: none; }
.${NS}-toggle-label { flex: 1; min-width: 0; }
.${NS}-toggle-name {
    font-size: var(--${NS}-fs-md);
    font-weight: 500;
    color: var(--${NS}-text-primary);
}
.${NS}-toggle-desc {
    font-size: var(--${NS}-fs-sm);
    color: var(--${NS}-text-muted);
    margin-top: 2px;
}
.${NS}-switch {
    position: relative; width: 38px; height: 22px;
    background: rgba(120,120,128, 0.20);
    border-radius: var(--${NS}-radius-pill);
    cursor: pointer;
    transition: background 0.22s var(--${NS}-ease-snappy);
    flex-shrink: 0;
    border: none;
}
.${NS}-switch::after {
    content: ""; position: absolute;
    top: 2px; left: 2px;
    width: 18px; height: 18px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 0.22s var(--${NS}-ease-snappy);
}
.${NS}-switch[aria-checked="true"] { background: var(--${NS}-color-blue); }
.${NS}-switch[aria-checked="true"]::after { transform: translateX(16px); }
.${NS}-switch:focus-visible { box-shadow: var(--${NS}-focus-ring); outline: none; }

.${NS}-modal-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--${NS}-E2-border);
    display: flex; justify-content: flex-end; gap: 8px;
}
`;
