// Storage policy config. Currently just toggles around persistence dedup —
// kept as its own module so future tunables (per-key TTLs, separate
// namespaces) have a home that doesn't bloat the operator.

export const STORAGE_CONFIG = {
    // Skip persist when a write produces the same serialized form as the
    // last persisted value. Disable for debugging.
    deduplicate: true,
    // Coalesce writes to the same key within this window into a single
    // GM_setValue call. 0 = synchronous (no coalescing).
    saveDelayMs: 0,
} as const;

export type StorageConfig = typeof STORAGE_CONFIG;
