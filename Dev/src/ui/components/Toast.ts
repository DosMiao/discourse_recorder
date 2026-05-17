// Bottom-center toast stack. New toasts push the older ones up (the
// container is flex-direction: column-reverse). Each toast self-dismisses
// after `duration` ms; the show/hide transition runs via the `dtr-show`
// class so we need a forced layout read before adding it (otherwise the
// initial state coalesces with the visible state and skips the transition).

import { NS, ROOT_ID } from '../../bootstrap/config';
import { h } from '../../utils/dom';
import { IconManager, type IconName } from './IconManager';
import type { ToastType } from '../../core/types';

export interface ToastQueue {
    show(message: string, type?: ToastType, durationMs?: number): HTMLDivElement;
}

function iconKey(type: ToastType): IconName {
    if (type === 'success') return 'check';
    if (type === 'warning') return 'warn';
    if (type === 'error') return 'x';
    return 'info';
}

export function createToastQueue(): ToastQueue {
    let container: HTMLDivElement | null = null;

    function ensureContainer(): HTMLDivElement {
        if (container && document.body.contains(container)) return container;
        const next = h('div', { class: `${NS}-toast-container` }) as HTMLDivElement;
        container = next;
        const root = document.getElementById(ROOT_ID) ?? document.body;
        root.appendChild(next);
        return next;
    }

    return {
        show(message, type = 'info', durationMs = 2400) {
            const c = ensureContainer();
            const toast = h(
                'div',
                {
                    class: `${NS}-toast ${NS}-${type}`,
                    role: 'status',
                    'aria-live': 'polite',
                },
                [
                    h('span', {
                        class: `${NS}-toast-icon`,
                        html: IconManager.flexible(iconKey(type)),
                    }),
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
}

export const Toast: ToastQueue = createToastQueue();
