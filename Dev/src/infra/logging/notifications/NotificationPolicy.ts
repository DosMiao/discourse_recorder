// Decides whether a log event should surface as a user-facing toast and how
// it should look (type, duration). The policy is consulted twice:
//   1. NotificationOutput gates by namespace/level first (the cheap pass).
//   2. This class then walks the `rules` list for fine-grained matches and
//      dedupes by a (ns|level|op|message) key within windowMs.
//
// Wiring is done in two steps: serviceFactory calls setHandler(toast.show)
// after the Toast queue is created. Until then, log events with notification
// metadata are dropped silently — by design, so early-boot errors don't try
// to render before the UI exists.

import { LOG_CONFIG, type LogConfigShape } from '../config/LogConfig';
import { normalizeLevel } from '../core/LogLevels';
import type { ToastType } from '../../../core/types';

type NotifyHandler = (message: string, type: ToastType, duration?: number) => void;

interface NotificationLogEvent {
    namespace: string;
    operation: string;
    level: string;
    metadata?: Record<string, unknown>;
    options?: Record<string, unknown>;
}

export class NotificationPolicy {
    private config: LogConfigShape['notifications'];
    private handler: NotifyHandler | null;
    private recentKeys: Map<string, number>;

    constructor(config: LogConfigShape['notifications'] = LOG_CONFIG.notifications) {
        this.config = config;
        this.handler = null;
        this.recentKeys = new Map();
    }

    setHandler(fn: NotifyHandler | null): void {
        this.handler = typeof fn === 'function' ? fn : null;
    }

    shouldShow(
        namespace: string,
        operation: string,
        level: string,
        metadata: Record<string, unknown> = {},
        options: Record<string, unknown> = {}
    ): boolean {
        const notifyFlag =
            (options.notification as boolean | undefined) ??
            (metadata.notification as boolean | undefined);
        if (notifyFlag === true) return true;
        if (notifyFlag === false) return false;

        if (!this.config.enabled) return false;

        const canonicalLevel = normalizeLevel(level);
        if (!canonicalLevel || canonicalLevel === 'disabled') return false;

        const rules = this.config.rules || [];
        if (rules.length === 0) return false;

        return rules.some((rule) => {
            if (rule.ns && rule.ns !== namespace) return false;
            if (rule.level) {
                const ruleLevel = normalizeLevel(rule.level);
                if (!ruleLevel || ruleLevel !== canonicalLevel) return false;
            }
            if (rule.op) {
                if (typeof rule.op === 'string') {
                    return operation?.includes(rule.op);
                }
                if (rule.op instanceof RegExp) {
                    return rule.op.test(operation || '');
                }
            }
            return true;
        });
    }

    show(event: NotificationLogEvent): boolean {
        const { namespace, operation, level, metadata = {}, options = {} } = event;
        const canonicalLevel = normalizeLevel(level);
        if (!canonicalLevel || canonicalLevel === 'disabled') return false;

        if (!this.shouldShow(namespace, operation, level, metadata, options)) return false;

        const message = this.resolveMessage(metadata, operation);
        if (!message) return false;

        if (this.config.deduplication?.enabled) {
            const key = `${namespace}|${canonicalLevel}|${operation}|${message}`;
            const now =
                typeof performance !== 'undefined' && typeof performance.now === 'function'
                    ? performance.now()
                    : Date.now();
            const last = this.recentKeys.get(key) || 0;
            const windowMs = this.config.deduplication.windowMs || 0;
            if (now - last < windowMs) return false;
            this.recentKeys.set(key, now);
        }

        const type = this.resolveType(canonicalLevel, metadata, options);
        const duration = this.resolveDuration(canonicalLevel, metadata, options);

        if (!this.handler) return false;
        try {
            this.handler(message, type, duration);
            return true;
        } catch (error) {
            console.error('[NotificationPolicy] Handler error:', error);
            return false;
        }
    }

    private resolveMessage(metadata: Record<string, unknown>, operation: string): string {
        if (typeof metadata === 'string' && (metadata as string).trim()) {
            return (metadata as string).trim();
        }
        if (metadata && typeof metadata === 'object') {
            const m = metadata as { message?: unknown; text?: unknown };
            if (typeof m.message === 'string' && m.message.trim()) return m.message.trim();
            if (typeof m.text === 'string' && m.text.trim()) return m.text.trim();
        }
        if (typeof operation === 'string' && operation.trim()) return operation.trim();
        return '';
    }

    private resolveType(
        level: string,
        metadata: Record<string, unknown>,
        options: Record<string, unknown>
    ): ToastType {
        const fromOptions = options?.type;
        if (typeof fromOptions === 'string' && fromOptions.trim()) {
            return fromOptions.trim() as ToastType;
        }
        const fromMeta = metadata?.type;
        if (typeof fromMeta === 'string' && fromMeta.trim()) {
            return fromMeta.trim() as ToastType;
        }
        if (level === 'error') return 'error';
        if (level === 'warn') return 'warning';
        return 'info';
    }

    private resolveDuration(
        level: string,
        metadata: Record<string, unknown>,
        options: Record<string, unknown>
    ): number {
        const fromOptions = options?.duration;
        if (typeof fromOptions === 'number' && Number.isFinite(fromOptions)) return fromOptions;
        const fromMeta = metadata?.duration;
        if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) return fromMeta;
        const behavior = this.config.behavior || { duration: 3000, durationByLevel: {} };
        const byLevel = behavior.durationByLevel?.[level];
        if (typeof byLevel === 'number' && Number.isFinite(byLevel)) return byLevel;
        if (typeof behavior.duration === 'number' && Number.isFinite(behavior.duration)) {
            return behavior.duration;
        }
        return 3000;
    }
}

export const notificationPolicy = new NotificationPolicy();
export type { NotifyHandler };
