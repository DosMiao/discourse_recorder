// DOM-ready helper. Calls the provided callback once the document body is
// present. Userscripts can run at document-idle, but in single-page-app
// environments (Discourse, Discord, etc.) the body may exist before the SPA
// has hydrated the route we care about — callers that need to wait for the
// route should poll inside their own initializer.

export function onDomReady(callback: () => void): void {
    if (document.body) {
        callback();
        return;
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => callback(), { once: true });
        return;
    }
    // readyState is 'interactive' or 'complete' but body isn't ready (rare
    // edge case under some userscript managers). Tick once and retry.
    setTimeout(() => onDomReady(callback), 16);
}
