// Persistence adapter. GM_setValue is the canonical store (Tampermonkey
// syncs across devices and survives cross-origin), but it isn't guaranteed
// when @grant is missing or when running under Violentmonkey's pageContext
// injection — so we dual-write to localStorage as a fallback. Reads prefer
// GM first, then fall back to localStorage. hasGM is detected once at
// construction time so we don't pay the typeof cost on every read.

export interface PersistenceAdapter {
    get<T>(key: string, fallback: T): T;
    set<T>(key: string, value: T): void;
    setSerialized(key: string, serialized: string, value: unknown): void;
    del(key: string): void;
}

interface PersistenceDeps {
    hasGM?: boolean;
}

export function createPersistenceAdapter(deps: PersistenceDeps = {}): PersistenceAdapter {
    const hasGM =
        deps.hasGM ??
        (typeof GM_getValue === 'function' && typeof GM_setValue === 'function');

    return {
        get<T>(key: string, fallback: T): T {
            try {
                if (hasGM) {
                    const v = GM_getValue<T | undefined>(key, undefined);
                    if (v !== undefined) return v as T;
                }
                const raw = localStorage.getItem(key);
                if (raw === null) return fallback;
                try {
                    return JSON.parse(raw) as T;
                } catch {
                    return raw as unknown as T;
                }
            } catch {
                return fallback;
            }
        },

        set<T>(key: string, value: T): void {
            try {
                if (hasGM) GM_setValue(key, value);
                const serialized =
                    typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, serialized);
            } catch {
                // non-critical: storage is best-effort under hostile @grants
            }
        },

        setSerialized(key: string, serialized: string, value: unknown): void {
            try {
                if (hasGM) GM_setValue(key, value);
                localStorage.setItem(key, serialized);
            } catch {
                // non-critical
            }
        },

        del(key: string): void {
            try {
                if (hasGM && typeof GM_deleteValue === 'function') GM_deleteValue(key);
                localStorage.removeItem(key);
            } catch {
                // non-critical
            }
        },
    };
}
