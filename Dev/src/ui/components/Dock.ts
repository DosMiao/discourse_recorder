// The main floating panel. Hosts a header (drag handle, status, minimize)
// followed by a 3-tab strip (Capture / Export / Settings) and the active tab
// panel underneath. Footer prints the version and elapsed time.
//
// Drag: pointer-driven absolute positioning, persisted under STORAGE_KEYS.dockPos.
// Snap-to-edge: if released within 24px of right/bottom, anchor to that edge.

import {
    NS,
    ROOT_ID,
    STORAGE_KEYS,
    TAB_IDS,
    VERSION,
    type TabId,
} from '../../bootstrap/config';
import { storageOP } from '../../infra/storage/storageOperator';
import { Store } from '../../core/store';
import { Bus } from '../../core/eventBus';
import { Tasks } from '../../core/taskRegistry';
import { Toast } from './Toast';
import { IconManager } from './IconManager';
import { h } from '../../utils/dom';
import { attachRimLighting } from '../utils/rimLighting';
import { emitTabChanged } from '../events';
import { createTabs, type TabsHandle } from './Tabs';
import { createCaptureTab } from './tabs/CaptureTab';
import { createExportTab } from './tabs/ExportTab';
import { createSettingsTab } from './tabs/SettingsTab';
import { createActivityPanel, type ActivityPanelHandle } from './activity/ActivityPanel';
import { retryImageFailures } from '../../exporter/imageRetry';
import { formatHMS } from '../../exporter/exporter';
import type { DockPosition } from '../../core/types';
import type { I18n } from '../../infra/i18n/i18n';

export interface DockHandle {
    mount(): void;
    refresh(): void;
}

interface DockDeps {
    i18n: I18n;
}

interface DockRefs {
    dock: HTMLDivElement;
    header: HTMLDivElement;
    statusDot: HTMLSpanElement;
    titleText: HTMLSpanElement;
    miniCountNum: HTMLSpanElement;
    miniTaskDot: HTMLSpanElement;
    miniBtn: HTMLButtonElement;
    footerElapsed: HTMLSpanElement;
}

