// Buttons — base plate, primary (accent), danger (stop). Single-row vs
// half-width layouts via `.dtr-btn-row` and `.dtr-btn-full`.

import { NS } from '../../../bootstrap/config';

export const BUTTONS_CSS = `
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
    box-shadow: var(--${NS}-btn-primary-shadow), var(--${NS}-btn-primary-edge);
}
.${NS}-btn-primary:hover:not(:disabled) {
    background: var(--${NS}-accent-gradient);
    box-shadow: var(--${NS}-btn-primary-shadow-hover), var(--${NS}-btn-primary-edge-hover);
}

.${NS}-btn-danger {
    background: var(--${NS}-stop-gradient);
    color: var(--${NS}-text-on-accent);
    border-color: transparent;
    box-shadow: var(--${NS}-btn-danger-shadow), var(--${NS}-btn-danger-edge);
}
.${NS}-btn-danger:hover:not(:disabled) {
    background: var(--${NS}-stop-gradient);
    box-shadow: var(--${NS}-btn-danger-shadow-hover), var(--${NS}-btn-danger-edge-hover);
}

.${NS}-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.${NS}-btn-full { width: 100%; }
`;
