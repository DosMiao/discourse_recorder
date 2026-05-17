// Form controls — segmented picker, toggle switch, and the toggle-row that
// pairs a name+description with a switch on the right.

import { NS } from '../../../bootstrap/config';

export const CONTROLS_CSS = `
/* SEGMENTED control */
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
.${NS}-seg-btn:focus-visible {
    outline: none;
    box-shadow: var(--${NS}-focus-ring);
}
.${NS}-seg-btn svg { width: 13px; height: 13px; }

/* Strategy / format option list (radio-card style) */
.${NS}-option-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.${NS}-option-card {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    background: var(--${NS}-E4-bg);
    border: 1px solid var(--${NS}-E4-border);
    border-radius: var(--${NS}-radius-md);
    cursor: pointer;
    text-align: left;
    color: var(--${NS}-text-primary);
    font: 500 var(--${NS}-fs-md)/1.3 var(--${NS}-font);
    transition: background 0.18s ease, border-color 0.18s ease;
}
.${NS}-option-card:hover {
    background: var(--${NS}-E3-bg-hover);
}
.${NS}-option-card[aria-pressed="true"] {
    background: var(--${NS}-info-soft);
    border-color: var(--${NS}-info-border);
}
.${NS}-option-card-text {
    flex: 1;
    min-width: 0;
}
.${NS}-option-card-name {
    font-weight: 600;
}
.${NS}-option-card-desc {
    margin-top: 2px;
    font-size: var(--${NS}-fs-sm);
    color: var(--${NS}-text-muted);
}
.${NS}-option-card-radio {
    margin-top: 3px;
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1.5px solid var(--${NS}-text-muted);
    flex-shrink: 0;
    position: relative;
    transition: border-color 0.18s ease;
}
.${NS}-option-card[aria-pressed="true"] .${NS}-option-card-radio {
    border-color: var(--${NS}-color-blue);
}
.${NS}-option-card[aria-pressed="true"] .${NS}-option-card-radio::after {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: var(--${NS}-color-blue);
}

/* TOGGLE row + switch */
.${NS}-toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
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
    line-height: 1.35;
}
.${NS}-switch {
    position: relative; width: 38px; height: 22px;
    background: var(--${NS}-switch-track);
    border-radius: var(--${NS}-radius-pill);
    cursor: pointer;
    transition: background 0.22s var(--${NS}-ease-snappy);
    flex-shrink: 0;
    border: none;
    padding: 0;
}
.${NS}-switch::after {
    content: ""; position: absolute;
    top: 2px; left: 2px;
    width: 18px; height: 18px;
    background: var(--${NS}-switch-thumb);
    border-radius: 50%;
    box-shadow: var(--${NS}-switch-thumb-shadow);
    transition: transform 0.22s var(--${NS}-ease-snappy);
}
.${NS}-switch[aria-checked="true"] { background: var(--${NS}-switch-track-on); }
.${NS}-switch[aria-checked="true"]::after { transform: translateX(16px); }
.${NS}-switch:focus-visible { box-shadow: var(--${NS}-focus-ring); outline: none; }
`;
