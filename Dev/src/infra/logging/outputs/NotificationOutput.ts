// Bridge between LogService and the NotificationPolicy. Each log event is
// gated by the namespace/level table before being handed to the policy,
// which does its own pattern matching and dedup. The actual UI rendering
// is performed by whatever handler the policy points at (typically the
// Toast queue, wired in serviceFactory).

import { resolveLevelGate, type GateConfig } from '../core/outputGate';
import type { NotificationPolicy } from '../notifications/NotificationPolicy';

interface NotificationOutputConfig extends GateConfig {
    namespaceLevels?: Record<string, string>;
}

interface LogEvent {
    namespace: string;
    operation: string;
    level: string;
    metadata?: Record<string, unknown>;
    options?: Record<string, unknown>;
}

export class NotificationOutput {
    private config: NotificationOutputConfig;
    private manager: NotificationPolicy;
    private namespaceLevels: Record<string, string>;

    constructor(config: NotificationOutputConfig, notificationPolicy: NotificationPolicy) {
        this.config = { ...config };
        this.manager = notificationPolicy;
        this.namespaceLevels = { ...(config.namespaceLevels || {}) };
    }

    show(event: LogEvent): boolean {
        const explicit = event.options?.notification as boolean | undefined;
        if (
            !resolveLevelGate(
                this.config,
                this.namespaceLevels,
                event.namespace,
                event.level,
                explicit
            )
        ) {
            return false;
        }
        return this.manager.show(event);
    }
}

export type { NotificationOutputConfig, LogEvent };
