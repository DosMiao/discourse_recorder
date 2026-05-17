// Renders a log event to console.log with optional CSS styles. Styled output
// uses Chrome's %c substitution to colour each segment by namespace and
// level. Plain output is used when useColors is false (e.g. unit tests or
// non-Chromium engines that strip styling).

import { logClock } from './LogClock';
import { normalizeLevel } from './LogLevels';

interface FormatterConfig {
    useColors?: boolean;
    showTime?: boolean;
    showDelta?: boolean;
    showTotal?: boolean;
    showObject?: boolean;
    alignNamespaces?: boolean;
    namespaceWidth?: number;
    objectMaxLen?: number;
    redactKeys?: string[];
}

interface TimingInfo {
    current: number;
    delta: number;
    total: number;
}

const Colors = {
    namespace: {
        bootstrap: '#FF6B6B',
        main: '#FF6B6B',
        recorder: '#4ECDC4',
        exporter: '#FFE66D',
        extractor: '#95E1D3',
        storage: '#F38181',
        render: '#AA96DA',
        ui: '#FCBAD3',
        theme: '#FFCCBC',
        i18n: '#B2EBF2',
    } as Record<string, string>,
    level: {
        error: '#FF0000',
        info: '#00BFFF',
        debug: '#90EE90',
    } as Record<string, string>,
    time: '#9B9B9B',
    operation: '#FFFFFF',
    data: '#B0B0B0',
};

export class LogFormatter {
    private config: FormatterConfig;

    constructor(config: FormatterConfig) {
        this.config = { ...config };
    }

    updateConfig(config: FormatterConfig): void {
        this.config = { ...config };
    }

    output(
        namespace: string,
        operation: string,
        level: string,
        metadata: Record<string, unknown> | undefined,
        timing: TimingInfo,
        options: Record<string, unknown> = {}
    ): void {
        if (this.config.useColors) {
            this.outputStyled(namespace, operation, level, metadata, timing, options);
        } else {
            this.outputPlain(namespace, operation, level, metadata, timing, options);
        }
    }

    private outputStyled(
        namespace: string,
        operation: string,
        level: string,
        metadata: Record<string, unknown> | undefined,
        timing: TimingInfo,
        options: Record<string, unknown>
    ): void {
        const styles: string[] = [];
        const canonicalLevel = normalizeLevel(level) || level;
        const parts: string[] = [];

        const nsColor = Colors.namespace[namespace] || '#FFFFFF';
        const paddedNs = this.padNamespace(namespace);
        parts.push('%c[%s]');
        styles.push(`color: ${nsColor}; font-weight: bold;`, paddedNs);

        if (this.config.showTime || this.config.showDelta || this.config.showTotal) {
            const timeParts: string[] = [];
            if (this.config.showTime) timeParts.push(logClock.formatTime());
            if (this.config.showTotal) timeParts.push(`${timing.total.toFixed(1)}ms`);
            if (this.config.showDelta) timeParts.push(`+${timing.delta.toFixed(1)}ms`);
            parts.push('%c[%s]');
            styles.push(`color: ${Colors.time};`, timeParts.join(' | '));
        }

        const notifyFlag = options.notification ? 1 : 0;
        parts.push('%c[Noti: %s]');
        styles.push(
            `color: ${options.notification ? '#4ECDC4' : '#666'};`,
            String(notifyFlag)
        );

        const levelColor = Colors.level[canonicalLevel as string] || '#FFFFFF';
        const isAlertLevel = canonicalLevel === 'error';
        const levelStyle = isAlertLevel
            ? `background: ${levelColor}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 3px;`
            : `color: ${levelColor}; font-weight: bold;`;
        parts.push('%c%s');
        styles.push(levelStyle, String(canonicalLevel || level).toUpperCase());

        if (operation) {
            parts.push('%c%s');
            styles.push(`color: ${Colors.operation}; font-weight: 600;`, operation);
        }

        const dataStr = this.serializeMetadata(metadata);
        if (dataStr) {
            parts.push('%c%s');
            styles.push(`color: ${Colors.data}; font-style: italic;`, dataStr);
        }

        // eslint-disable-next-line no-console
        console.log(parts.join(' '), ...styles);
    }

    private outputPlain(
        namespace: string,
        operation: string,
        level: string,
        metadata: Record<string, unknown> | undefined,
        timing: TimingInfo,
        options: Record<string, unknown>
    ): void {
        const line = this.formatPlain(namespace, operation, level, metadata, timing, options);
        // eslint-disable-next-line no-console
        console.log(line);
    }

    private formatPlain(
        namespace: string,
        operation: string,
        level: string,
        metadata: Record<string, unknown> | undefined,
        timing: TimingInfo,
        options: Record<string, unknown>
    ): string {
        const paddedNs = this.padNamespace(namespace);
        const parts: string[] = [`[${paddedNs}]`];
        const canonicalLevel = normalizeLevel(level) || level;

        if (this.config.showTime || this.config.showDelta || this.config.showTotal) {
            const timeParts: string[] = [];
            if (this.config.showTime) timeParts.push(logClock.formatTime());
            if (this.config.showTotal && typeof timing?.total === 'number') {
                timeParts.push(`${timing.total.toFixed(1)}ms`);
            }
            if (this.config.showDelta && typeof timing?.delta === 'number') {
                timeParts.push(`+${timing.delta.toFixed(1)}ms`);
            }
            if (timeParts.length > 0) parts.push(`[${timeParts.join(' | ')}]`);
        }

        const notifyFlag = options.notification ? 1 : 0;
        parts.push(`[Noti: ${notifyFlag}]`);

        parts.push(String(canonicalLevel || level).toUpperCase());
        if (operation) parts.push(operation);

        const dataStr = this.serializeMetadata(metadata);
        return parts.join(' ') + dataStr;
    }

    private padNamespace(ns: string): string {
        if (!this.config.alignNamespaces) return ns;
        return ns.padEnd(this.config.namespaceWidth || 10, ' ');
    }

    private serializeMetadata(metadata: Record<string, unknown> | undefined): string {
        if (!this.config.showObject || !metadata || Object.keys(metadata).length === 0) {
            return '';
        }

        try {
            const redactKeys = this.config.redactKeys ?? [];
            const redacter = (k: string, v: unknown): unknown => {
                return redactKeys.includes(k) ? '[REDACTED]' : v;
            };
            let s = JSON.stringify(metadata, redacter);
            const maxLen = this.config.objectMaxLen ?? 2000;
            if (s.length > maxLen) s = s.slice(0, maxLen) + '...';
            return ' ' + s;
        } catch {
            return ' [unserializable]';
        }
    }
}

export type { FormatterConfig, TimingInfo };
