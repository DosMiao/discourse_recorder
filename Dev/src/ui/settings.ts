// Settings modal — theme picker, export-format picker, capture toggles,
// and a reset action. Opens lazily (createModal each time) to keep the DOM
// clean when closed; the segmented controls re-paint their pressed state
// off the live Store rather than a snapshot, so re-opening always shows
// the latest selection.

import { NS, STORAGE_KEYS, VERSION, ROOT_ID } from '../core/constants';
import { Storage } from '../core/storage';
import { Store } from '../core/store';
import { Theme } from '../theme/theme';
import { Toast } from './toast';
import { h } from './dom';
import { Icons } from './icons';
import type { CaptureStrategy, ExportFormat, ThemeMode } from '../core/types';

let overlay: HTMLDivElement | null = null;

function close(): void {
    if (!overlay) return;
    overlay.classList.remove(`${NS}-show`);
    const o = overlay;
    overlay = null;
    setTimeout(() => o.remove(), 250);
}

function themeBtn(value: ThemeMode, icon: string, label: string): HTMLButtonElement {
    const pressed = Store.get('theme') === value;
    return h('button', {
        class: `${NS}-seg-btn`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(pressed),
        'aria-pressed': String(pressed),
        html: `${icon}<span>${label}</span>`,
        onclick: (e: Event) => {
            Theme.set(value);
            const target = e.currentTarget as HTMLElement;
            target.parentElement?.querySelectorAll(`.${NS}-seg-btn`).forEach((b) => {
                (b as HTMLElement).setAttribute('aria-pressed', 'false');
                (b as HTMLElement).setAttribute('aria-checked', 'false');
            });
            target.setAttribute('aria-pressed', 'true');
            target.setAttribute('aria-checked', 'true');
            Toast.show(`主题:${label}`, 'success', 1500);
        },
    });
}

function fmtBtn(value: ExportFormat, label: string): HTMLButtonElement {
    const pressed = Store.get('exportFormat') === value;
    return h('button', {
        class: `${NS}-seg-btn`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(pressed),
        'aria-pressed': String(pressed),
        text: label,
        onclick: (e: Event) => {
            Store.patch({ exportFormat: value });
            Storage.set(STORAGE_KEYS.exportFormat, value);
            const target = e.currentTarget as HTMLElement;
            target.parentElement?.querySelectorAll(`.${NS}-seg-btn`).forEach((b) => {
                (b as HTMLElement).setAttribute('aria-pressed', 'false');
                (b as HTMLElement).setAttribute('aria-checked', 'false');
            });
            target.setAttribute('aria-pressed', 'true');
            target.setAttribute('aria-checked', 'true');
        },
    });
}

function strategyBtn(value: CaptureStrategy, label: string): HTMLButtonElement {
    const pressed = Store.get('captureStrategy') === value;
    return h('button', {
        class: `${NS}-seg-btn`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(pressed),
        'aria-pressed': String(pressed),
        text: label,
        onclick: (e: Event) => {
            Store.patch({ captureStrategy: value });
            Storage.set(STORAGE_KEYS.captureStrategy, value);
            const target = e.currentTarget as HTMLElement;
            target.parentElement?.querySelectorAll(`.${NS}-seg-btn`).forEach((b) => {
                (b as HTMLElement).setAttribute('aria-pressed', 'false');
                (b as HTMLElement).setAttribute('aria-checked', 'false');
            });
            target.setAttribute('aria-pressed', 'true');
            target.setAttribute('aria-checked', 'true');
        },
    });
}

function makeSwitch(initial: boolean, onChange: (next: boolean) => void): HTMLButtonElement {
    const sw = h('button', {
        class: `${NS}-switch`,
        type: 'button',
        role: 'switch',
        'aria-checked': String(initial),
        onclick: () => {
            const next = sw.getAttribute('aria-checked') !== 'true';
            sw.setAttribute('aria-checked', String(next));
            onChange(next);
        },
    });
    return sw;
}

