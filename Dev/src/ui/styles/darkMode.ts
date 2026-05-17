// Theme controller. Three modes:
//   - 'light' / 'dark'  → explicit user choice
//   - 'system'          → follow prefers-color-scheme, re-applied on OS change
//
// The dark theme is opted into by toggling `html.dtr-theme-dark`, against
// which all dark token overrides cascade (see tokens.ts).
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
} from '../../bootstrap/config';
import { storageOP, type StorageOperator } from '../../infra/storage/storageOperator';
import { Bus, type EventBus } from '../../core/eventBus';
import { Store, type Store as StoreT } from '../../core/store';
import { emitThemeApplied } from '../events';
import type { ThemeMode } from '../../core/types';

export interface Theme {
    apply(mode: ThemeMode, options?: { skipTransition?: boolean }): void;
    set(mode: ThemeMode, options?: { skipTransition?: boolean }): void;
    init(): void;
    resolved(mode: ThemeMode): 'light' | 'dark';
}

interface ThemeDeps {
    storageOP: StorageOperator;
    store: StoreT;
    bus: EventBus;
}

export function createTheme(deps: ThemeDeps): Theme {
    const { storageOP: storage, store, bus } = deps;

    function resolved(mode: ThemeMode): 'light' | 'dark' {
        if (mode === 'dark' || mode === 'light') return mode;
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
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
        emitThemeApplied(mode, effective);
        void bus;
    }

    function set(mode: ThemeMode, options: { skipTransition?: boolean } = {}): void {
        store.patch({ theme: mode });
        storage.set(STORAGE_KEYS.theme, mode);
        apply(mode, options);
    }

    function init(): void {
        apply(store.get('theme'), { skipTransition: true });
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => {
            if (store.get('theme') === 'system') apply('system');
        });
    }

    return { apply, set, init, resolved };
}

// Default singleton — wired against the production Store/storageOP/Bus.
export const Theme: Theme = createTheme({ storageOP, store: Store, bus: Bus });
