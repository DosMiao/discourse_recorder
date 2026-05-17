// Composition root. Runs the actual boot sequence — order matters:
//   1. Skip iframes — the script runs at top level only.
//   2. Skip non-Discourse pages unless the user opted in via window.__dtrShow.
//   3. The renderEngine injects styles + mounts the dock. Theme.init applies
//      the persisted mode with skipTransition: true so the first paint
//      doesn't flash light→dark.
//   4. Wire keyboard shortcuts and optional auto-start.
//
// SPA awareness: Discourse navigates client-side without a full reload, so
// the initial document.readyState may fire while the topic isn't yet in DOM.
// `bootPoll` retries up to 10 s.
//
// Mirrors AmexOfferMax's initializer: services + renderEngine in via deps,
// warmup promises (here just topic detection) resolved early so the boot
// path can fail fast.

import { isDiscoursePage } from '../extractor/discourse';
import { Recorder } from '../recorder/recorder';
import type { ApplicationServices } from './serviceFactory';
import type { RenderEngine } from './renderEngine/renderEngine';
import type { ThemeMode, ToastType } from '../core/types';

declare global {
    interface Window {
        __dtrShow?: boolean;
    }
}

interface InitializerDeps extends ApplicationServices {
    renderEngine: RenderEngine;
    warmup: {
        topicReadyPromise: Promise<{ isDiscourse: boolean }>;
    };
}

export interface Initializer {
    boot(): Promise<void>;
    bootPoll(): void;
}

export function createInitializer(deps: InitializerDeps): Initializer {
    const { config, store, theme, i18n, toast, renderEngine, warmup, logBootstrap } = deps;
    let bootRetries = 0;
    const MAX_RETRIES = 20;
    let booted = false;

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
                const type: ToastType = 'success';
                toast.show(
                    `${i18n.t('toast_theme_changed')}: ${i18n.t(labelKey)}`,
                    type,
                    1500
                );
            }
        });
    }

    async function boot(): Promise<void> {
        if (booted) return;
        if (window.top !== window.self) return; // skip iframes

        const span = logBootstrap.span('boot', { message: 'mount + wire shortcuts' });

        const { isDiscourse } = await warmup.topicReadyPromise;
        if (!isDiscourse && !window.__dtrShow) {
            span.end({ skipped: true, reason: 'non-discourse page' }, 'info');
            return;
        }

        theme.init();
        const mounted = renderEngine.mount();
        if (!mounted) {
            span.end({ skipped: true, reason: 'dock already present' }, 'info');
            return;
        }

        attachKeyboardShortcuts();
        booted = true;

        logBootstrap.info('mounted', {
            message: 'renderEngine + theme + shortcuts ready',
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

        span.end({ booted: true }, 'info');
    }

    function bootPoll(): void {
        if (booted) return;
        if (isDiscoursePage()) {
            void boot();
            return;
        }
        if (bootRetries++ < MAX_RETRIES) setTimeout(bootPoll, 500);
    }

    // Reference config so the linter doesn't complain about the unused
    // destructure — config is still useful for downstream consumers that
    // pull SCRIPT_CONFIG off the services bag.
    void config;

    return { boot, bootPoll };
}
