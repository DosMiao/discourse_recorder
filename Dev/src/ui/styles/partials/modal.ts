// Modal — used for the optional dedicated settings dialog (the dock has an
// embedded settings tab; the modal is reserved for any future heavier flows
// like exports or confirmation dialogs).

import { NS, Z } from '../../../bootstrap/config';

export const MODAL_CSS = `
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
.${NS}-modal-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--${NS}-E2-border);
    display: flex; justify-content: flex-end; gap: 8px;
}
`;