function open(): void {
    if (overlay) return;

    const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);

    const themeSeg = h(
        'div',
        { class: `${NS}-segmented`, role: 'radiogroup', 'aria-label': '主题' },
        [
            themeBtn('light', Icons.sun, '浅色'),
            themeBtn('dark', Icons.moon, '深色'),
            themeBtn('system', Icons.system, '系统'),
        ]
    );

    const fmtSeg = h(
        'div',
        { class: `${NS}-segmented`, role: 'radiogroup', 'aria-label': '导出格式' },
        [
            fmtBtn('zip', 'ZIP (含图片)'),
            fmtBtn('both', 'MD + JSON'),
            fmtBtn('md', '仅 MD'),
            fmtBtn('json', '仅 JSON'),
        ]
    );

    const captureImagesSwitch = makeSwitch(Store.get('captureImages'), (v) => {
        Store.patch({ captureImages: v });
        Storage.set(STORAGE_KEYS.captureImages, v);
    });

    const downloadImagesSwitch = makeSwitch(Store.get('downloadImages'), (v) => {
        Store.patch({ downloadImages: v });
        Storage.set(STORAGE_KEYS.downloadImages, v);
    });

    const autoStartSwitch = makeSwitch(Store.get('autoStart'), (v) => {
        Store.patch({ autoStart: v });
        Storage.set(STORAGE_KEYS.autoStart, v);
    });

    const autoScrollSwitch = makeSwitch(Store.get('autoScroll'), (v) => {
        Store.patch({ autoScroll: v });
        Storage.set(STORAGE_KEYS.autoScroll, v);
    });

    const autoSaveSwitch = makeSwitch(Store.get('autoSaveOnComplete'), (v) => {
        Store.patch({ autoSaveOnComplete: v });
        Storage.set(STORAGE_KEYS.autoSaveOnComplete, v);
    });

    const filenamePrefixSwitch = makeSwitch(Store.get('filenamePrefix'), (v) => {
        Store.patch({ filenamePrefix: v });
        Storage.set(STORAGE_KEYS.filenamePrefix, v);
    });

    const strategySeg = h(
        'div',
        { class: `${NS}-segmented`, role: 'radiogroup', 'aria-label': '抓取策略' },
        [strategyBtn('scroll', '滚动浏览'), strategyBtn('api', 'JSON API (快)')]
    );

    const modal = h(
        'div',
        {
            class: `${NS}-modal`,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': `${NS}-modal-title`,
        },
        [
            h('div', { class: `${NS}-modal-header` }, [
                h('h2', {
                    class: `${NS}-modal-title`,
                    id: `${NS}-modal-title`,
                    text: '设置',
                }),
                h('button', {
                    class: `${NS}-icon-btn`,
                    'aria-label': '关闭',
                    html: Icons.close,
                    onclick: close,
                }),
            ]),
            h('div', { class: `${NS}-modal-body` }, [
                h('div', { class: `${NS}-modal-section` }, [
                    h('h3', { class: `${NS}-modal-section-title`, text: '主题外观' }),
                    themeSeg,
                ]),
                h('div', { class: `${NS}-modal-section` }, [
                    h('h3', { class: `${NS}-modal-section-title`, text: '导出格式' }),
                    fmtSeg,
                ]),
                h('div', { class: `${NS}-modal-section` }, [
                    h('h3', { class: `${NS}-modal-section-title`, text: '抓取策略' }),
                    strategySeg,
                    h('div', {
                        style: {
                            fontSize: `var(--${NS}-fs-xs)`,
                            color: `var(--${NS}-text-muted)`,
                            marginTop: '6px',
                            lineHeight: '1.4',
                        },
                        text: '滚动浏览: 模拟真人滚动, 兼容所有页面, 速度慢。JSON API: 仅 Discourse, 直接调用论坛接口, 2000 楼约 30 秒完成。',
                    }),
                ]),
                h('div', { class: `${NS}-modal-section` }, [
                    h('h3', { class: `${NS}-modal-section-title`, text: '记录选项' }),
                    h('div', { class: `${NS}-toggle-row` }, [
                        h('div', { class: `${NS}-toggle-label` }, [
                            h('div', { class: `${NS}-toggle-name`, text: '记录图片URL' }),
                            h('div', {
                                class: `${NS}-toggle-desc`,
                                text: '抓取楼层中图片的原图链接(关闭可只记文字)',
                            }),
                        ]),
                        captureImagesSwitch,
                    ]),
                    h('div', { class: `${NS}-toggle-row` }, [
                        h('div', { class: `${NS}-toggle-label` }, [
                            h('div', { class: `${NS}-toggle-name`, text: '导出ZIP时下载图片' }),
                            h('div', {
                                class: `${NS}-toggle-desc`,
                                text: '把图片文件一起打包进 zip(关闭则只保留链接)',
                            }),
                        ]),
                        downloadImagesSwitch,
                    ]),
                    h('div', { class: `${NS}-toggle-row` }, [
                        h('div', { class: `${NS}-toggle-label` }, [
                            h('div', { class: `${NS}-toggle-name`, text: '自动滚动加载' }),
                            h('div', {
                                class: `${NS}-toggle-desc`,
                                text: '开始记录后自动向下滚动,直到没有新楼层为止(仅滚动策略下生效)',
                            }),
                        ]),
                        autoScrollSwitch,
                    ]),
                    h('div', { class: `${NS}-toggle-row` }, [
                        h('div', { class: `${NS}-toggle-label` }, [
                            h('div', { class: `${NS}-toggle-name`, text: '抓完自动保存' }),
                            h('div', {
                                class: `${NS}-toggle-desc`,
                                text: '滚动/API 抓取结束后自动按当前导出格式落盘并停止',
                            }),
                        ]),
                        autoSaveSwitch,
                    ]),
                    h('div', { class: `${NS}-toggle-row` }, [
                        h('div', { class: `${NS}-toggle-label` }, [
                            h('div', { class: `${NS}-toggle-name`, text: '文件名加日期前缀' }),
                            h('div', {
                                class: `${NS}-toggle-desc`,
                                text: '文件名以 {YYYY-MM-DD}_{标题} 开头, 方便在下载目录里归档',
                            }),
                        ]),
                        filenamePrefixSwitch,
                    ]),
                    h('div', { class: `${NS}-toggle-row` }, [
                        h('div', { class: `${NS}-toggle-label` }, [
                            h('div', { class: `${NS}-toggle-name`, text: '打开论坛时自动开始' }),
                            h('div', {
                                class: `${NS}-toggle-desc`,
                                text: '在 Discourse 主题页面打开时自动启动记录',
                            }),
                        ]),
                        autoStartSwitch,
                    ]),
                ]),
                h('div', { class: `${NS}-modal-section` }, [
                    h('h3', { class: `${NS}-modal-section-title`, text: '关于' }),
                    h('div', {
                        style: {
                            fontSize: `var(--${NS}-fs-sm)`,
                            color: `var(--${NS}-text-muted)`,
                            lineHeight: '1.5',
                        },
                        text: `Discourse Text Recorder v${VERSION} · 仅在你本地保存记录,不上传任何数据。`,
                    }),
                ]),
            ]),
            h('div', { class: `${NS}-modal-footer` }, [
                h('button', {
                    class: `${NS}-btn`,
                    text: '清空所有偏好',
                    onclick: () => {
                        for (const k of Object.values(STORAGE_KEYS)) Storage.del(k);
                        Toast.show('偏好已重置,刷新页面后生效', 'info');
                    },
                }),
                h('button', {
                    class: `${NS}-btn ${NS}-btn-primary`,
                    text: '完成',
                    onclick: close,
                }),
            ]),
        ]
    );

    overlay = h(
        'div',
        {
            class: `${NS}-modal-overlay`,
            onclick: (e: Event) => {
                if (e.target === overlay) close();
            },
        },
        [modal]
    );
    const root = document.getElementById(ROOT_ID) ?? document.body;
    root.appendChild(overlay);
    // Force layout, then show — same trick as the toast transition.
    overlay.getBoundingClientRect();
    overlay.classList.add(`${NS}-show`);
}

export const Settings = { open, close };
