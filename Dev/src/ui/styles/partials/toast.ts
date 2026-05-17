// Toast stack — bottom-center column-reverse so new toasts push older ones
// up the stack rather than overlapping.

import { NS, Z } from '../../../bootstrap/config';

export const TOAST_CSS = `
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
    color: white;
}
.${NS}-toast.${NS}-success .${NS}-toast-icon { background: var(--${NS}-color-green); }
.${NS}-toast.${NS}-warning .${NS}-toast-icon { background: var(--${NS}-color-orange); }
.${NS}-toast.${NS}-error   .${NS}-toast-icon { background: var(--${NS}-color-red); }
.${NS}-toast.${NS}-info    .${NS}-toast-icon { background: var(--${NS}-color-blue); }
.${NS}-toast-icon svg { width: 12px; height: 12px; }
`;