export function createDock(deps: DockDeps): DockHandle {
    const { i18n } = deps;
    let refs: DockRefs | null = null;
    let captureTab: ReturnType<typeof createCaptureTab> | null = null;
    let exportTab: ReturnType<typeof createExportTab> | null = null;
    let settingsTab: ReturnType<typeof createSettingsTab> | null = null;
    let activityPanel: ActivityPanelHandle | null = null;
    let tabs: TabsHandle | null = null;
    let elapsedTimer: ReturnType<typeof setInterval> | null = null;
    let dragOffset:
        | { dx: number; dy: number; w: number; h: number }
        | null = null;

    function ensureRoot(): HTMLElement {
        let root = document.getElementById(ROOT_ID);
        if (!root) {
            root = h('div', { id: ROOT_ID });
            document.body.appendChild(root);
        }
        return root;
    }

    function applyPos(pos: DockPosition): void {
        if (!refs) return;
        const d = refs.dock;
        if (pos.left != null) {
            d.style.left = `${pos.left}px`;
            d.style.right = 'auto';
        }
        if (pos.right != null) {
            d.style.right = `${pos.right}px`;
            d.style.left = 'auto';
        }
        if (pos.top != null) {
            d.style.top = `${pos.top}px`;
            d.style.bottom = 'auto';
        }
        if (pos.bottom != null) {
            d.style.bottom = `${pos.bottom}px`;
            d.style.top = 'auto';
        }
    }

    function attachDrag(handle: HTMLElement): void {
        handle.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            if (!refs) return;
            const rect = refs.dock.getBoundingClientRect();
            dragOffset = {
                dx: e.clientX - rect.left,
                dy: e.clientY - rect.top,
                w: rect.width,
                h: rect.height,
            };
            document.body.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (!dragOffset) return;
            const x = Math.max(
                0,
                Math.min(window.innerWidth - dragOffset.w, e.clientX - dragOffset.dx)
            );
            const y = Math.max(
                0,
                Math.min(window.innerHeight - dragOffset.h, e.clientY - dragOffset.dy)
            );
            applyPos({ left: x, top: y });
        });
        window.addEventListener('mouseup', () => {
            if (!dragOffset || !refs) return;
            dragOffset = null;
            document.body.style.cursor = '';
            const rect = refs.dock.getBoundingClientRect();
            const right = window.innerWidth - rect.right;
            const bottom = window.innerHeight - rect.bottom;
            const pos: DockPosition =
                right < 24 && right >= 0
                    ? { right: Math.max(8, right), top: Math.round(rect.top) }
                    : bottom < 24 && bottom >= 0
                      ? { left: Math.round(rect.left), bottom: Math.max(8, bottom) }
                      : { left: Math.round(rect.left), top: Math.round(rect.top) };
            applyPos(pos);
            storageOP.set(STORAGE_KEYS.dockPos, pos);
        });
    }

    function toggleMini(): void {
        if (!refs) return;
        const next = !refs.dock.classList.contains(`${NS}-mini`);
        refs.dock.classList.toggle(`${NS}-mini`, next);
        Store.patch({ dockMinimized: next });
        storageOP.set(STORAGE_KEYS.dockMin, next);
        refs.miniBtn.innerHTML = IconManager.flexible(next ? 'expand' : 'minimize');
        const label = next ? i18n.t('dock_expand') : i18n.t('dock_minimize');
        refs.miniBtn.setAttribute('aria-label', label);
        refs.miniBtn.title = label;
    }

    function setActiveTab(id: TabId): void {
        if (!tabs || !captureTab || !exportTab || !settingsTab) return;
        Store.patch({ activeTab: id });
        storageOP.set(STORAGE_KEYS.activeTab, id);
        captureTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            id === 'capture'
        );
        exportTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            id === 'export'
        );
        settingsTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            id === 'settings'
        );
        emitTabChanged(id);
    }

    function startElapsedTicker(): void {
        if (elapsedTimer != null) clearInterval(elapsedTimer);
        elapsedTimer = setInterval(() => {
            if (!refs) return;
            const ms = Store.elapsedMs();
            const txt = formatHMS(ms);
            refs.footerElapsed.textContent = txt;
            // CaptureTab owns the stat cell; refresh just the elapsed value.
            captureTab?.refresh();
        }, 1000);
    }

    function refresh(): void {
        if (!refs) return;
        const counts = Store.counts();
        const total = counts.posts || counts.chunks;
        const recording = Store.state.recording;
        const paused = Store.state.paused;

        refs.statusDot.classList.remove(`${NS}-live`, `${NS}-paused`);
        if (recording && !paused) refs.statusDot.classList.add(`${NS}-live`);
        else if (paused) refs.statusDot.classList.add(`${NS}-paused`);

        refs.miniCountNum.textContent = String(total);
        // Activity indicator in mini mode: blue pulse if any task is running.
        const anyRunning = Tasks.list().some((t) => t.status === 'running' || t.status === 'pending');
        refs.miniTaskDot.hidden = !anyRunning;

        refs.footerElapsed.textContent = formatHMS(Store.elapsedMs());

        captureTab?.refresh();
        exportTab?.refresh();
        settingsTab?.refresh();
    }

    function buildLayout(): void {
        const root = ensureRoot();

        const statusDot = h('span', {
            class: `${NS}-status-dot`,
            'aria-hidden': 'true',
        }) as HTMLSpanElement;
        const titleText = h('span', {
            class: `${NS}-title-text`,
            text: i18n.t('dock_title'),
        }) as HTMLSpanElement;
        const miniCountNum = h('span', {
            class: `${NS}-mini-count-num`,
            text: '0',
        }) as HTMLSpanElement;
        const miniTaskDot = h('span', {
            class: `${NS}-mini-task-dot`,
            'aria-hidden': 'true',
        }) as HTMLSpanElement;
        miniTaskDot.hidden = true;
        const miniCount = h(
            'span',
            { class: `${NS}-mini-count`, 'aria-hidden': 'true' },
            [miniCountNum, miniTaskDot]
        );
        const titleBlock = h('div', { class: `${NS}-title` }, [
            statusDot,
            titleText,
            miniCount,
        ]);

        const miniBtn = h('button', {
            class: `${NS}-icon-btn ${NS}-toggle-mini`,
            type: 'button',
            'aria-label': i18n.t('dock_minimize'),
            title: i18n.t('dock_minimize'),
            html: IconManager.flexible('minimize'),
            onclick: toggleMini,
        }) as HTMLButtonElement;

        const headerActions = h('div', { class: `${NS}-header-actions` }, [
            miniBtn,
        ]);
        const header = h('div', { class: `${NS}-header` }, [
            titleBlock,
            headerActions,
        ]) as HTMLDivElement;

        // Tab modules
        captureTab = createCaptureTab({ i18n });
        exportTab = createExportTab({ i18n });
        settingsTab = createSettingsTab({ i18n });
        activityPanel = createActivityPanel({
            i18n,
            onRetry: (taskId) => {
                void retryImageFailures(taskId);
            },
        });

        const initialTab = Store.get('activeTab');
        tabs = createTabs({
            active: initialTab,
            tabs: [
                { id: 'capture', label: i18n.t('tab_capture'), icon: 'capture' },
                { id: 'export', label: i18n.t('tab_export'), icon: 'export' },
                { id: 'settings', label: i18n.t('tab_settings'), icon: 'settings' },
            ],
            onChange: setActiveTab,
        });

        captureTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            initialTab === 'capture'
        );
        exportTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            initialTab === 'export'
        );
        settingsTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            initialTab === 'settings'
        );

        const footerElapsed = h('span', {
            class: `${NS}-footer-elapsed`,
            text: '--:--',
        }) as HTMLSpanElement;
        const footer = h('div', { class: `${NS}-footer` }, [
            h('span', { text: `v${VERSION}` }),
            footerElapsed,
        ]);

        const body = h('div', { class: `${NS}-body` }, [
            captureTab.element,
            exportTab.element,
            settingsTab.element,
            activityPanel.element,
            footer,
        ]);

        const dock = h(
            'div',
            {
                class: `${NS}-dock`,
                role: 'region',
                'aria-label': i18n.t('dock_title'),
            },
            [header, tabs.element, body]
        ) as HTMLDivElement;
        root.appendChild(dock);

        refs = {
            dock,
            header,
            statusDot,
            titleText,
            miniCountNum,
            miniTaskDot,
            miniBtn,
            footerElapsed,
        };

        const pos = storageOP.get<DockPosition | null>(STORAGE_KEYS.dockPos, null);
        if (pos && typeof pos === 'object') applyPos(pos);

        if (Store.get('dockMinimized')) {
            dock.classList.add(`${NS}-mini`);
            miniBtn.innerHTML = IconManager.flexible('expand');
            miniBtn.setAttribute('aria-label', i18n.t('dock_expand'));
            miniBtn.title = i18n.t('dock_expand');
        }

        attachDrag(header);
        attachRimLighting(dock);
        startElapsedTicker();
    }

    function relabelEverything(): void {
        if (!refs || !tabs) return;
        refs.titleText.textContent = i18n.t('dock_title');
        refs.dock.setAttribute('aria-label', i18n.t('dock_title'));
        const miniLabel = refs.dock.classList.contains(`${NS}-mini`)
            ? i18n.t('dock_expand')
            : i18n.t('dock_minimize');
        refs.miniBtn.setAttribute('aria-label', miniLabel);
        refs.miniBtn.title = miniLabel;
        tabs.relabel([
            { id: 'capture', label: i18n.t('tab_capture'), icon: 'capture' },
            { id: 'export', label: i18n.t('tab_export'), icon: 'export' },
            { id: 'settings', label: i18n.t('tab_settings'), icon: 'settings' },
        ]);
        tabs.setActive(Store.get('activeTab'));
        // Tab panels rebuild themselves on locale change — easier than
        // mutating every inner string in place.
        const oldCapture = captureTab?.element;
        const oldExport = exportTab?.element;
        const oldSettings = settingsTab?.element;
        const oldActivity = activityPanel?.element;
        captureTab = createCaptureTab({ i18n });
        exportTab = createExportTab({ i18n });
        settingsTab = createSettingsTab({ i18n });
        // Destroy unhooks the old panel's bus listeners; the freshly-created
        // panel seeds itself from Tasks.list() so any in-flight cards re-appear
        // with the new locale's strings.
        activityPanel?.destroy();
        activityPanel = createActivityPanel({
            i18n,
            onRetry: (taskId) => {
                void retryImageFailures(taskId);
            },
        });
        oldCapture?.replaceWith(captureTab.element);
        oldExport?.replaceWith(exportTab.element);
        oldSettings?.replaceWith(settingsTab.element);
        oldActivity?.replaceWith(activityPanel.element);
        const active = Store.get('activeTab');
        captureTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            active === 'capture'
        );
        exportTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            active === 'export'
        );
        settingsTab.element.classList.toggle(
            `${NS}-tabpanel-active`,
            active === 'settings'
        );
        refresh();
    }

    function mount(): void {
        if (document.getElementById(ROOT_ID)?.querySelector(`.${NS}-dock`)) {
            return;
        }
        buildLayout();

        // Reactive updates
        Bus.on('state:changed', () => refresh());
        Bus.on('capture:tick', () => refresh());
        Bus.on('recorder:started', () => refresh());
        Bus.on('recorder:stopped', () => refresh());
        Bus.on('recorder:paused', () => refresh());
        Bus.on('recorder:resumed', () => refresh());
        Bus.on('recorder:cleared', () => refresh());
        // Mini-dock task indicator needs to flip when tasks come and go.
        Bus.on('task:registered', () => refresh());
        Bus.on('task:ended', () => refresh());
        Bus.on('task:dismissed', () => refresh());
        Bus.on('autoscroll:stopped', (p) => {
            if (p.reason === 'end') {
                Toast.show(i18n.t('toast_autoscroll_end'), 'success', 2200);
            } else if (p.reason === 'max') {
                Toast.show(i18n.t('toast_autoscroll_max'), 'warning', 2500);
            }
        });
        Bus.on('apicapture:started', () => {
            Toast.show(i18n.t('toast_apicapture_started'), 'info', 1800);
        });
        Bus.on('apicapture:stopped', (p) => {
            if (p.reason === 'end') {
                Toast.show(i18n.t('toast_apicapture_done'), 'success', 2200);
            } else if (p.reason === 'error') {
                Toast.show(
                    `${i18n.t('toast_apicapture_error')}: ${p.error ?? ''}`,
                    'error',
                    3500
                );
            }
        });

        // Locale change: rebuild tab content so all strings refresh.
        i18n.onChange(() => {
            relabelEverything();
            Toast.show(
                `${i18n.t('toast_locale_changed')}: ${i18n.t(
                    i18n.locale() === 'zh' ? 'locale_zh' : 'locale_en'
                )}`,
                'success',
                1500
            );
        });

        // Validate the persisted active-tab matches an allowed id.
        const persisted = Store.get('activeTab');
        if (!TAB_IDS.includes(persisted)) {
            Store.patch({ activeTab: 'capture' });
            storageOP.set(STORAGE_KEYS.activeTab, 'capture');
        }

        refresh();
    }

    return { mount, refresh };
}
