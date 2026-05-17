// Theme controller. Three modes:
//   - 'light' / 'dark'  → explicit user choice
//   - 'system'          → follow prefers-color-scheme, re-applied on OS change
//
// The dark theme is opted into by toggling `html.dtr-theme-dark`, against
// which all dark token overrides cascade (see styles/tokens.ts).
//
// Transitions: when the user toggles a theme, we add a transient
// `html.dtr-theme-transitioning` class for ~320ms that opts every dtr-*
// element into a coordinated color/background fade — without making the
// host page animate. The boot path uses { skipTransition: true } so the
// first paint doesn't flicker.

import {
    STORAGE_KEYS,
    THEME_CLASS,
    THEME_TRANSITION_MS,
    THEME_TRANSITIONING_CLASS,
} from '../core/constants';
import { Storage } from '../core/storage';
import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import type { ThemeMode } from '../core/types';

function resolved(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'dark' || mode === 'light') return mode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(mode: ThemeMode, options: { skipTransition?: boolean } = {}): void {
    const root = document.documentElement;
    const effective = resolved(mode);
    const isDark = effective === 'dark';
    const willChange = isDark !== root.classList.contains(THEME_CLASS);
    const animate = willChange && !options.skipTransition;

    if (animate) root.classList.add(THEME_TRANSITIONING_CLASS);
    root.classList.toggle(THEME_CLASS, isDark);
    if (animate) {
        window.setTimeout(
            () => root.classList.remove(THEME_TRANSITIONING_CLASS),
            THEME_TRANSITION_MS
        );
    }
    Bus.emit('theme:applied', { mode, effective });
}

function set(mode: ThemeMode, options: { skipTransition?: boolean } = {}): void {
    Store.patch({ theme: mode });
    Storage.set(STORAGE_KEYS.theme, mode);
    apply(mode, options);
}

function init(): void {
    apply(Store.get('theme'), { skipTransition: true });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
        if (Store.get('theme') === 'system') apply('system');
    });
}

export const Theme = { apply, set, init, resolved };
