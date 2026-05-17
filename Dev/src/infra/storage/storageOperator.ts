// Top-level storage facade. Mirrors AmexOfferMax's storageOperator shape:
// get/set/del + subscribe + change-detection. The hash + deep-equality
// double-guard means a settings tab that writes the same value on every
// render won't trip GM_setValue (which on Tampermonkey can otherwise
// trigger a sync round-trip).
//
// Singleton export `storageOP` is what every module imports. The factory
// `createStorageOperator()` is preserved for tests that need an isolated
// instance.

import { createPersistenceAdapter, type PersistenceAdapter } from './core/persistence';
import { createHashManager, type HashManager } from './core/hashing';
import { createEventEmitter, type EventEmitter, type StorageListener } from './events/eventEmitter';
import { isEqual } from './utils/equality';
import { STORAGE_CONFIG } from './config/storageConfig';
import { logService } from '../logging/core/LogService';

export interface StorageOperator {
    get<T>(key: string, fallback: T): T;
    set<T>(key: string, value: T): boolean;
    del(key: string): void;
    subscribe(key: string, listener: StorageListener): () => void;
    has(key: string): boolean;
}

interface StorageOperatorDeps {
    persistence?: PersistenceAdapter;
    hashManager?: HashManager;
    emitter?: EventEmitter;
}

export function createStorageOperator(deps: StorageOperatorDeps = {}): StorageOperator {
    const persistence = deps.persistence ?? createPersistenceAdapter();
    const hashManager = deps.hashManager ?? createHashManager();
    const emitter = deps.emitter ?? createEventEmitter();
    const log = logService.namespace('storage');

    // Last-known cached values for the dedup check. Populated on first read
    // and updated on every successful set, so consecutive set(k, v) calls
    // with the same v are O(1).
    const cache = new Map<string, unknown>();
    const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

    function flushPersist<T>(key: string, value: T): void {
        try {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            if (STORAGE_CONFIG.deduplicate && !hashManager.hasChanged(key, serialized)) {
                return;
            }
            hashManager.updateHash(key, serialized);
            persistence.setSerialized(key, serialized, value);
        } catch (err: unknown) {
            const e = err as { message?: string };
            log.warn('persist.failed', { key, message: e?.message || String(err) });
            // Fall back to plain set so we still write something.
            persistence.set(key, value);
        }
    }

    function scheduleSave<T>(key: string, value: T): void {
        if (STORAGE_CONFIG.saveDelayMs <= 0) {
            flushPersist(key, value);
            return;
        }
        const existing = saveTimers.get(key);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
            saveTimers.delete(key);
            flushPersist(key, value);
        }, STORAGE_CONFIG.saveDelayMs);
        saveTimers.set(key, timer);
    }

    return {
        get<T>(key: string, fallback: T): T {
            if (cache.has(key)) return cache.get(key) as T;
            const value = persistence.get<T>(key, fallback);
            cache.set(key, value);
            return value;
        },

        set<T>(key: string, value: T): boolean {
            const prev = cache.has(key) ? cache.get(key) : persistence.get(key, undefined);
            if (STORAGE_CONFIG.deduplicate && isEqual(prev, value)) return false;
            cache.set(key, value);
            scheduleSave(key, value);
            emitter.emit(key, value);
            return true;
        },

        del(key: string): void {
            cache.delete(key);
            hashManager.clearHash(key);
            const pending = saveTimers.get(key);
            if (pending) {
                clearTimeout(pending);
                saveTimers.delete(key);
            }
            persistence.del(key);
            emitter.emit(key, undefined);
        },

        subscribe(key: string, listener: StorageListener): () => void {
            return emitter.subscribe(key, listener);
        },

        has(key: string): boolean {
            if (cache.has(key)) return cache.get(key) !== undefined;
            return persistence.get<unknown>(key, undefined as unknown) !== undefined;
        },
    };
}

export const storageOP: StorageOperator = createStorageOperator();
