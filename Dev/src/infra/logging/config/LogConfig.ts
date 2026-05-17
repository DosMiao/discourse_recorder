// Default logging configuration. Edit NAMESPACE_LEVELS to mute a single
// subsystem ('disabled') or surface its debug stream ('debug'). The
// notifications block governs the user-facing toast bridge — by default
// only the 'main' namespace pages info+ to a toast, so the recorder's
// per-tick logs don't spam the user.

const NAMESPACE_LEVELS: Record<string, string> = {
    bootstrap: 'info',
    main: 'info',
    recorder: 'info',
    exporter: 'info',
    extractor: 'info',
    storage: 'info',
    render: 'info',
    ui: 'info',
    theme: 'info',
    i18n: 'info',
};

export interface LogConfigShape {
    namespaceFiltering: {
        console: Record<string, string>;
        notifications: Record<string, string>;
    };
    console: {
        enabled: boolean;
        defaultLevel: string;
        useColors: boolean;
        showTime: boolean;
        showDelta: boolean;
        showTotal: boolean;
        showObject: boolean;
        alignNamespaces: boolean;
        namespaceWidth: number;
        objectMaxLen: number;
        redactKeys: string[];
    };
    notifications: {
        enabled: boolean;
        defaultLevel: string;
        rules: Array<{ ns?: string; level?: string; op?: string | RegExp }>;
        behavior: {
            duration: number;
            durationByLevel: Record<string, number>;
        };
        deduplication: {
            enabled: boolean;
            windowMs: number;
        };
    };
}

export const LOG_CONFIG: LogConfigShape = {
    namespaceFiltering: {
        console: NAMESPACE_LEVELS,
        notifications: NAMESPACE_LEVELS,
    },

    console: {
        enabled: true,
        defaultLevel: 'info',
        useColors: true,
        showTime: true,
        showDelta: true,
        showTotal: false,
        showObject: true,
        alignNamespaces: true,
        namespaceWidth: 10,
        objectMaxLen: 2000,
        redactKeys: [],
    },

    notifications: {
        enabled: true,
        defaultLevel: 'error',
        rules: [{ ns: 'main', level: 'info' }, { level: 'error' }],

        behavior: {
            duration: 3000,
            durationByLevel: {
                error: 5000,
                info: 3000,
                debug: 2000,
            },
        },

        deduplication: {
            enabled: true,
            windowMs: 3000,
        },
    },
};
