// Bottom-center toast stack. New toasts push the older ones up (the
// container is flex-direction: column-reverse). Each toast self-dismisses
// after `duration` ms; the show/hide transition runs via the `dtr-show`
// class so we need a forced layout read before adding it (otherwise the
// initial state coalesces with the visible state and skips the transition).

import { NS, ROOT_ID } from '../core/constants';
import { h } from './dom';
import { Icons } from './icons';
import type { ToastType } from '../core/types';

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
    if (container && document.body.contains(container)) return container;
    container = h('div', { class: `${NS}-toast-container` });
    const root = document.getElementById(ROOT_ID) ?? document.body;
    root.appendChild(container);
    return container;
}

function iconKey(type: ToastType): keyof typeof Icons {
    if (type === 'success') return 'check';
    if (type === 'warning') return 'warn';
    if (type === 'error') return 'x';
    return 'info';
}

export const Toast = {
    show(message: string, type: ToastType = 'info', durationMs = 2400): HTMLDivElement {
        const c = ensureContainer();
        const toast = h(
            'div',
            { class: `${NS}-toast ${NS}-${type}`, role: 'status', 'aria-live': 'polite' },
            [
                h('span', { class: `${NS}-toast-icon`, html: Icons[iconKey(type)] }),
                h('span', { class: `${NS}-toast-text`, text: message }),
            ]
        );
        c.appendChild(toast);
        // Force layout so the transition runs from the hidden state.
        toast.getBoundingClientRect();
        toast.classList.add(`${NS}-show`);
        setTimeout(() => {
            toast.classList.remove(`${NS}-show`);
            setTimeout(() => toast.remove(), 250);
        }, durationMs);
        return toast;
    },
};
