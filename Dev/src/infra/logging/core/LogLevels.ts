// Log-level vocabulary and gating math. 'debug' is the most verbose, 'error'
// the loudest. A namespace set to 'info' admits info+error but drops debug.
// 'disabled'/'off' mutes the namespace entirely. `warn` is folded into
// `error` so users transitioning from console.warn don't accidentally
// down-rank the alert.

export type CanonicalLevel = 'error' | 'info' | 'debug';
export type LevelInput = CanonicalLevel | 'warn' | 'all' | 'verbose' | 'trace' | 'disabled' | 'off' | string;

const LOG_LEVELS: CanonicalLevel[] = ['error', 'info', 'debug'];

const LEVEL_PRIORITY: Record<CanonicalLevel, number> = Object.freeze(
    LOG_LEVELS.reduce(
        (acc, level, index) => {
            acc[level] = index;
            return acc;
        },
        Object.create(null) as Record<CanonicalLevel, number>
    )
);

const DISABLED_TOKENS = new Set(['disabled', 'off']);

const NORMALIZED_ALIASES: Record<string, CanonicalLevel> = Object.freeze({
    all: 'debug',
    verbose: 'debug',
    trace: 'debug',
    warn: 'error',
});

function normalize(value: unknown): CanonicalLevel | 'disabled' | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;

    if (DISABLED_TOKENS.has(trimmed)) return 'disabled';
    if (LEVEL_PRIORITY[trimmed as CanonicalLevel] !== undefined) {
        return trimmed as CanonicalLevel;
    }
    if (NORMALIZED_ALIASES[trimmed]) return NORMALIZED_ALIASES[trimmed];
    return null;
}

export const normalizeLevel = (value: unknown): CanonicalLevel | 'disabled' | null => normalize(value);

export const isLevelEnabled = (threshold: unknown, level: unknown): boolean => {
    const normalizedLevel = normalize(level);
    if (!normalizedLevel || normalizedLevel === 'disabled') return false;

    const normalizedThreshold = normalize(threshold);
    if (!normalizedThreshold || normalizedThreshold === 'disabled') return false;

    const thresholdKey =
        (NORMALIZED_ALIASES[normalizedThreshold] as CanonicalLevel | undefined) ??
        (normalizedThreshold as CanonicalLevel);
    return LEVEL_PRIORITY[normalizedLevel] <= LEVEL_PRIORITY[thresholdKey];
};
