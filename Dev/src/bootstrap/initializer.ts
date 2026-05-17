// Composition root. Runs the actual boot sequence — order matters:
//   1. Skip iframes — the script runs at top level only.
//   2. Skip non-Discourse pages unless the user opted in via window.__dtrShow.
//   3. Inject styles before theme apply, because the theme reads computed
//      values that depend on the token CSS.
//   4. Theme.init applies the persisted mode with skipTransition: true so
//      the first paint doesn't flash light→dark.
//   5. Dock.mount() subscribes to Bus events itself; we just kick keyboard
//      shortcuts and optional auto-start.
//
// SPA awareness: Discourse navigates client-side without a full reload, so
// the initial document.readyState may fire while the topic isn't yet in DOM.
// `bootPoll` retries up to 10 s.

import { ROOT_ID } from './config';
import { injectStyles } from '../ui/styles/injectStyles';
import { isDiscoursePage } from '../extractor/discourse';
import { Recorder } from '../recorder/recorder';
import { createDock, type DockHandle } from '../ui/components/Dock';
import type { ApplicationServices } from './serviceFactory';
import type { ThemeMode } from '../core/types';

declare global {
    interface Window {
        __dtrShow?: boolean;
    }
}

export interface Initializer {
    boot(): void;
    bootPoll(): void;
}

export function createInitializer(services: ApplicationServices): Initializer {
    const { store, theme, i18n, toast, logger } = services;
    const logBoot = logger.namespace('bootstrap');
    let dock: DockHandle | null = null;
    let bootRetries = 0;
    const MAX_RETRIES = 20;

    function attachKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (!(e.altKey && e.shiftKey)) return;
            const k = e.key.toLowerCase();
            if (k === 'r') {
                e.preventDefault();
                if (store.state.recording) Recorder.stop();
                else Recorder.start();
            } else if (k === 't') {
                e.preventDefault();
                const order: ThemeMode[] = ['light', 'dark', 'system'];
                const i = order.indexOf(store.get('theme'));
                const next = order[(i + 1) % order.length] ?? 'system';
                theme.set(next);
                const labelKey =
                    next === 'light'
                        ? 'theme_light'
                        : next === 'dark'
                          ? 'theme_dark'
                          : 'theme_system';
                toast.show(
                    `${i18n.t('toast_theme_changed')}: ${i18n.t(labelKey)}`,
                    'success',
                    1500
                );
            }
        });
    }

    function boot(): void {
        if (window.top !== window.self) return; // skip iframes
        if (document.getElementById(ROOT_ID)?.querySelector(`.dtr-dock`)) {
            return;
        }
        if (!isDiscoursePage() && !window.__dtrShow) return;

        injectStyles();
        theme.init();

        dock = createDock({ i18n });
        dock.mount();

        attachKeyboardShortcuts();

        logBoot.info('mounted', {
            message: 'dock + theme + shortcuts ready',
            locale: i18n.locale(),
            theme: store.get('theme'),
        });

        if (
            store.get('autoStart') &&
            isDiscoursePage() &&
            /\/t\//.test(location.pathname)
        ) {
            setTimeout(() => Recorder.start(), 600);
        }
    }

    function bootPoll(): void {
        if (document.getElementById(ROOT_ID)?.querySelector(`.dtr-dock`)) {
            return;
        }
        if (isDiscoursePage()) {
            boot();
            return;
        }
        if (bootRetries++ < MAX_RETRIES) setTimeout(bootPoll, 500);
    }

    return { boot, bootPoll };
}
