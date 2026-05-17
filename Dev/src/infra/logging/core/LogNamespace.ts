// Per-namespace facade returned by LogService.namespace('recorder'). Each
// call site captures the namespace once and uses .info/.warn/.error without
// repeating the namespace string. `span` brackets a synchronous or async
// operation and emits a `.start` debug followed by a `.done` line with the
// elapsed milliseconds — handy for timing capture passes and exports.

export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
    message?: string;
    [key: string]: unknown;
}

export interface LogOptions {
    notification?: boolean;
    type?: string;
    duration?: number;
    console?: boolean;
    [key: string]: unknown;
}

interface LogServiceLike {
    log: (
        ns: string,
        op: string,
        level: string,
        metadata?: LogMetadata,
        options?: LogOptions
    ) => void;
    clock: { now: () => number };
}

export interface LogSpan {
    end(metadata?: LogMetadata, level?: LogLevelName): void;
}

export interface LogNamespace {
    error(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    warn(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    info(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    debug(operation: string, metadata?: LogMetadata, options?: LogOptions): void;
    span(operation: string, metadata?: LogMetadata): LogSpan;
}

export function createLogNamespace(name: string, logService: LogServiceLike): LogNamespace {
    const log = (
        level: LogLevelName,
        operation: string,
        metadata: LogMetadata,
        options: LogOptions
    ): void => logService.log(name, operation, level, metadata, options);

    return {
        error: (operation, metadata = {}, options = {}) =>
            log('error', operation, metadata, options),
        warn: (operation, metadata = {}, options = {}) =>
            log('warn', operation, metadata, options),
        info: (operation, metadata = {}, options = {}) =>
            log('info', operation, metadata, options),
        debug: (operation, metadata = {}, options = {}) =>
            log('debug', operation, metadata, options),

        span(operation, metadata = {}): LogSpan {
            const startTime = logService.clock.now();
            log('debug', `${operation}.start`, metadata, {});

            return {
                end: (endMetadata: LogMetadata = {}, level: LogLevelName = 'debug'): void => {
                    const duration = Math.round(logService.clock.now() - startTime);
                    log(
                        level,
                        `${operation}.done`,
                        { ...endMetadata, durationMs: duration },
                        {}
                    );
                },
            };
        },
    };
}
