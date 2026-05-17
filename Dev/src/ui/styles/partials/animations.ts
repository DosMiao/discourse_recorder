// Keyframes + theme-fade overrides + reduced-motion fallbacks. Kept separate
// from component definitions so future motion tweaks (or a hostile prefers-
// reduced-motion override) doesn't touch component CSS.

import { NS } from '../../../bootstrap/config';

export const ANIMATIONS_CSS = `
@keyframes ${NS}-dockIn {
    from { transform: translateY(16px) scale(0.96); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes ${NS}-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.25); opacity: 0.65; }
}

@keyframes ${NS}-tabFade {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* Theme switch — fade everything inside the dtr root for 300ms when
   .dtr-theme-transitioning is on <html>. Host page is untouched. */
html.${NS}-theme-transitioning #${NS}-root,
html.${NS}-theme-transitioning #${NS}-root *,
html.${NS}-theme-transitioning #${NS}-root *::before,
html.${NS}-theme-transitioning #${NS}-root *::after {
    transition:
        background-color 0.3s ease,
        background 0.3s ease,
        color 0.3s ease,
        border-color 0.3s ease,
        box-shadow 0.3s ease !important;
}

/* Reduced-motion: kill animations that aren't critical for affordance. */
@media (prefers-reduced-motion: reduce) {
    .${NS}-dock,
    .${NS}-toast,
    .${NS}-modal,
    .${NS}-btn,
    .${NS}-tabpanel,
    .${NS}-status-dot.${NS}-live {
        animation: none !important;
        transition: none !important;
    }
}
`;
