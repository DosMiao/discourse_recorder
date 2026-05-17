// Settings tab — appearance (theme), language, capture toggles, and the
// About card. Lives inside the dock now (no more separate modal for normal
// settings).

import { NS, BUILD_DATE, VERSION, STORAGE_KEYS } from '../../../bootstrap/config';
import { storageOP } from '../../../infra/storage/storageOperator';
import { Store } from '../../../core/store';
import type { ThemeMode } from '../../../core/types';
import { Theme } from '../../styles/darkMode';
import { h } from '../../../utils/dom';
import { Toast } from '../Toast';
import { createSegmented, type SegmentedHandle } from '../Segmented';
import { createToggleRow } from '../Switch';
import type { I18n, LocalePreference } from '../../../infra/i18n/i18n';

export interface SettingsTabHandle {
    element: HTMLDivElement;
    refresh(): void;
}

interface SettingsTabDeps {
    i18n: I18n;
}

export function createSettingsTab(deps: SettingsTabDeps): SettingsTabHandle {
    const { i18n } = deps;

    // ── theme picker ──────────────────────────────────────────
    const themeSeg: SegmentedHandle<ThemeMode> = createSegmented<ThemeMode>({
        value: Store.get('theme'),
        options: [
            { value: 'light', label: i18n.t('theme_light'), icon: 'sun' },
            { value: 'dark', label: i18n.t('theme_dark'), icon: 'moon' },
            { value: 'system', label: i18n.t('theme_system'), icon: 'system' },
        ],
        onChange: (next) => {
            Theme.set(next);
            Toast.show(
                `${i18n.t('toast_theme_changed')}: ${i18n.t(
                    next === 'light'
                        ? 'theme_light'
                        : next === 'dark'
                          ? 'theme_dark'
                          : 'theme_system'
                )}`,
                'success',
                1500
            );
        },
        ariaLabel: i18n.t('section_theme'),
    });

    // ── locale picker ─────────────────────────────────────────
    const localeSeg: SegmentedHandle<LocalePreference> = createSegmented<LocalePreference>({
        value: i18n.preference(),
        options: [
            { value: 'zh', label: i18n.t('locale_zh') },
            { value: 'en', label: i18n.t('locale_en') },
            { value: 'system', label: i18n.t('locale_system'), icon: 'system' },
        ],
        onChange: (next) => {
            i18n.setPreference(next);
            // The toast message is shown via the locale:changed handler in
            // the dock, which also triggers a full re-render so the new
            // strings appear immediately.
        },
        ariaLabel: i18n.t('section_locale'),
    });

    // ── capture toggles ───────────────────────────────────────
    const captureImagesRow = createToggleRow({
        name: i18n.t('toggle_capture_images'),
        description: i18n.t('toggle_capture_images_desc'),
        checked: Store.get('captureImages'),
        onChange: (v) => {
            Store.patch({ captureImages: v });
            storageOP.set(STORAGE_KEYS.captureImages, v);
        },
        ariaLabel: i18n.t('toggle_capture_images'),
    });
    const autoScrollRow = createToggleRow({
        name: i18n.t('toggle_auto_scroll'),
        description: i18n.t('toggle_auto_scroll_desc'),
        checked: Store.get('autoScroll'),
        onChange: (v) => {
            Store.patch({ autoScroll: v });
            storageOP.set(STORAGE_KEYS.autoScroll, v);
        },
        ariaLabel: i18n.t('toggle_auto_scroll'),
    });
    const autoStartRow = createToggleRow({
        name: i18n.t('toggle_auto_start'),
        description: i18n.t('toggle_auto_start_desc'),
        checked: Store.get('autoStart'),
        onChange: (v) => {
            Store.patch({ autoStart: v });
            storageOP.set(STORAGE_KEYS.autoStart, v);
        },
        ariaLabel: i18n.t('toggle_auto_start'),
    });

    // ── about card ────────────────────────────────────────────
    const buildLine = BUILD_DATE ? BUILD_DATE.slice(0, 10) : '';
    const aboutText = h(
        'div',
        { class: `${NS}-toggle-desc`, style: { lineHeight: '1.55' } },
        [
            h('div', { text: i18n.t('about_blurb') }),
            h('div', {
                text: `${i18n.t('about_version')}: ${VERSION}${
                    buildLine ? `  ·  ${i18n.t('about_build')}: ${buildLine}` : ''
                }`,
                style: { marginTop: '6px' },
            }),
            h('div', {
                text: i18n.t('about_privacy'),
                style: { marginTop: '4px' },
            }),
            h('div', {
                style: { marginTop: '6px', fontWeight: '600' },
                text: `${i18n.t('about_shortcuts')}:`,
            }),
            h('div', { text: `· ${i18n.t('about_shortcut_record')}` }),
            h('div', { text: `· ${i18n.t('about_shortcut_theme')}` }),
        ]
    ) as HTMLDivElement;

    // ── reset button ──────────────────────────────────────────
    const resetBtn = h('button', {
        class: `${NS}-btn`,
        type: 'button',
        text: i18n.t('btn_reset_prefs'),
        style: { marginTop: '6px' },
        onclick: () => {
            for (const k of Object.values(STORAGE_KEYS)) storageOP.del(k);
            Toast.show(i18n.t('toast_prefs_reset'), 'info', 3200);
        },
    });

    // ── assemble ──────────────────────────────────────────────
    const appearance = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_theme') }),
        themeSeg.element,
    ]);
    const locale = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_locale') }),
        localeSeg.element,
    ]);
    const captureSection = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_capture') }),
        captureImagesRow.element,
        autoScrollRow.element,
        autoStartRow.element,
    ]);
    const aboutSection = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_about') }),
        aboutText,
        resetBtn,
    ]);

    const element = h(
        'div',
        {
            class: `${NS}-tabpanel`,
            role: 'tabpanel',
            id: `${NS}-tabpanel-settings`,
            'aria-labelledby': `${NS}-tab-settings`,
        },
        [appearance, locale, captureSection, aboutSection]
    ) as HTMLDivElement;

    function refresh(): void {
        themeSeg.set(Store.get('theme'));
        localeSeg.set(i18n.preference());
        captureImagesRow.handle.set(Store.get('captureImages'));
        autoScrollRow.handle.set(Store.get('autoScroll'));
        autoStartRow.handle.set(Store.get('autoStart'));
    }

    return { element, refresh };
}
