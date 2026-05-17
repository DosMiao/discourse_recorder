// Auto-scroll loop. Runs alongside the recorder, advancing the viewport in
// chunks so Discourse's virtual scroller hydrates the next batch of posts.
//
// Termination logic, in order of priority:
//   1. Recorder stopped / autoScroll explicitly stopped → exit immediately.
//   2. Reached the document bottom AND post count didn't change for the
//      last two ticks → assume thread fully captured.
//   3. Hit MAX_TICKS (safety cap so a misbehaving page can't loop forever).
//
// Pause behaviour mirrors the recorder: while Store.state.paused we keep the
// loop alive but skip the scroll step, so resuming continues from the same
// position instead of restarting.

import { Store } from '../core/store';
import { Bus } from '../core/eventBus';

const STEP_RATIO = 0.85; // fraction of viewport height to advance per tick
const TICK_MS = 750; // wait between scrolls — gives the SPA time to hydrate
const MAX_TICKS = 2000; // hard cap on iterations (~25 min @ 750ms)
const STALL_LIMIT = 4; // consecutive no-progress ticks before giving up

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function atBottom(): boolean {
    const doc = document.documentElement;
    return doc.scrollTop + window.innerHeight >= doc.scrollHeight - 8;
}

function scrollStep(): void {
    const delta = Math.max(200, Math.floor(window.innerHeight * STEP_RATIO));
    window.scrollBy({ top: delta, behavior: 'auto' });
}

export function start(): void {
    if (running) return;
    running = true;
    Bus.emit('autoscroll:started', undefined);

    let ticks = 0;
    let stallTicks = 0;
    let lastCount = Store.counts().posts + Store.counts().chunks;

    const loop = (): void => {
        if (!running || !Store.state.recording) {
            stop();
            return;
        }
        if (Store.state.paused) {
            timer = setTimeout(loop, TICK_MS);
            return;
        }

        scrollStep();
        ticks++;

        timer = setTimeout(() => {
            const nowCount = Store.counts().posts + Store.counts().chunks;
            if (nowCount > lastCount) {
                stallTicks = 0;
                lastCount = nowCount;
            } else if (atBottom()) {
                stallTicks++;
            }

            if (ticks >= MAX_TICKS) {
                stop('max');
                return;
            }
            if (atBottom() && stallTicks >= STALL_LIMIT) {
                stop('end');
                return;
            }
            loop();
        }, TICK_MS);
    };

    loop();
}

export function stop(reason: 'manual' | 'end' | 'max' = 'manual'): void {
    if (!running) return;
    running = false;
    if (timer != null) {
        clearTimeout(timer);
        timer = null;
    }
    Bus.emit('autoscroll:stopped', { reason });
}

export function isRunning(): boolean {
    return running;
}

export const AutoScroll = { start, stop, isRunning };
