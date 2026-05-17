// Service composition root. Builds every cross-cutting dependency the rest
// of the script needs and returns them as a single object. The initializer
// passes this bag downstream — no module reaches into createX() directly.
//
// Mirrors AmexOfferMax's serviceFactory pattern: factory functions in,
// fully-wired services out.

import { SCRIPT_CONFIG, STORAGE_KEYS, type ScriptConfig } from './config';
import { createStorage, type Storage } from '../infra/storage/storage';
import { createLogger, type Logger } from '../infra/logging/logger';
import { createI18n, type I18n } from '../infra/i18n/i18n';
import { createEventBus, type EventBus } from '../core/eventBus';
import { createStore, type Store } from '../core/store';
import { createTheme, type Theme } from '../ui/styles/darkMode';
import { createToastQueue, type ToastQueue } from '../ui/components/Toast';

export interface ApplicationServices {
    config: ScriptConfig;
    storage: Storage;
    logger: Logger;
    bus: EventBus;
    store: Store;
    theme: Theme;
    i18n: I18n;
    toast: ToastQueue;
}

export function createApplicationServices(): ApplicationServices {
    const storage = createStorage();
    const bus = createEventBus();
    const store = createStore({ storage, bus });
    const theme = createTheme({ storage, store, bus });
    const i18n = createI18n({ storage, storageKey: STORAGE_KEYS.locale });
    const toast = createToastQueue();
    const logger = createLogger({ level: 'info' });

    // Bubble error-level logs to a toast once Toast is mounted. The toast
    // container itself lazily ensures the #dtr-root element, so this is safe
    // to wire before the dock is mounted.
    logger.setNotificationSink((message, type, duration) => {
        toast.show(message, type, duration);
    });

    // Mirror locale changes onto the bus so UI components can react.
    i18n.onChange((locale) => {
        bus.emit('locale:changed', { locale });
    });

    return {
        config: SCRIPT_CONFIG,
        storage,
        logger,
        bus,
        store,
        theme,
        i18n,
        toast,
    };
}
