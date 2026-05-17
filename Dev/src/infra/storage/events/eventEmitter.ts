// Per-key change notifier. Modules subscribe to a single key (e.g.
// 'theme') and receive the new value on every write. Cheaper and more
// targeted than going through the global Bus for settings updates — the
// dock's theme button, for instance, only needs to redraw when the theme
// changes, not on every state:changed event.

import { logService } from '../../logging/core/LogService';

const log = logService.namespace('storage');

export type StorageListener = (value: unknown) => void;

export interface EventEmitter {
    subscribe(key: string, callback: StorageListener): () => void;
    emit(key: string, value?: unknown): void;
}

export function createEventEmitter(): EventEmitter {
    const listeners = new Map<string, Set<StorageListener>>();

    return {
        subscribe(key: string, callback: StorageListener): () => void {
            if (!key || typeof callback !== 'function') {
                throw new TypeError('subscribe requires a key and callback function');
            }

            let keyListeners = listeners.get(key);
            if (!keyListeners) {
                keyListeners = new Set();
                listeners.set(key, keyListeners);
            }
            keyListeners.add(callback);

            return (): void => {
                const set = listeners.get(key);
                if (!set) return;
                set.delete(callback);
                if (set.size === 0) listeners.delete(key);
            };
        },

        emit(key: string, value?: unknown): void {
            const keyListeners = listeners.get(key);
            if (!keyListeners) return;
            keyListeners.forEach((callback) => {
                try {
                    callback(value);
                } catch (error: unknown) {
                    const e = error as { message?: string; stack?: string };
                    log.error('eventEmitter.listenerError', {
                        key,
                        message: e?.message || String(error),
                        stack: e?.stack,
                    });
                }
            });
        },
    };
}
