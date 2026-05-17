// Bilingual i18n. Auto-detects the user's locale on first load:
//   - explicit override in storage (set via the settings panel) wins
//   - else any `zh*` navigator.language → Chinese
//   - else → English
//
// Keys live in zh.ts; en.ts mirrors them via a Record<StringKey, string> so
// adding a key to one catalog without the other is a compile error.

import { ZH_STRINGS, type StringKey } from './zh';
import { EN_STRINGS } from './en';
import { storageOP, type StorageOperator } from '../storage/storageOperator';
import { STORAGE_KEYS } from '../../bootstrap/config';

export type Locale = 'zh' | 'en';
export type LocalePreference = Locale | 'system';

const CATALOGS: Record<Locale, Record<StringKey, string>> = {
    zh: ZH_STRINGS,
    en: EN_STRINGS,
};

export interface I18n {
    t(key: StringKey, vars?: Record<string, string | number>): string;
    locale(): Locale;
    preference(): LocalePreference;
    setPreference(next: LocalePreference): void;
    onChange(handler: (locale: Locale) => void): () => void;
}

function detectSystemLocale(): Locale {
    if (typeof navigator !== 'undefined') {
        const lang = (navigator.language || (navigator as { userLanguage?: string }).userLanguage || '').toLowerCase();
        if (lang.startsWith('zh')) return 'zh';
    }
    return 'en';
}

function resolveLocale(pref: LocalePreference): Locale {
    if (pref === 'system') return detectSystemLocale();
    return pref;
}

interface I18nDeps {
    storage: StorageOperator;
    storageKey: string;
}

export function createI18n(deps: I18nDeps): I18n {
    const { storage, storageKey } = deps;
    let preference: LocalePreference =
        storage.get<LocalePreference>(storageKey, 'system');
    let locale: Locale = resolveLocale(preference);
    const handlers = new Set<(locale: Locale) => void>();

    // Re-evaluate on OS language change. Browsers don't emit a `languagechange`
    // event reliably, but when they do we want to honor it for users on
    // 'system' preference.
    if (typeof window !== 'undefined') {
        window.addEventListener('languagechange', () => {
            if (preference !== 'system') return;
            const next = detectSystemLocale();
            if (next === locale) return;
            locale = next;
            for (const h of handlers) {
                try {
                    h(locale);
                } catch {
                    /* handler errors must not break the i18n loop */
                }
            }
        });
    }

    function interpolate(template: string, vars?: Record<string, string | number>): string {
        if (!vars) return template;
        return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
            name in vars ? String(vars[name]) : `{${name}}`
        );
    }

    return {
        t(key, vars) {
            const catalog = CATALOGS[locale];
            const value = catalog[key] ?? ZH_STRINGS[key] ?? key;
            return interpolate(value, vars);
        },
        locale(): Locale {
            return locale;
        },
        preference(): LocalePreference {
            return preference;
        },
        setPreference(next) {
            preference = next;
            storage.set(storageKey, next);
            const resolved = resolveLocale(next);
            if (resolved === locale) return;
            locale = resolved;
            for (const h of handlers) {
                try {
                    h(locale);
                } catch {
                    /* swallow */
                }
            }
        },
        onChange(handler) {
            handlers.add(handler);
            return () => handlers.delete(handler);
        },
    };
}

export type { StringKey } from './zh';

// Default singleton — wired against the production storageOP. Modules that
// just want to localise a string can import this directly.
export const I18n: I18n = createI18n({
    storage: storageOP,
    storageKey: STORAGE_KEYS.locale,
});
