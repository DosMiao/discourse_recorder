// Recording orchestration. Two capture modes:
//
//   discourse  — seed from preloaded JSON, then watch .post-stream for new
//                posts via MutationObserver, plus a throttled scroll handler
//                because Discourse's virtual scroller can swap posts without
//                emitting a useful mutation we'd otherwise miss.
//
//   generic    — visit every textual block as it enters the viewport (used
//                when isDiscoursePage() is false, or as a fallback). Each
//                block is keyed by tag + leading text + length for cheap
//                dedup.
//
// Both modes write into Store.state and emit 'capture:tick' so the dock
// re-renders. Pause/resume keeps the observers attached but short-circuits
// the capture functions, so re-arming is instant.

import { ROOT_ID } from '../bootstrap/config';
import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import {
    extractPostData,
    getTopicMeta,
    isDiscoursePage,
    seedFromPreloaded,
} from '../extractor/discourse';
import { DiscourseApi } from '../extractor/discourseApi';
import { AutoScroll } from './autoScroll';
import { buildSessionSlug, exportPreferred } from '../exporter/exporter';
import { logService } from '../infra/logging/core/LogService';
import type { GenericChunk } from '../core/types';

const log = logService.namespace('recorder');

let scrollHandler: ((e: Event) => void) | null = null;
let ioObserver: IntersectionObserver | null = null;
let mutObserver: MutationObserver | null = null;
let captureScheduled = false;
let scrollScheduled = false;
// Owned by start() while an API capture is in flight; cleared by the
// captureAll .finally. stop() aborts via this so cancellation propagates
// through AbortSignal — the task system uses the same signal to drive
// its cancel button.
let captureController: AbortController | null = null;

function recomputeImageCount(): void {
    let total = 0;
    for (const p of Store.state.posts.values()) total += p.images.length;
    for (const c of Store.state.genericChunks) total += c.images.length;
    Store.patch({ imageCount: total });
}

function captureDiscourseNow(): void {
    if (!Store.state.recording || Store.state.paused) return;
    const articles = document.querySelectorAll('article[id^="post_"]');
    let changed = 0;
    for (const article of Array.from(articles)) {
        const data = extractPostData(article);
        if (!data.postNumber) continue;
        const existing = Store.state.posts.get(data.postNumber);
        if (!existing || (data.text && data.text.length > (existing.text ?? '').length)) {
            Store.state.posts.set(data.postNumber, data);
            changed++;
        }
    }
    if (changed > 0) {
        Store.state.lastCapturedAt = new Date();
        recomputeImageCount();
        Bus.emit('capture:tick', { added: changed });
    }
}

function startDiscourse(): void {
    const seeded = seedFromPreloaded();
    captureDiscourseNow();
    if (seeded > 0) {
        Store.state.lastCapturedAt = new Date();
        recomputeImageCount();
    }

    const target = document.querySelector('.post-stream') ?? document.body;
    mutObserver = new MutationObserver(() => {
        if (captureScheduled) return;
        captureScheduled = true;
        setTimeout(() => {
            captureScheduled = false;
            captureDiscourseNow();
        }, 180);
    });
    mutObserver.observe(target, { childList: true, subtree: true });

    scrollHandler = () => {
        if (scrollScheduled) return;
        scrollScheduled = true;
        setTimeout(() => {
            scrollScheduled = false;
            captureDiscourseNow();
        }, 280);
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
}

function startGeneric(): void {
    const BLOCK_SELECTOR =
        'p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, dd, figcaption, article, section, .cooked, .post-body';

    const visit = (el: Element): void => {
        if (!Store.state.recording || Store.state.paused) return;
        if (!el || el.closest(`#${ROOT_ID}`)) return;
        const text = ((el as HTMLElement).innerText ?? el.textContent ?? '').trim();
        if (!text || text.length < 2) return;
        const key = `${el.tagName}:${text.slice(0, 80)}:${text.length}`;
        if (Store.state.seenGenericKeys.has(key)) return;
        Store.state.seenGenericKeys.add(key);

        const images = Store.get('captureImages')
            ? Array.from(el.querySelectorAll('img'))
                  .map(
                      (img) => img.getAttribute('data-src') ?? img.getAttribute('src') ?? ''
                  )
                  .filter(Boolean)
            : [];

        const chunk: GenericChunk = {
            tag: el.tagName.toLowerCase(),
            text,
            images,
            ts: new Date().toISOString(),
        };
        Store.state.genericChunks.push(chunk);
        Store.state.lastCapturedAt = new Date();
        recomputeImageCount();
        Bus.emit('capture:tick', { added: 1 });
    };

    ioObserver = new IntersectionObserver(
        (entries) => {
            for (const e of entries) if (e.isIntersecting) visit(e.target);
        },
        { threshold: 0.1 }
    );
    for (const el of Array.from(document.querySelectorAll(BLOCK_SELECTOR))) {
        ioObserver.observe(el);
    }

    mutObserver = new MutationObserver((muts) => {
        for (const m of muts) {
            for (const n of Array.from(m.addedNodes)) {
                if (n.nodeType !== 1) continue;
                const el = n as Element;
                if (el.matches?.(BLOCK_SELECTOR)) ioObserver?.observe(el);
                el.querySelectorAll?.(BLOCK_SELECTOR).forEach((sub) =>
                    ioObserver?.observe(sub)
                );
            }
        }
    });
    mutObserver.observe(document.body, { childList: true, subtree: true });
}

function teardown(): void {
    mutObserver?.disconnect();
    mutObserver = null;
    ioObserver?.disconnect();
    ioObserver = null;
    if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
    }
}

