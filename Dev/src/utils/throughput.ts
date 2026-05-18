// Throughput estimator over a sliding sample buffer. Used by the task
// registry to compute live ETA + per-second rate for any task that reports
// `done` over time. Pure utility — no Bus, no Store.
//
// Why a ring buffer instead of EMA: producers can emit bursty progress
// (10/sec then 0 for 2 sec), and a window of fixed COUNT lets us compute
// the slope across actual elapsed wall time rather than a tick rate.

const DEFAULT_CAPACITY = 16;
const MIN_SAMPLES = 3;
// Below this window the slope is too noisy — wait for more data.
const MIN_WINDOW_MS = 800;
// Samples older than this are stale (task may have paused) — drop the
// estimate entirely rather than emit a wildly wrong ETA.
const MAX_WINDOW_MS = 10_000;
// Clamp absurd ETAs (e.g. throughput trending toward zero) — null tells
// the UI to render "—" instead of "23h 47m".
const ETA_CLAMP_MS = 24 * 3600 * 1000;

export interface Sample {
    t: number;
    done: number;
}

export interface ThroughputResult {
    throughputPerSec: number;
    etaMs: number | null;
}

export interface RingBuffer {
    push(sample: Sample): void;
    first(): Sample | undefined;
    last(): Sample | undefined;
    readonly size: number;
    clear(): void;
}

export function createRingBuffer(capacity: number = DEFAULT_CAPACITY): RingBuffer {
    const buf: Array<Sample | undefined> = new Array<Sample | undefined>(capacity);
    let head = 0;
    let count = 0;

    return {
        push(sample: Sample): void {
            buf[head] = sample;
            head = (head + 1) % capacity;
            if (count < capacity) count++;
        },
        first(): Sample | undefined {
            if (count === 0) return undefined;
            const idx = (head - count + capacity) % capacity;
            return buf[idx];
        },
        last(): Sample | undefined {
            if (count === 0) return undefined;
            return buf[(head - 1 + capacity) % capacity];
        },
        get size(): number {
            return count;
        },
        clear(): void {
            head = 0;
            count = 0;
            for (let i = 0; i < capacity; i++) buf[i] = undefined;
        },
    };
}

export function estimate(buf: RingBuffer, total: number): ThroughputResult {
    if (buf.size < MIN_SAMPLES) return { throughputPerSec: 0, etaMs: null };

    const first = buf.first();
    const last = buf.last();
    if (!first || !last) return { throughputPerSec: 0, etaMs: null };

    const elapsedMs = last.t - first.t;
    if (elapsedMs < MIN_WINDOW_MS) return { throughputPerSec: 0, etaMs: null };

    // Discard if the most recent sample is itself stale — the task has
    // gone quiet, no reliable ETA from old data.
    if (Date.now() - last.t > MAX_WINDOW_MS) {
        return { throughputPerSec: 0, etaMs: null };
    }

    const deltaDone = last.done - first.done;
    if (deltaDone <= 0) return { throughputPerSec: 0, etaMs: null };

    const throughputPerSec = (deltaDone / elapsedMs) * 1000;
    const remaining = Math.max(0, total - last.done);

    if (throughputPerSec <= 0) return { throughputPerSec: 0, etaMs: null };
    const etaMs = (remaining / throughputPerSec) * 1000;
    if (etaMs > ETA_CLAMP_MS) {
        return { throughputPerSec, etaMs: null };
    }
    return { throughputPerSec, etaMs };
}
