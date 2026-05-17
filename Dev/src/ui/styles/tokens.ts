// Design tokens — the three-tier system (primitives → semantic → component-
// scoped) mirrors the AmexOfferMax token file. Light values live on :root;
// the `html.dtr-theme-dark` block overrides only what differs in dark mode.
//
// Naming: every custom property is prefixed `--dtr-*` to keep us isolated
// from whatever the host page defines. Surfaces are graded E1 (floating
// glass) → E2 (panel) → E3 (interactive plate) → E4 (chip / input).

import { NS, THEME_CLASS } from '../../bootstrap/config';

export const TOKENS_CSS = `
:root {
    /* ── TIER 1: Primitives ───────────────────────────────── */
    --${NS}-color-blue: #007AFF;
    --${NS}-color-blue-rgb: 0, 122, 255;
    --${NS}-color-green: #28a745;
    --${NS}-color-green-rgb: 40, 167, 69;
    --${NS}-color-orange: #d57c00;
    --${NS}-color-orange-rgb: 213, 124, 0;
    --${NS}-color-red: #d73126;
    --${NS}-color-red-rgb: 215, 49, 38;
    --${NS}-color-gray: #8E8E93;
    --${NS}-color-gray-rgb: 142, 142, 147;

    --${NS}-radius-xs: 4px;
    --${NS}-radius-sm: 6px;
    --${NS}-radius-md: 8px;
    --${NS}-radius-lg: 10px;
    --${NS}-radius-xl: 12px;
    --${NS}-radius-glass: 14px;
    --${NS}-radius-pill: 999px;

    --${NS}-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --${NS}-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
    --${NS}-fs-xs: 10.5px;
    --${NS}-fs-sm: 11.5px;
    --${NS}-fs-md: 12.5px;
    --${NS}-fs-lg: 13.5px;
    --${NS}-fs-xl: 15px;

    --${NS}-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --${NS}-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --${NS}-ease-snappy: cubic-bezier(0.16, 1, 0.3, 1);

    --${NS}-shadow-sm: 0 2px 6px rgba(0,0,0,0.06);
    --${NS}-shadow-md: 0 5px 16px rgba(0,0,0,0.10);
    --${NS}-shadow-lg: 0 12px 32px rgba(0,0,0,0.14);
    --${NS}-shadow-xl: 0 18px 48px rgba(0,0,0,0.20);

    /* ── TIER 2: Semantic ─────────────────────────────────── */
    --${NS}-text-primary: #1c1c1e;
    --${NS}-text-secondary: #3a3a3c;
    --${NS}-text-muted: #8E8E93;
    --${NS}-text-on-accent: #ffffff;

    /* E1 — floating container (dock / modal) */
    --${NS}-E1-bg: linear-gradient(135deg, rgba(252,252,254,0.78), rgba(244,246,251,0.66));
    --${NS}-E1-border: rgba(0,0,0,0.10);
    --${NS}-E1-shadow: 0 18px 48px rgba(15,30,60,0.18), 0 4px 12px rgba(15,30,60,0.08);
    --${NS}-E1-edge: inset 0 1px 0 rgba(255,255,255,0.85);
    --${NS}-E1-blur: 18px;
    --${NS}-E1-saturate: 165%;
    --${NS}-E1-brightness: 1.04;

    /* E2 — panel / card inside dock */
    --${NS}-E2-bg: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(248,249,253,0.40));
    --${NS}-E2-border: rgba(0,0,0,0.08);
    --${NS}-E2-shadow: 0 2px 6px rgba(15,30,60,0.06);
    --${NS}-E2-edge: inset 0 1px 0 rgba(255,255,255,0.70);

    /* E3 — interactive plate (button rest) */
    --${NS}-E3-bg: rgba(255,255,255,0.72);
    --${NS}-E3-bg-hover: rgba(255,255,255,0.92);
    --${NS}-E3-border: rgba(0,0,0,0.08);
    --${NS}-E3-shadow: 0 1px 2px rgba(15,30,60,0.05);

    /* E4 — chip / status pill */
    --${NS}-E4-bg: rgba(0,0,0,0.04);
    --${NS}-E4-border: rgba(0,0,0,0.06);

    /* Color intents (background-soft / border-stronger) */
    --${NS}-info-soft: rgba(var(--${NS}-color-blue-rgb), 0.10);
    --${NS}-info-border: rgba(var(--${NS}-color-blue-rgb), 0.25);
    --${NS}-success-soft: rgba(var(--${NS}-color-green-rgb), 0.12);
    --${NS}-success-border: rgba(var(--${NS}-color-green-rgb), 0.30);
    --${NS}-warning-soft: rgba(var(--${NS}-color-orange-rgb), 0.12);
    --${NS}-warning-border: rgba(var(--${NS}-color-orange-rgb), 0.30);
    --${NS}-danger-soft: rgba(var(--${NS}-color-red-rgb), 0.12);
    --${NS}-danger-border: rgba(var(--${NS}-color-red-rgb), 0.30);
    --${NS}-neutral-soft: rgba(var(--${NS}-color-gray-rgb), 0.12);
    --${NS}-neutral-border: rgba(var(--${NS}-color-gray-rgb), 0.30);

    --${NS}-accent-gradient: linear-gradient(135deg, rgba(var(--${NS}-color-blue-rgb), 0.95), rgba(10,132,255, 0.78));
    --${NS}-stop-gradient: linear-gradient(135deg, rgba(var(--${NS}-color-red-rgb), 0.92), rgba(180,35,28, 0.78));

    /* Component-level — status dots */
    --${NS}-status-live-glow: rgba(var(--${NS}-color-red-rgb), 0.18);
    --${NS}-status-paused-glow: rgba(var(--${NS}-color-orange-rgb), 0.16);

    /* Component-level — switch */
    --${NS}-switch-track: rgba(var(--${NS}-color-gray-rgb), 0.20);
    --${NS}-switch-track-on: var(--${NS}-color-blue);
    --${NS}-switch-thumb: #ffffff;
    --${NS}-switch-thumb-shadow: 0 1px 3px rgba(0,0,0,0.2);

    /* Component-level — primary button highlight (top edge sheen) */
    --${NS}-btn-primary-edge: inset 0 1px 0 rgba(255,255,255,0.25);
    --${NS}-btn-primary-edge-hover: inset 0 1px 0 rgba(255,255,255,0.30);
    --${NS}-btn-primary-shadow: 0 4px 12px rgba(var(--${NS}-color-blue-rgb), 0.30);
    --${NS}-btn-primary-shadow-hover: 0 6px 16px rgba(var(--${NS}-color-blue-rgb), 0.36);
    --${NS}-btn-danger-edge: inset 0 1px 0 rgba(255,255,255,0.20);
    --${NS}-btn-danger-edge-hover: inset 0 1px 0 rgba(255,255,255,0.25);
    --${NS}-btn-danger-shadow: 0 4px 12px rgba(var(--${NS}-color-red-rgb), 0.26);
    --${NS}-btn-danger-shadow-hover: 0 6px 16px rgba(var(--${NS}-color-red-rgb), 0.32);

    /* Component-level — rim lighting (dock outer bevel) */
    --${NS}-rim-color-1: rgba(15,30,60,0);
    --${NS}-rim-color-2: rgba(15,30,60,0.04);
    --${NS}-rim-color-3: rgba(15,30,60,0.10);
    --${NS}-rim-blend-1: multiply;
    --${NS}-rim-blend-2: overlay;

    /* Tab strip */
    --${NS}-tab-rest: var(--${NS}-text-secondary);
    --${NS}-tab-active: var(--${NS}-text-primary);
    --${NS}-tab-active-bg: var(--${NS}-E3-bg);
    --${NS}-tab-indicator: var(--${NS}-color-blue);

    --${NS}-focus-ring: 0 0 0 3px rgba(var(--${NS}-color-blue-rgb), 0.25);

    /* Scrim (modal overlay backdrop) */
    --${NS}-scrim: rgba(15,20,30, 0.42);
    --${NS}-scrim-blur: 4px;
}

/* ── DARK theme — overrides only the deltas ─────────────────── */
html.${THEME_CLASS} {
    --${NS}-color-blue: #0A84FF;
    --${NS}-color-blue-rgb: 10, 132, 255;
    --${NS}-color-green: #34C759;
    --${NS}-color-green-rgb: 52, 199, 89;
    --${NS}-color-orange: #FF9500;
    --${NS}-color-orange-rgb: 255, 149, 0;
    --${NS}-color-red: #FF453A;
    --${NS}-color-red-rgb: 255, 69, 58;
    --${NS}-color-gray: #A2A2A7;
    --${NS}-color-gray-rgb: 162, 162, 167;

    --${NS}-text-primary: #f3f3f6;
    --${NS}-text-secondary: #d4d6dc;
    --${NS}-text-muted: #9a9aa0;
    --${NS}-text-on-accent: #ffffff;

    --${NS}-E1-bg: linear-gradient(135deg, rgba(28,30,38,0.78), rgba(18,20,28,0.66));
    --${NS}-E1-border: rgba(255,255,255,0.12);
    --${NS}-E1-shadow: 0 20px 56px rgba(0,0,0,0.55), 0 6px 16px rgba(0,0,0,0.40);
    --${NS}-E1-edge: inset 0 1px 0 rgba(255,255,255,0.08);

    --${NS}-E2-bg: linear-gradient(180deg, rgba(40,42,52,0.55), rgba(28,30,38,0.40));
    --${NS}-E2-border: rgba(255,255,255,0.10);
    --${NS}-E2-shadow: 0 4px 12px rgba(0,0,0,0.45);
    --${NS}-E2-edge: inset 0 1px 0 rgba(255,255,255,0.06);

    --${NS}-E3-bg: rgba(255,255,255,0.06);
    --${NS}-E3-bg-hover: rgba(255,255,255,0.10);
    --${NS}-E3-border: rgba(255,255,255,0.10);
    --${NS}-E3-shadow: 0 1px 2px rgba(0,0,0,0.35);

    --${NS}-E4-bg: rgba(255,255,255,0.06);
    --${NS}-E4-border: rgba(255,255,255,0.08);

    --${NS}-info-soft: rgba(var(--${NS}-color-blue-rgb), 0.18);
    --${NS}-info-border: rgba(var(--${NS}-color-blue-rgb), 0.35);
    --${NS}-success-soft: rgba(var(--${NS}-color-green-rgb), 0.18);
    --${NS}-success-border: rgba(var(--${NS}-color-green-rgb), 0.35);
    --${NS}-warning-soft: rgba(var(--${NS}-color-orange-rgb), 0.18);
    --${NS}-warning-border: rgba(var(--${NS}-color-orange-rgb), 0.35);
    --${NS}-danger-soft: rgba(var(--${NS}-color-red-rgb), 0.20);
    --${NS}-danger-border: rgba(var(--${NS}-color-red-rgb), 0.40);
    --${NS}-neutral-soft: rgba(var(--${NS}-color-gray-rgb), 0.18);
    --${NS}-neutral-border: rgba(var(--${NS}-color-gray-rgb), 0.30);

    --${NS}-accent-gradient: linear-gradient(135deg, rgba(var(--${NS}-color-blue-rgb), 0.85), rgba(0,98,204, 0.65));
    --${NS}-stop-gradient: linear-gradient(135deg, rgba(var(--${NS}-color-red-rgb), 0.82), rgba(180,40,30, 0.65));

    --${NS}-status-live-glow: rgba(var(--${NS}-color-red-rgb), 0.22);
    --${NS}-status-paused-glow: rgba(var(--${NS}-color-orange-rgb), 0.20);

    --${NS}-switch-track: rgba(255,255,255,0.16);
    --${NS}-switch-thumb: #f3f3f6;
    --${NS}-switch-thumb-shadow: 0 1px 3px rgba(0,0,0,0.45);

    --${NS}-btn-primary-edge: inset 0 1px 0 rgba(255,255,255,0.18);
    --${NS}-btn-primary-edge-hover: inset 0 1px 0 rgba(255,255,255,0.24);
    --${NS}-btn-primary-shadow: 0 4px 14px rgba(var(--${NS}-color-blue-rgb), 0.38);
    --${NS}-btn-primary-shadow-hover: 0 6px 18px rgba(var(--${NS}-color-blue-rgb), 0.45);
    --${NS}-btn-danger-edge: inset 0 1px 0 rgba(255,255,255,0.14);
    --${NS}-btn-danger-edge-hover: inset 0 1px 0 rgba(255,255,255,0.20);
    --${NS}-btn-danger-shadow: 0 4px 14px rgba(var(--${NS}-color-red-rgb), 0.36);
    --${NS}-btn-danger-shadow-hover: 0 6px 18px rgba(var(--${NS}-color-red-rgb), 0.42);

    --${NS}-rim-color-1: rgba(255,255,255,0);
    --${NS}-rim-color-2: rgba(255,255,255,0.05);
    --${NS}-rim-color-3: rgba(255,255,255,0.10);
    --${NS}-rim-blend-1: screen;
    --${NS}-rim-blend-2: overlay;

    --${NS}-scrim: rgba(0,0,0,0.62);
}
`;
