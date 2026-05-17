// Namespaced logger. Each module asks for a `logger.namespace('recorder')`
// (etc.) and gets back a small object with `.info`, `.warn`, `.error`. Output
// goes to console by default and — if a notification sink is registered —
// optionally bubbles up to a UI toast.
//
// The shape mirrors AmexOfferMax's logService: cheap to call from hot paths,
// no allocation when the level is filtered out.

import type { ToastType } from '../../core/types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
    message?: string;
    [key: string]: unknown;
}

export interface LogOptions {
    // If true and a notification sink is registered, also emit a toast.
    notification?: boolean;
    // Override the inferred toast type. By default error → 'error',
    // warn → 'warning', info → 'info'.
    type?: ToastType;
    duration?: number;
}

export interface LogNamespace {
    debug(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    info(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    warn(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    error(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
}

export type NotificationSink = (
    message: string,
    type: ToastType,
    duration?: number
) => void;

export interface Logger {
    namespace(name: string): LogNamespace;
    // Wire up a toast sink after the UI is ready. Until this is called,
    // notification: true is a no-op (logs still print to console).
    setNotificationSink(sink: NotificationSink | null): void;
    setLevel(level: LogLevel): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

function inferToastType(level: LogLevel): ToastType {
    if (level === 'error') return 'error';
    if (level === 'warn') return 'warning';
    return 'info';
}

export function createLogger(
    options: { level?: LogLevel; prefix?: string } = {}
): Logger {
    let currentLevel: LogLevel = options.level ?? 'info';
    let sink: NotificationSink | null = null;
    const prefix = options.prefix ?? '[dtr]';

    function emit(
        ns: string,
        level: LogLevel,
        operation: string,
        metadata?: LogMetadata,
        opts?: LogOptions
    ): void {
        if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return;
        const tag = `${prefix} ${ns}/${operation}`;
        const args: unknown[] = metadata ? [tag, metadata] : [tag];

        // console.* selection — debug is opt-in via console.debug so prod
        // builds with default Chrome filter hide it.
        const out =
            level === 'error'
                ? console.error
                : level === 'warn'
                  ? console.warn
                  : level === 'debug'
                    ? console.debug
                    : console.info;
        out.apply(console, args);

        if (opts?.notification && sink) {
            const msg = metadata?.message ?? operation;
            const toastType = opts.type ?? inferToastType(level);
            sink(String(msg), toastType, opts.duration);
        }
    }

    return {
        namespace(name: string): LogNamespace {
            return {
                debug: (op, meta, opts) => emit(name, 'debug', op, meta, opts),
                info: (op, meta, opts) => emit(name, 'info', op, meta, opts),
                warn: (op, meta, opts) => emit(name, 'warn', op, meta, opts),
                error: (op, meta, opts) => emit(name, 'error', op, meta, opts),
            };
        },
        setNotificationSink(next) {
            sink = next;
        },
        setLevel(level) {
            currentLevel = level;
        },
    };
}

export const logger: Logger = createLogger();
