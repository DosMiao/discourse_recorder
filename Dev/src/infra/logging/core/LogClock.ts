// High-resolution clock for log timing. Falls back to Date.now() when
// performance.now is unavailable (older userscript managers, sandboxed
// contexts). Exposes both a continuous timeline (now/total) and a per-call
// delta so the formatter can render +Xms between adjacent log lines.

class LogClock {
    private hasPerformance: boolean;
    private t0: number;
    private lastLog: number;

    constructor() {
        this.hasPerformance =
            typeof performance !== 'undefined' && typeof performance.now === 'function';
        this.t0 = this.now();
        this.lastLog = this.t0;
    }

    now(): number {
        return this.hasPerformance ? performance.now() : Date.now();
    }

    stamp(): { current: number; delta: number; total: number } {
        const current = this.now();
        const delta = current - this.lastLog;
        const total = current - this.t0;
        this.lastLog = current;
        return { current, delta, total };
    }

    formatTime(): string {
        const d = new Date();
        const pad = (n: number): string => String(n).padStart(2, '0');
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        const ms = String(d.getMilliseconds()).padStart(3, '0');
        return `${hh}:${mm}:${ss}.${ms}`;
    }

    reset(): void {
        this.t0 = this.now();
        this.lastLog = this.t0;
    }
}

export const logClock = new LogClock();
export type { LogClock };
