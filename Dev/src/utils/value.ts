// Generic value-shape helpers. Kept small on purpose — anything fancier
// belongs in its own utility file (date, async, deepClone, etc.).

export function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

export function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
}

export function safeFilename(name: string, fallback = 'recording'): string {
    return (
        (name || fallback)
            .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
            .slice(0, 120)
            .trim() || fallback
    );
}

// YYYY-MM-DD in local time. Used for session-prefix dates so a recording
// straddling UTC midnight keeps the user-visible "today" calendar date.
export function localDate(d: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
