// Button factory. Returns the HTMLButtonElement plus a small object of
// imperatives (`setLabel`, `setDisabled`, etc.) so callers can update one
// without re-rendering the whole tree.

import { NS } from '../../bootstrap/config';
import { h } from '../../utils/dom';
import { IconManager, type IconName } from './IconManager';

export type ButtonVariant = 'default' | 'primary' | 'danger';

export interface ButtonConfig {
    label: string;
    icon?: IconName;
    variant?: ButtonVariant;
    fullWidth?: boolean;
    onClick: (e: MouseEvent) => void;
    ariaLabel?: string;
    title?: string;
    disabled?: boolean;
}

export interface ButtonHandle {
    element: HTMLButtonElement;
    setLabel(label: string): void;
    setIcon(icon: IconName | null): void;
    setDisabled(disabled: boolean): void;
}

function classFor(variant: ButtonVariant, fullWidth?: boolean): string {
    const parts = [`${NS}-btn`];
    if (variant === 'primary') parts.push(`${NS}-btn-primary`);
    if (variant === 'danger') parts.push(`${NS}-btn-danger`);
    if (fullWidth) parts.push(`${NS}-btn-full`);
    return parts.join(' ');
}

function renderBody(label: string, icon?: IconName | null): string {
    const iconHtml = icon ? IconManager.flexible(icon) : '';
    // Wrap label in a span so callers can set textContent on a specific node
    // and skip re-parsing the icon.
    return `${iconHtml}<span class="${NS}-btn-label">${escapeHtml(label)}</span>`;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function createButton(config: ButtonConfig): ButtonHandle {
    const variant = config.variant ?? 'default';
    let currentIcon: IconName | null = config.icon ?? null;
    let currentLabel = config.label;

    const button = h('button', {
        class: classFor(variant, config.fullWidth),
        type: 'button',
        title: config.title ?? config.label,
        'aria-label': config.ariaLabel ?? config.label,
        html: renderBody(currentLabel, currentIcon),
        disabled: config.disabled ? 'true' : false,
        onclick: config.onClick,
    }) as HTMLButtonElement;

    if (config.disabled) button.disabled = true;

    const labelSpan = button.querySelector(`.${NS}-btn-label`) as HTMLSpanElement | null;

    return {
        element: button,
        setLabel(label) {
            if (label === currentLabel) return;
            currentLabel = label;
            if (labelSpan) labelSpan.textContent = label;
            else button.innerHTML = renderBody(label, currentIcon);
        },
        setIcon(icon) {
            if (icon === currentIcon) return;
            currentIcon = icon;
            button.innerHTML = renderBody(currentLabel, currentIcon);
        },
        setDisabled(disabled) {
            button.disabled = disabled;
        },
    };
}
