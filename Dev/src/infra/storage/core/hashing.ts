// Lightweight content-fingerprint cache. Each storage key maps to the hash
// of its last persisted value; before writing, the operator hashes the new
// serialised form and skips the write if unchanged. This matters when the
// same settings object is patched multiple times in a frame — without it,
// GM_setValue gets called once per patch even when nothing changes.

function simpleHash(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // force 32-bit integer
    }
    return hash;
}

export interface HashManager {
    computeHash(data: string): number;
    hasChanged(key: string, data: string): boolean;
    updateHash(key: string, hashOrData: string | number): void;
    getHash(key: string): number | undefined;
    clearHash(key: string): boolean;
    clearAllHashes(): void;
}

export function createHashManager(): HashManager {
    const hashCache = new Map<string, number>();

    return {
        computeHash(data: string): number {
            if (typeof data !== 'string') {
                throw new TypeError('Hash input must be a string');
            }
            return simpleHash(data);
        },

        hasChanged(key: string, data: string): boolean {
            const currentHash = simpleHash(data);
            const lastHash = hashCache.get(key);
            if (lastHash === undefined) return true;
            return currentHash !== lastHash;
        },

        updateHash(key: string, hashOrData: string | number): void {
            const hash = typeof hashOrData === 'number' ? hashOrData : simpleHash(hashOrData);
            hashCache.set(key, hash);
        },

        getHash(key: string): number | undefined {
            return hashCache.get(key);
        },

        clearHash(key: string): boolean {
            return hashCache.delete(key);
        },

        clearAllHashes(): void {
            hashCache.clear();
        },
    };
}
