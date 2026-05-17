// Tab strip — three tabs (Capture / Export / Settings). Sits between the
// header and the body. Uses a sliding underline indicator on the active tab
// to mirror the spring motion of the dock-in animation.

import { NS } from '../../../bootstrap/config';

export const TABS_CSS = `
.${NS}-tabbar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 6px 8px 0 8px;
    background: var(--${NS}-E4-bg);
    border-bottom: 1px solid var(--${NS}-E2-border);
    position: relative; z-index: 1;
}
.${NS}-tab-btn {
    position: relative;
    padding: 8px 4px;
    background: transparent;
    border: none;
    color: var(--${NS}-tab-rest);
    font: 600 var(--${NS}-fs-sm)/1 var(--${NS}-font);
    cursor: pointer;
    letter-spacing: 0.1px;
    transition: color 0.18s ease;
    outline: none;
    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
}
.${NS}-tab-btn svg {
    width: 13px; height: 13px;
    opacity: 0.75;
    transition: opacity 0.18s ease;
}
.${NS}-tab-btn:hover { color: var(--${NS}-tab-active); }
.${NS}-tab-btn:hover svg { opacity: 1; }
.${NS}-tab-btn[aria-selected="true"] {
    color: var(--${NS}-tab-active);
}
.${NS}-tab-btn[aria-selected="true"] svg { opacity: 1; }
.${NS}-tab-btn[aria-selected="true"]::after {
    content: "";
    position: absolute;
    left: 12%; right: 12%; bottom: -1px;
    height: 2px;
    background: var(--${NS}-tab-indicator);
    border-radius: 2px 2px 0 0;
}
.${NS}-tab-btn:focus-visible {
    box-shadow: var(--${NS}-focus-ring);
    border-radius: var(--${NS}-radius-sm);
}

.${NS}-tabpanel {
    display: none;
    flex-direction: column;
    gap: 10px;
    animation: ${NS}-tabFade 0.22s var(--${NS}-ease-out);
}
.${NS}-tabpanel.${NS}-tabpanel-active {
    display: flex;
}

/* Group within a tab panel (e.g. section title + content) */
.${NS}-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.${NS}-group-title {
    font-size: var(--${NS}-fs-xs);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--${NS}-text-muted);
    letter-spacing: 0.6px;
    margin: 2px 0;
}
`;
