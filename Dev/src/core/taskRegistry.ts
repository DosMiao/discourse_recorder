// Live task registry — the heart of the real-time progress system.
//
// Producers (exporter, image downloader, API capture) call:
//   const { id, signal } = Tasks.create({...});
//   Tasks.update(id, { done, total, message, addFailure, ... });
//   Tasks.end(id, { status: 'succeeded' });
//
// The registry coalesces `update` calls via requestAnimationFrame so the
// `task:updated` bus event fires at most once per task per frame, even if
// producers tick 50× per second. `create` and `end` emit synchronously so
// the UI can spawn / retire cards without lag.
//
// Cancellation: every task gets its own AbortController. The signal goes
// out to the producer; the controller stays in the registry so the UI's
// cancel button can call `Tasks.cancel(id)` without knowing who owns the
// async work.
//
// Summary cards persist after end. `succeeded` / `cancelled` auto-evict
// after SUMMARY_TTL_MS so the panel doesn't accumulate noise. `failed`
// sticks until the user dismisses (they likely want to inspect failures
// or retry). A FIFO cap (MAX_RETAINED_ENDED) prevents runaway memory if
// a user spawns dozens of failed tasks.

import { Bus, type EventBus } from './eventBus';
import { createRingBuffer, estimate, type RingBuffer } from '../utils/throughput';
import type {
    CreateTaskInput,
    EndTaskInput,
    TaskFailure,
    TaskSnapshot,
    TaskStage,
    UpdateTaskInput,
} from './tasks';

// Cap retained per-task failure records. Beyond this, the registry drops
// the oldest and bumps `failuresTruncated` so the UI can render "+N more".
const MAX_RETAINED_FAILURES = 50;
// Auto-dismiss successful/cancelled summary cards this long after they end.
const SUMMARY_TTL_MS = 30_000;
// Hard cap on retained ended tasks — oldest evict first regardless of TTL.
const MAX_RETAINED_ENDED = 5;
// Sampling rate floor — don't push a sample more often than this (keeps the
// ring buffer's elapsed window meaningful).
const MIN_SAMPLE_INTERVAL_MS = 100;

interface TaskRecord {
    snapshot: TaskSnapshot;
    controller: AbortController;
    samples: RingBuffer;
    lastSampleAt: number;
    autoDismissTimer: ReturnType<typeof setTimeout> | null;
}

export interface TaskRegistry {
    list(): TaskSnapshot[];
    get(id: string): TaskSnapshot | null;
    create(input: CreateTaskInput): { id: string; signal: AbortSignal };
    update(id: string, patch: UpdateTaskInput): void;
    end(id: string, input: EndTaskInput): void;
    dismiss(id: string): void;
    dismissAllEnded(): void;
    cancel(id: string): void;
    linkChild(parentId: string, childId: string): void;
}

interface TaskRegistryDeps {
    bus: EventBus;
}

