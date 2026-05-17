// Persistence layer. GM_setValue is the canonical store (survives cross-origin,
// syncs across browsers via Tampermonkey's account), but it isn't guaranteed
// when @grant is missing or when running under Violentmonkey's pageContext
// injection — so we dual-write to localStorage as a fallback. Reads prefer GM
// first, then fall back to localStorage.

// Factory shape mirrors the rest of the bootstrap so tests can inject a stub
// storage. The default module-level export uses real GM_* / localStorage and
// is enough for production.

export interface Storage {
    get<T>(key: string, fallback: T): T;
    set<T>(key: string, value: T): void;
    del(key: string): void;
}

interface StorageDeps {
    // Detect-once at construction time so we don't pay the typeof cost on
    // every read in hot paths (recorder ticks).
    hasGM?: boolean;
}

export function createStorage(deps: StorageDeps = {}): Storage {
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
                // non-critical; storage is best-effort under hostile @grants
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

// Default singleton — most call-sites just import this. Tests can build their
// own with createStorage().
export const Storage: Storage = createStorage();
