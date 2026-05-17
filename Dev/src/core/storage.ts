// Persistence layer. GM_setValue is the canonical store (survives across
// origins, cross-browser-sync via Tampermonkey's account), but it isn't
// guaranteed when @grant is missing or when running under Violentmonkey's
// pageContext injection — so we dual-write to localStorage as a fallback.
// Reads prefer GM first, then fall back to localStorage.

const hasGM =
    typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

export const Storage = {
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
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serialized);
        } catch {
            // non-critical; storage is best-effort
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
