// Composition root for logging. One LogService instance owns all
// namespaces, a console output, and (optionally) a notification output
// connected via setNotificationPolicy. Modules import the `logService`
// singleton and call `.namespace('recorder')` once at module-load to get
// their dedicated facade.

import { logClock, type LogClock } from './LogClock';
import { createLogNamespace, type LogNamespace, type LogMetadata, type LogOptions } from './LogNamespace';
import { ConsoleOutput } from '../outputs/ConsoleOutput';
import { NotificationOutput } from '../outputs/NotificationOutput';
import { LOG_CONFIG, type LogConfigShape } from '../config/LogConfig';
import type { NotificationPolicy } from '../notifications/NotificationPolicy';

class LogService {
    clock: LogClock;
    private namespaces: Map<string, LogNamespace>;
    private consoleOutput: ConsoleOutput;
    private notificationConfig: LogConfigShape['notifications'] & {
        namespaceLevels?: Record<string, string>;
    };
    private notificationOutput: NotificationOutput | null;

    constructor(config: LogConfigShape = LOG_CONFIG) {
        this.clock = logClock;
        this.namespaces = new Map();

        this.consoleOutput = new ConsoleOutput({
            ...config.console,
            namespaceLevels: config.namespaceFiltering?.console || {},
        });

        this.notificationConfig = {
            ...config.notifications,
            namespaceLevels: config.namespaceFiltering?.notifications || {},
        };
        this.notificationOutput = null;
    }

    namespace(name: string): LogNamespace {
        let ns = this.namespaces.get(name);
        if (!ns) {
            ns = createLogNamespace(name, this);
            this.namespaces.set(name, ns);
        }
        return ns;
    }

    log(
        namespace: string,
        operation: string,
        level: string,
        metadata: LogMetadata = {},
        options: LogOptions = {}
    ): void {
        const timing = this.clock.stamp();
        const event = { namespace, operation, level, metadata, options, timing };

        this.consoleOutput.render(
            namespace,
            operation,
            level,
            metadata,
            timing,
            options
        );
        if (this.notificationOutput) {
            this.notificationOutput.show(event);
        }
    }

    setNotificationPolicy(policy: NotificationPolicy | null): void {
        if (!policy) return;
        this.notificationOutput = new NotificationOutput(this.notificationConfig, policy);
    }
}

export const logService = new LogService();
export type { LogService };
