// Routes log events to console.log via LogFormatter, gated by the
// per-namespace level table. Each LogService instance owns one
// ConsoleOutput; replacing the config requires re-instantiation.

import { LogFormatter, type FormatterConfig, type TimingInfo } from '../core/LogFormatter';
import { resolveLevelGate } from '../core/outputGate';
import type { LogMetadata, LogOptions } from '../core/LogNamespace';

interface ConsoleOutputConfig extends FormatterConfig {
    enabled: boolean;
    defaultLevel: string;
    namespaceLevels?: Record<string, string>;
}

export class ConsoleOutput {
    private config: ConsoleOutputConfig;
    private namespaceLevels: Record<string, string>;
    private formatter: LogFormatter;

    constructor(config: ConsoleOutputConfig) {
        this.config = { ...config };
        this.namespaceLevels = { ...(config.namespaceLevels || {}) };
        this.formatter = new LogFormatter({ ...config });
    }

    render(
        namespace: string,
        operation: string,
        level: string,
        metadata: LogMetadata | undefined,
        timing: TimingInfo,
        options: LogOptions = {}
    ): void {
        if (
            !resolveLevelGate(
                this.config,
                this.namespaceLevels,
                namespace,
                level,
                options.console
            )
        ) {
            return;
        }
        this.formatter.output(
            namespace,
            operation,
            level,
            metadata as Record<string, unknown>,
            timing,
            options as Record<string, unknown>
        );
    }
}

export type { ConsoleOutputConfig };
