// Toggle switch — accessible button with role="switch" and aria-checked.
// The visual thumb is rendered via the ::after pseudo-element in controls.ts.

import { NS } from '../../bootstrap/config';
import { h } from '../../utils/dom';

export interface SwitchConfig {
    checked: boolean;
    onChange: (next: boolean) => void;
    ariaLabel?: string;
}

export interface SwitchHandle {
    element: HTMLButtonElement;
    set(checked: boolean): void;
    get(): boolean;
}

export function createSwitch(config: SwitchConfig): SwitchHandle {
    const button = h('button', {
        class: `${NS}-switch`,
        type: 'button',
        role: 'switch',
        'aria-checked': String(config.checked),
        'aria-label': config.ariaLabel ?? 'toggle',
        onclick: () => {
            const next = button.getAttribute('aria-checked') !== 'true';
            button.setAttribute('aria-checked', String(next));
            config.onChange(next);
        },
    }) as HTMLButtonElement;

    return {
        element: button,
        set(checked) {
            button.setAttribute('aria-checked', String(checked));
        },
        get() {
            return button.getAttribute('aria-checked') === 'true';
        },
    };
}

// Convenience helper for the common toggle-row pattern (name + description on
// the left, switch on the right).
export interface ToggleRowConfig extends SwitchConfig {
    name: string;
    description?: string;
}

export function createToggleRow(config: ToggleRowConfig): {
    element: HTMLDivElement;
    handle: SwitchHandle;
} {
    const handle = createSwitch(config);
    const labelChildren: HTMLElement[] = [
        h('div', { class: `${NS}-toggle-name`, text: config.name }),
    ];
    if (config.description) {
        labelChildren.push(
            h('div', { class: `${NS}-toggle-desc`, text: config.description })
        );
    }
    const element = h('div', { class: `${NS}-toggle-row` }, [
        h('div', { class: `${NS}-toggle-label` }, labelChildren),
        handle.element,
    ]) as HTMLDivElement;
    return { element, handle };
}
