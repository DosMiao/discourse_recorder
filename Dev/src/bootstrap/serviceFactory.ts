// Service composition root. Builds every cross-cutting dependency the rest
// of the script needs and returns them as a single object. The initializer
// passes this bag downstream — no module reaches into createX() directly.
//
// Mirrors AmexOfferMax's serviceFactory pattern: takes SCRIPT_CONFIG as
// argument (so tests can inject a stub config), wires logService with the
// notification policy, exposes one log namespace per subsystem, and
// returns the bag fully wired.

import type { ScriptConfig } from './config';
import { storageOP, type StorageOperator } from '../infra/storage/storageOperator';
import { logService } from '../infra/logging/core/LogService';
import { notificationPolicy, type NotificationPolicy } from '../infra/logging/notifications/NotificationPolicy';
import { createI18n, type I18n } from '../infra/i18n/i18n';
import { Bus, type EventBus } from '../core/eventBus';
import { Store, type Store as StoreT } from '../core/store';
import { Theme, type Theme as ThemeT } from '../ui/styles/darkMode';
import { createToastQueue, type ToastQueue } from '../ui/components/Toast';
import type { LogNamespace } from '../infra/logging/core/LogNamespace';

export interface ApplicationServices {
    config: ScriptConfig;
    storageOP: StorageOperator;
    bus: EventBus;
    store: StoreT;
    theme: ThemeT;
    i18n: I18n;
    toast: ToastQueue;
    notificationPolicy: NotificationPolicy;
    logMain: LogNamespace;
    logBootstrap: LogNamespace;
    logRecorder: LogNamespace;
    logExporter: LogNamespace;
    logExtractor: LogNamespace;
    logStorage: LogNamespace;
    logRender: LogNamespace;
    logUI: LogNamespace;
    logTheme: LogNamespace;
    logI18n: LogNamespace;
}

export function createApplicationServices(scriptConfig: ScriptConfig): ApplicationServices {
    // Hook the notification policy into LogService first so any subsequent
    // log line with `notification: true` can find a route — even before the
    // toast queue exists, the policy can buffer the call until setHandler
    // wires up the UI.
    logService.setNotificationPolicy(notificationPolicy);

    const logMain = logService.namespace('main');
    const logBootstrap = logService.namespace('bootstrap');
    const logRecorder = logService.namespace('recorder');
    const logExporter = logService.namespace('exporter');
    const logExtractor = logService.namespace('extractor');
    const logStorage = logService.namespace('storage');
    const logRender = logService.namespace('render');
    const logUI = logService.namespace('ui');
    const logTheme = logService.namespace('theme');
    const logI18n = logService.namespace('i18n');

    logMain.info('bootstrap', {
        message: 'script start',
        version: scriptConfig.VERSION,
        build: scriptConfig.BUILD_DATE,
    });

    // Singletons are the production wiring. The serviceFactory exposes
    // them via the bag too so DI consumers (and tests) can pick either
    // path without code paths diverging.
    const bus = Bus;
    const store = Store;
    const theme = Theme;
    const i18n: I18n = createI18n({
        storage: storageOP,
        storageKey: scriptConfig.STORAGE_KEYS.locale,
    });
    const toast = createToastQueue();

    // Bridge toast through the notification policy so every notification
    // path — direct toast.show(), log.info(..., {notification:true}) — ends
    // at the same queue.
    notificationPolicy.setHandler((message, type, duration) => {
        toast.show(message, type, duration);
    });

    // Mirror locale changes onto the bus so UI components can react.
    i18n.onChange((locale) => {
        bus.emit('locale:changed', { locale });
    });

    return {
        config: scriptConfig,
        storageOP,
        bus,
        store,
        theme,
        i18n,
        toast,
        notificationPolicy,
        logMain,
        logBootstrap,
        logRecorder,
        logExporter,
        logExtractor,
        logStorage,
        logRender,
        logUI,
        logTheme,
        logI18n,
    };
}
