// Liquid-glass effect — the mouse-tracked rim lighting that gives the dock
// its "depth on hover" look. Pseudo-elements read --dtr-rim-mx / -my /
// -hover written by attachRimLighting(), plus the rim-color tokens which
// flip light↔dark in tokens.ts.

import { NS } from '../../../bootstrap/config';

export const GLASS_CSS = `
.${NS}-dock::before,
.${NS}-dock::after {
    content: ""; position: absolute; inset: 0;
    border-radius: inherit; pointer-events: none; padding: 1px;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    background: linear-gradient(
        calc((135 + var(--${NS}-rim-mx, 0) * 1.2) * 1deg),
        var(--${NS}-rim-color-1) 0%,
        var(--${NS}-rim-color-2) 33%,
        var(--${NS}-rim-color-3) 66%,
        var(--${NS}-rim-color-1) 100%
    );
    transition: opacity 220ms var(--${NS}-ease-snappy);
    opacity: calc(0.5 + var(--${NS}-rim-hover, 0) * 0.3);
    mix-blend-mode: var(--${NS}-rim-blend-1);
}
.${NS}-dock::after {
    mix-blend-mode: var(--${NS}-rim-blend-2);
    opacity: calc(0.18 + var(--${NS}-rim-hover, 0) * 0.14);
}
`;
