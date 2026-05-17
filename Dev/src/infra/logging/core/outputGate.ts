// Decides whether a (namespace, level) pair should reach a given output.
// The explicit flag wins (so callers can force-show or force-hide a single
// log line); otherwise the per-namespace level table is consulted, falling
// back to the output's default level if no override exists.

import { isLevelEnabled, normalizeLevel } from './LogLevels';

interface GateConfig {
    enabled: boolean;
    defaultLevel: string;
}

export function resolveLevelGate(
    config: GateConfig,
    namespaceLevels: Record<string, string>,
    namespace: string,
    level: string,
    explicitFlag: boolean | undefined
): boolean {
    const normalizedLevel = normalizeLevel(level);
    if (!normalizedLevel) return false;

    if (explicitFlag === false) return false;
    if (explicitFlag === true) return true;

    if (!config.enabled) return false;

    const nsLevel = namespaceLevels[namespace] ?? config.defaultLevel;
    return isLevelEnabled(nsLevel, normalizedLevel);
}

export type { GateConfig };