function start(): void {
    if (Store.state.recording) return;
    Store.state.topicMeta = getTopicMeta();
    const mode = isDiscoursePage() ? 'discourse' : 'generic';
    const startedAt = new Date();
    Store.patch({
        recording: true,
        paused: false,
        mode,
        startedAt,
        pausedAt: null,
        totalPausedMs: 0,
        // Freeze the session prefix at start so every export from this run
        // uses the same {date}_{title} regardless of later title edits.
        sessionSlug: buildSessionSlug(Store.state.topicMeta?.title ?? '', startedAt),
    });
    if (mode === 'discourse') startDiscourse();
    else startGeneric();
    Bus.emit('recorder:started', { mode });

    // Capture strategy:
    //   - 'api'    : skip scroll, hit Discourse JSON endpoints directly.
    //                Only meaningful in Discourse mode; falls back to scroll
    //                on generic pages.
    //   - 'scroll' : keep the existing AutoScroll behaviour, gated by the
    //                user's 'autoScroll' toggle.
    const strategy = Store.get('captureStrategy');
    if (strategy === 'api' && mode === 'discourse') {
        captureController = new AbortController();
        const controller = captureController;
        // Defer one tick so the dock paints the "recording" state before we
        // start hammering the API.
        setTimeout(() => {
            void DiscourseApi.captureAll({ signal: controller.signal })
                .catch((err: unknown) => {
                    const e = err as { message?: string };
                    log.error('api.capture.failed', {
                        message: e?.message || String(err),
                    });
                })
                .finally(() => {
                    if (captureController === controller) captureController = null;
                });
        }, 200);
    } else if (Store.get('autoScroll')) {
        setTimeout(() => AutoScroll.start(), 400);
    }
}

function stop(): void {
    if (!Store.state.recording) return;
    AutoScroll.stop();
    // Cancel the in-flight API capture via its AbortController. captureAll's
    // own signal listener emits apicapture:stopped immediately so autoSession
    // / autoSaveOnComplete don't have to wait for the in-flight fetch to settle.
    captureController?.abort();
    captureController = null;
    teardown();
    Store.patch({ recording: false, paused: false });
    Bus.emit('recorder:stopped', undefined);
}

function pause(): void {
    if (!Store.state.recording || Store.state.paused) return;
    Store.patch({ paused: true, pausedAt: new Date() });
    Bus.emit('recorder:paused', undefined);
}

function resume(): void {
    if (!Store.state.recording || !Store.state.paused) return;
    const now = Date.now();
    const pausedSince = Store.state.pausedAt ? Store.state.pausedAt.getTime() : now;
    Store.state.totalPausedMs += now - pausedSince;
    Store.patch({ paused: false, pausedAt: null });
    Bus.emit('recorder:resumed', undefined);
}

function clear(): void {
    if (Store.state.recording) stop();
    Store.state.posts.clear();
    Store.state.genericChunks.length = 0;
    Store.state.seenGenericKeys.clear();
    Store.patch({
        topicMeta: null,
        startedAt: null,
        pausedAt: null,
        totalPausedMs: 0,
        lastCapturedAt: null,
        imageCount: 0,
        mode: 'idle',
        sessionSlug: null,
    });
    Bus.emit('recorder:cleared', undefined);
}

// One-click "Auto Record & Save": starts a fresh session, waits for the
// capture pass to complete (AutoScroll end OR API done), exports, then
// stops. autoSessionPending guards against double-clicks while a session is
// in flight.
let autoSessionPending = false;

async function autoSession(): Promise<void> {
    if (autoSessionPending) return;
    if (Store.state.recording) stop();
    autoSessionPending = true;

    const complete = new Promise<void>((resolve) => {
        const offComplete = Bus.on('capture:complete', () => {
            offComplete();
            offStopped();
            resolve();
        });
        // recorder:stopped fires if the user manually stops mid-session;
        // resolve too so the chain unwinds cleanly instead of hanging.
        const offStopped = Bus.on('recorder:stopped', () => {
            offComplete();
            offStopped();
            resolve();
        });
    });

    start();
    await complete;

    try {
        await exportPreferred();
    } catch (err: unknown) {
        const e = err as { message?: string };
        log.error('autoSession.export.failed', {
            message: e?.message || String(err),
        });
    } finally {
        if (Store.state.recording) stop();
        autoSessionPending = false;
    }
}

// Bridge AutoScroll's terminal 'end' reason to the unified capture:complete
// signal so consumers (autoSession, autoSaveOnComplete) only need to listen
// to one channel.
Bus.on('autoscroll:stopped', (p) => {
    if (p.reason === 'end') Bus.emit('capture:complete', { reason: 'autoscroll' });
});

// On API capture failure, terminate the recorder. Without this the session
// hangs (no observers fire because the API path skips them), leaving
// autoSession waiting on capture:complete forever and the dock stuck in
// "recording" state. The user-facing "switch to scroll mode" toast is
// emitted by the dock listener, not here.
Bus.on('apicapture:stopped', (p) => {
    if (p.reason === 'error' && Store.state.recording) stop();
});

// Honour the autoSaveOnComplete setting whenever a normal (non-autoSession)
// run completes its capture pass. autoSession runs its own export, so we
// skip this branch while one is in flight. The export's success or failure
// surfaces in the Activity Panel as a task card; we just need to log here so
// debug telemetry isn't blind to the failure.
Bus.on('capture:complete', () => {
    if (autoSessionPending) return;
    if (!Store.get('autoSaveOnComplete')) return;
    void Promise.resolve(exportPreferred())
        .catch((err: unknown) => {
            const e = err as { message?: string };
            log.error('autoSave.export.failed', {
                message: e?.message || String(err),
            });
        })
        .finally(() => {
            if (Store.state.recording) stop();
        });
});

export const Recorder = { start, stop, pause, resume, clear, autoSession };
