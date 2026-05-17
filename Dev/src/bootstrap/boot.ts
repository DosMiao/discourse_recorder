// Boot path. Order matters:
//   1. Skip iframes — the script runs at top level only.
//   2. Skip non-Discourse pages unless the user opted in by setting
//      window.__dtrShow before load.
//   3. Inject styles before theme apply, because Theme.init() reads
//      computed values that depend on the token CSS.
//   4. Theme.init applies the persisted mode with skipTransition: true so
//      the first paint doesn't flash light→dark.
//   5. Dock.mount() subscribes to Bus events itself; we just kick keyboard
//      shortcuts and auto-start.
//
// SPA awareness: Discourse navigates client-side without a full reload, so
// the initial document.readyState may fire while the topic isn't yet in
// DOM. `bootPoll` retries up to 10s.

import { ROOT_ID } from '../core/constants';
import { Store } from '../core/store';
import { Theme } from '../theme/theme';
import { injectStyles } from '../styles/injectStyles';
import { isDiscoursePage } from '../extractor/discourse';
import { Recorder } from '../recorder/recorder';
import { Dock } from '../ui/dock';
import { Toast } from '../ui/toast';

declare global {
    interface Window {
        __dtrShow?: boolean;
    }
}

function attachKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (!(e.altKey && e.shiftKey)) return;
        const k = e.key.toLowerCase();
        if (k === 'r') {
            e.preventDefault();
            if (Store.state.recording) Recorder.stop();
            else Recorder.start();
        } else if (k === 't') {
            e.preventDefault();
            const order = ['light', 'dark', 'system'] as const;
            const i = order.indexOf(Store.get('theme'));
            const next = order[(i + 1) % order.length] ?? 'system';
            Theme.set(next);
            const labels: Record<typeof next, string> = {
                light: '浅色',
                dark: '深色',
                system: '系统',
            };
            Toast.show(`主题:${labels[next]}`, 'success', 1500);
        }
    });
}

export function boot(): void {
    if (window.top !== window.self) return; // skip iframes
    if (document.getElementById(ROOT_ID)) return; // already mounted
    if (!isDiscoursePage() && !window.__dtrShow) return;

    injectStyles();
    Theme.init();
    Dock.mount();
    attachKeyboardShortcuts();

    if (
        Store.get('autoStart') &&
        isDiscoursePage() &&
        /\/t\//.test(location.pathname)
    ) {
        setTimeout(() => Recorder.start(), 600);
    }
}

// SPA polling: if the page isn't yet a Discourse topic at load time, retry
// every 500ms for up to 10s. This catches the case where the user lands on
// a Discourse SPA route that hydrates after initial paint.
let bootRetries = 0;
const MAX_RETRIES = 20;
export function bootPoll(): void {
    if (document.getElementById(ROOT_ID)) return;
    if (isDiscoursePage()) {
        boot();
        return;
    }
    if (bootRetries++ < MAX_RETRIES) setTimeout(bootPoll, 500);
}