let idCounter = 0;
function generateId(kind: string): string {
    idCounter = (idCounter + 1) >>> 0;
    return `${kind}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function freezeSnapshot(s: TaskSnapshot): TaskSnapshot {
    // Defensive copy so consumers can stash payloads without seeing later
    // mutations. Inner arrays/objects are also recreated.
    return {
        ...s,
        failures: s.failures.slice(),
        stages: s.stages.map((stage) => ({ ...stage })),
        childIds: s.childIds.slice(),
        titleParams: s.titleParams ? { ...s.titleParams } : undefined,
    };
}

export function createTaskRegistry(deps: TaskRegistryDeps): TaskRegistry {
    const { bus } = deps;
    const records = new Map<string, TaskRecord>();
    // Insertion order of ENDED tasks, used to apply MAX_RETAINED_ENDED FIFO.
    const endedOrder: string[] = [];

    // rAF batching — update() schedules; flush emits one task:updated per id.
    const dirty = new Set<string>();
    let rafHandle = 0;

    function scheduleFlush(id: string): void {
        dirty.add(id);
        if (rafHandle !== 0) return;
        rafHandle = requestAnimationFrame(flush);
    }

    function flush(): void {
        rafHandle = 0;
        const ids = Array.from(dirty);
        dirty.clear();
        for (const id of ids) {
            const rec = records.get(id);
            if (!rec) continue;
            recomputeMetrics(rec);
            bus.emit('task:updated', freezeSnapshot(rec.snapshot));
        }
    }

    function recomputeMetrics(rec: TaskRecord): void {
        const result = estimate(rec.samples, rec.snapshot.total);
        rec.snapshot.throughputPerSec = result.throughputPerSec;
        rec.snapshot.etaMs = result.etaMs;
    }

    function sampleNow(rec: TaskRecord): void {
        const now = Date.now();
        if (now - rec.lastSampleAt < MIN_SAMPLE_INTERVAL_MS) return;
        rec.lastSampleAt = now;
        rec.samples.push({ t: now, done: rec.snapshot.done });
    }

    function evictOldestEnded(): void {
        while (endedOrder.length > MAX_RETAINED_ENDED) {
            const oldest = endedOrder.shift();
            if (oldest == null) break;
            const rec = records.get(oldest);
            if (!rec) continue;
            if (rec.autoDismissTimer != null) clearTimeout(rec.autoDismissTimer);
            records.delete(oldest);
            bus.emit('task:dismissed', { id: oldest });
        }
    }

    function applyStagePatch(stages: TaskStage[], patch: NonNullable<UpdateTaskInput['stagePatch']>): TaskStage[] {
        return stages.map((s) => {
            if (s.id !== patch.id) return s;
            return {
                ...s,
                status: patch.status ?? s.status,
                done: patch.done ?? s.done,
                total: patch.total ?? s.total,
            };
        });
    }

    function pushFailure(rec: TaskRecord, failure: Omit<TaskFailure, 'at'>): void {
        const next: TaskFailure[] = rec.snapshot.failures.slice();
        next.push({ ...failure, at: Date.now() });
        let truncated = rec.snapshot.failuresTruncated;
        while (next.length > MAX_RETAINED_FAILURES) {
            next.shift();
            truncated++;
        }
        rec.snapshot.failures = next;
        rec.snapshot.failuresTruncated = truncated;
        rec.snapshot.failedCount++;
    }

    function removeFailure(rec: TaskRecord, failureId: string): void {
        const next = rec.snapshot.failures.filter((f) => f.id !== failureId);
        if (next.length === rec.snapshot.failures.length) return;
        rec.snapshot.failures = next;
        // failedCount is the lifetime count — don't decrement on retry success;
        // the UI uses failures.length for the "Retry N" button copy.
    }

    return {
        list(): TaskSnapshot[] {
            const out: TaskSnapshot[] = [];
            for (const rec of records.values()) {
                out.push(freezeSnapshot(rec.snapshot));
            }
            return out;
        },

        get(id: string): TaskSnapshot | null {
            const rec = records.get(id);
            return rec ? freezeSnapshot(rec.snapshot) : null;
        },

        create(input: CreateTaskInput): { id: string; signal: AbortSignal } {
            const id = generateId(input.kind);
            const controller = new AbortController();
            const snapshot: TaskSnapshot = {
                id,
                kind: input.kind,
                status: 'running',
                titleKey: input.titleKey,
                titleParams: input.titleParams ? { ...input.titleParams } : undefined,
                unit: input.unit,
                done: 0,
                total: Math.max(0, input.total),
                failedCount: 0,
                failures: [],
                failuresTruncated: 0,
                stages: input.stages ? input.stages.map((s) => ({ ...s })) : [],
                activeStageId: null,
                message: null,
                startedAt: Date.now(),
                endedAt: null,
                parentId: input.parentId ?? null,
                childIds: [],
                cancellable: input.cancellable ?? true,
                retryable: input.retryable ?? false,
                throughputPerSec: 0,
                etaMs: null,
            };
            const rec: TaskRecord = {
                snapshot,
                controller,
                samples: createRingBuffer(),
                lastSampleAt: 0,
                autoDismissTimer: null,
            };
            // Initial sample so the first update has something to slope against.
            rec.samples.push({ t: snapshot.startedAt, done: 0 });
            rec.lastSampleAt = snapshot.startedAt;
            records.set(id, rec);
            bus.emit('task:registered', freezeSnapshot(snapshot));
            return { id, signal: controller.signal };
        },

        update(id: string, patch: UpdateTaskInput): void {
            const rec = records.get(id);
            if (!rec) return;
            // Once a task has ended, ignore late updates from in-flight producers.
            if (rec.snapshot.status !== 'running' && rec.snapshot.status !== 'pending') {
                return;
            }
            const s = rec.snapshot;
            if (patch.done != null) s.done = patch.done;
            if (patch.total != null) s.total = Math.max(0, patch.total);
            if (patch.message !== undefined) s.message = patch.message;
            if (patch.activeStageId !== undefined) s.activeStageId = patch.activeStageId;
            if (patch.stagePatch) s.stages = applyStagePatch(s.stages.slice(), patch.stagePatch);
            if (patch.addFailure) pushFailure(rec, patch.addFailure);
            if (patch.removeFailure) removeFailure(rec, patch.removeFailure);

            if (patch.done != null) sampleNow(rec);
            scheduleFlush(id);
        },

        end(id: string, input: EndTaskInput): void {
            const rec = records.get(id);
            if (!rec) return;
            if (rec.snapshot.status !== 'running' && rec.snapshot.status !== 'pending') {
                return;
            }
            const s = rec.snapshot;
            s.status = input.status;
            s.endedAt = Date.now();
            if (input.message !== undefined) s.message = input.message;

            // Mark any active stage as done if the task succeeded; otherwise
            // leave stages as-is so the UI shows which stage we were on at
            // failure/cancellation.
            if (input.status === 'succeeded' && s.activeStageId) {
                s.stages = s.stages.map((stage) =>
                    stage.id === s.activeStageId ? { ...stage, status: 'done' } : stage
                );
                s.activeStageId = null;
            }

            // Final metrics refresh — picks up the last sample so the summary
            // card shows the achieved throughput, not whatever the last frame had.
            recomputeMetrics(rec);

            // Schedule TTL eviction for transient states; failures stick.
            if (input.status === 'succeeded' || input.status === 'cancelled') {
                rec.autoDismissTimer = setTimeout(() => {
                    if (records.get(id) === rec) {
                        records.delete(id);
                        const i = endedOrder.indexOf(id);
                        if (i >= 0) endedOrder.splice(i, 1);
                        bus.emit('task:dismissed', { id });
                    }
                }, SUMMARY_TTL_MS);
            }

            endedOrder.push(id);
            evictOldestEnded();

            // Drop any pending rAF emit for this task — we're emitting :ended
            // with the final snapshot synchronously, so an :updated chaser
            // would be redundant (and confuse a UI that already retired the card).
            dirty.delete(id);
            bus.emit('task:ended', freezeSnapshot(s));
        },

        dismiss(id: string): void {
            const rec = records.get(id);
            if (!rec) return;
            if (rec.autoDismissTimer != null) clearTimeout(rec.autoDismissTimer);
            records.delete(id);
            const i = endedOrder.indexOf(id);
            if (i >= 0) endedOrder.splice(i, 1);
            bus.emit('task:dismissed', { id });
        },

        dismissAllEnded(): void {
            const ids = endedOrder.slice();
            for (const id of ids) {
                const rec = records.get(id);
                if (!rec) continue;
                if (rec.autoDismissTimer != null) clearTimeout(rec.autoDismissTimer);
                records.delete(id);
                bus.emit('task:dismissed', { id });
            }
            endedOrder.length = 0;
        },

        cancel(id: string): void {
            const rec = records.get(id);
            if (!rec) return;
            if (!rec.snapshot.cancellable) return;
            if (rec.snapshot.status !== 'running' && rec.snapshot.status !== 'pending') {
                return;
            }
            // Triggering the signal is enough — the producer is responsible
            // for unwinding and calling Tasks.end(id, {status: 'cancelled'}).
            // We do NOT call end() here, because the producer may need to
            // finalise things (close handles, emit lifecycle events) first.
            rec.controller.abort();
        },

        linkChild(parentId: string, childId: string): void {
            const parent = records.get(parentId);
            if (!parent) return;
            if (parent.snapshot.childIds.includes(childId)) return;
            parent.snapshot.childIds = parent.snapshot.childIds.concat(childId);
            scheduleFlush(parentId);
        },
    };
}

export const Tasks: TaskRegistry = createTaskRegistry({ bus: Bus });
