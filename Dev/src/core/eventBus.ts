// Tiny pub/sub bus. Strongly typed against EventMap so handlers can't be
// registered with a payload shape that doesn't match the channel.
//
// Factory shape — `createEventBus()` — mirrors the rest of the bootstrap so
// tests can spin up an isolated bus. The module-level `Bus` singleton is the
// production default and is what every domain module hits.

import type { EventMap } from './types';

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export interface EventBus {
    on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void;
    emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
}

export function createEventBus(): EventBus {
    const channels = new Map<keyof EventMap, Set<Handler<keyof EventMap>>>();

    return {
        on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
            if (!channels.has(event)) channels.set(event, new Set());
            const set = channels.get(event)!;
            set.add(handler as Handler<keyof EventMap>);
            return () => set.delete(handler as Handler<keyof EventMap>);
        },

        emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
            const set = channels.get(event);
            if (!set) return;
            for (const fn of set) {
                try {
                    (fn as Handler<K>)(payload);
                } catch (err) {
                    // Logger isn't necessarily wired yet during early boot,
                    // so fall back to console.error directly.
                    console.error('[dtr] handler error', event, err);
                }
            }
        },
    };
}

export const Bus: EventBus = createEventBus();
