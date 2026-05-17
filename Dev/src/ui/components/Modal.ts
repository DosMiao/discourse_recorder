// Modal factory — a glass dialog with header, body, and footer slots.
// The dock has its own embedded settings tab now; this modal is reserved for
// future flows (confirmation dialogs, advanced export wizards, etc.).

import { NS, ROOT_ID } from '../../bootstrap/config';
import { h } from '../../utils/dom';
import { IconManager } from './IconManager';

export interface ModalConfig {
    title: string;
    body: HTMLElement | DocumentFragment;
    footer?: HTMLElement | DocumentFragment;
    onClose?: () => void;
    ariaLabel?: string;
}

export interface ModalHandle {
    overlay: HTMLDivElement;
    modal: HTMLDivElement;
    close(): void;
}

export function createModal(config: ModalConfig): ModalHandle {
    const overlay = h('div', {
        class: `${NS}-modal-overlay`,
    }) as HTMLDivElement;

    const titleId = `${NS}-modal-title-${Math.random().toString(36).slice(2, 8)}`;
    const closeBtn = h('button', {
        class: `${NS}-icon-btn`,
        type: 'button',
        'aria-label': 'close',
        html: IconManager.flexible('close'),
    }) as HTMLButtonElement;

    const header = h('div', { class: `${NS}-modal-header` }, [
        h('h2', {
            class: `${NS}-modal-title`,
            id: titleId,
            text: config.title,
        }),
        closeBtn,
    ]);

    const body = h('div', { class: `${NS}-modal-body` });
    body.appendChild(config.body);

    const children: Element[] = [header, body];
    if (config.footer) {
        const footer = h('div', { class: `${NS}-modal-footer` });
        footer.appendChild(config.footer);
        children.push(footer);
    }

    const modal = h(
        'div',
        {
            class: `${NS}-modal`,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': titleId,
            'aria-label': config.ariaLabel,
        },
        children
    ) as HTMLDivElement;

    overlay.appendChild(modal);

    let onKey: ((e: KeyboardEvent) => void) | null = null;

    function close(): void {
        overlay.classList.remove(`${NS}-show`);
        if (onKey) {
            document.removeEventListener('keydown', onKey);
            onKey = null;
        }
        setTimeout(() => overlay.remove(), 250);
        config.onClose?.();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    const root = document.getElementById(ROOT_ID) ?? document.body;
    root.appendChild(overlay);
    // Force layout, then show — same trick as the toast transition.
    overlay.getBoundingClientRect();
    overlay.classList.add(`${NS}-show`);

    return { overlay, modal, close };
}
