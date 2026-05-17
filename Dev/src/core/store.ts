// Single source of truth. All UI components reactively render off this state
// via Bus.on('state:changed', ...). The store does NOT persist settings —
// that's the caller's responsibility (they save via storageOP and patch the
// store). Keeping these concerns separate means the store can be reset for
// tests without touching disk.
//
// Factory shape — `createStore(deps)` — accepts {storageOP, bus} so tests
// can inject stubs. The module-level `Store` is the production singleton.

import { STORAGE_KEYS, DEFAULT_SHARD_CAP_LINES } from '../bootstrap/config';
import { storageOP, type StorageOperator } from '../infra/storage/storageOperator';
import { Bus, type EventBus } from './eventBus';
import type {
    CaptureMode,
    CaptureStrategy,
    ExportFormat,
    GenericChunk,
    PostData,
    TabId,
    ThemeMode,
    TopicMeta,
} from './types';

export interface State {
    // Recording lifecycle
    recording: boolean;
    paused: boolean;
    mode: CaptureMode;
    startedAt: Date | null;
    pausedAt: Date | null;
    totalPausedMs: number;
    lastCapturedAt: Date | null;
    imageCount: number;

    // Captured data
    posts: Map<number, PostData>;
    genericChunks: GenericChunk[];
    seenGenericKeys: Set<string>;
    topicMeta: TopicMeta | null;

    // Settings (hydrated from Storage at boot)
    theme: ThemeMode;
    autoStart: boolean;
    autoScroll: boolean;
    captureImages: boolean;
    downloadImages: boolean;
    exportFormat: ExportFormat;
    dockMinimized: boolean;
    activeTab: TabId;
    captureStrategy: CaptureStrategy;
    autoSaveOnComplete: boolean;
    filenamePrefix: boolean;
    // Max rendered lines per shard when exportFormat === 'sharded'. Persisted
    // so the user's choice survives across sessions.
    shardCap: number;

    // Per-session derived state — set on Recorder.start, used by the
    // exporter so all files from one session share the same {date}_{title}
    // prefix even if Store.state.topicMeta is later edited.
    sessionSlug: string | null;
}

export interface Store {
    readonly state: State;
    get<K extends keyof State>(key: K): State[K];
    patch(partial: Partial<State>): void;
    counts(): { posts: number; chunks: number; images: number };
    elapsedMs(): number;
}

interface StoreDeps {
    storageOP: StorageOperator;
    bus: EventBus;
}

function loadInitialState(storage: StorageOperator): State {
    return {
        recording: false,
        paused: false,
        mode: 'idle',
        startedAt: null,
        pausedAt: null,
        totalPausedMs: 0,
        lastCapturedAt: null,
        imageCount: 0,

        posts: new Map<number, PostData>(),
        genericChunks: [],
        seenGenericKeys: new Set<string>(),
        topicMeta: null,

        theme: storage.get<ThemeMode>(STORAGE_KEYS.theme, 'system'),
        autoStart: storage.get<boolean>(STORAGE_KEYS.autoStart, false),
        autoScroll: storage.get<boolean>(STORAGE_KEYS.autoScroll, true),
        captureImages: storage.get<boolean>(STORAGE_KEYS.captureImages, true),
        downloadImages: storage.get<boolean>(STORAGE_KEYS.downloadImages, true),
        exportFormat: storage.get<ExportFormat>(STORAGE_KEYS.exportFormat, 'zip'),
        dockMinimized: storage.get<boolean>(STORAGE_KEYS.dockMin, false),
        activeTab: storage.get<TabId>(STORAGE_KEYS.activeTab, 'capture'),
        captureStrategy: storage.get<CaptureStrategy>(
            STORAGE_KEYS.captureStrategy,
            'api'
        ),
        autoSaveOnComplete: storage.get<boolean>(STORAGE_KEYS.autoSaveOnComplete, false),
        filenamePrefix: storage.get<boolean>(STORAGE_KEYS.filenamePrefix, true),
        shardCap: storage.get<number>(STORAGE_KEYS.shardCap, DEFAULT_SHARD_CAP_LINES),

        sessionSlug: null,
    };
}

export function createStore(deps: StoreDeps): Store {
    const { storageOP: storage, bus } = deps;
    const state: State = loadInitialState(storage);

    return {
        state,

        get<K extends keyof State>(key: K): State[K] {
            return state[key];
        },

        // Shallow patch with change detection. Emits exactly once per call —
        // batch related changes together rather than calling patch in a loop.
        patch(partial: Partial<State>): void {
            let changed = false;
            for (const k of Object.keys(partial) as (keyof State)[]) {
                const next = partial[k];
                if (next === undefined) continue;
                if (state[k] !== next) {
                    (state as Record<keyof State, unknown>)[k] = next;
                    changed = true;
                }
            }
            if (changed) bus.emit('state:changed', undefined);
        },

        counts() {
            return {
                posts: state.posts.size,
                chunks: state.genericChunks.length,
                images: state.imageCount,
            };
        },

        elapsedMs() {
            if (!state.startedAt) return 0;
            const now =
                state.paused && state.pausedAt ? state.pausedAt.getTime() : Date.now();
            return now - state.startedAt.getTime() - state.totalPausedMs;
        },
    };
}

export const Store: Store = createStore({ storageOP, bus: Bus });
