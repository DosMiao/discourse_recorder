// Segmented control — radio-group rendered as a row of pill buttons sharing
// a single rounded container. One option is "pressed" at any time.

import { NS } from '../../bootstrap/config';
import { h } from '../../utils/dom';
import { IconManager, type IconName } from './IconManager';

export interface SegmentedOption<V extends string> {
    value: V;
    label: string;
    icon?: IconName;
    ariaLabel?: string;
}

export interface SegmentedConfig<V extends string> {
    options: SegmentedOption<V>[];
    value: V;
    onChange: (next: V) => void;
    ariaLabel?: string;
}

export interface SegmentedHandle<V extends string> {
    element: HTMLDivElement;
    set(value: V): void;
    get(): V;
}

export function createSegmented<V extends string>(
    config: SegmentedConfig<V>
): SegmentedHandle<V> {
    let current = config.value;

    function makeButton(opt: SegmentedOption<V>): HTMLButtonElement {
        const pressed = opt.value === current;
        const inner = opt.icon ? `${IconManager.flexible(opt.icon)}<span>${escapeHtml(opt.label)}</span>` : escapeHtml(opt.label);
        return h('button', {
            class: `${NS}-seg-btn`,
            type: 'button',
            role: 'radio',
            'data-value': opt.value,
            'aria-checked': String(pressed),
            'aria-pressed': String(pressed),
            'aria-label': opt.ariaLabel ?? opt.label,
            html: inner,
            onclick: () => {
                if (current === opt.value) return;
                set(opt.value);
                config.onChange(opt.value);
            },
        }) as HTMLButtonElement;
    }

    function applyPressed(): void {
        const buttons = element.querySelectorAll<HTMLButtonElement>(`.${NS}-seg-btn`);
        buttons.forEach((b) => {
            const v = b.dataset.value === current;
            b.setAttribute('aria-pressed', String(v));
            b.setAttribute('aria-checked', String(v));
        });
    }

    function set(value: V): void {
        if (value === current) return;
        current = value;
        applyPressed();
    }

    const element = h(
        'div',
        {
            class: `${NS}-segmented`,
            role: 'radiogroup',
            'aria-label': config.ariaLabel ?? 'group',
        },
        config.options.map(makeButton)
    ) as HTMLDivElement;

    return {
        element,
        set,
        get: () => current,
    };
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
