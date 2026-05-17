// The main floating panel. Subscribes to Bus state changes and re-renders
// itself; nothing inside this file mutates Store directly except via
// Recorder/Exporter calls.
//
// Layout:
//   header   : status dot · title · settings · minimize
//   stats    : posts · images · elapsed
//   mode row : current state · capture-mode badge
//   actions  : start · [pause, stop] · export · [copy, clear]
//   footer   : version · live elapsed mirror
//
// Drag: pointer-driven absolute positioning, persisted under STORAGE_KEYS.dockPos.
// Snap-to-edge: if released within 24px of right/bottom, anchor to that edge.

import { NS, ROOT_ID, STORAGE_KEYS, VERSION } from '../core/constants';
import { Storage } from '../core/storage';
import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import { Recorder } from '../recorder/recorder';
import {
    copyMarkdown,
    exportPreferred,
    formatHMS,
} from '../exporter/exporter';
import { Settings } from './settings';
import { Toast } from './toast';
import { h } from './dom';
import { Icons } from './icons';
import { attachRimLighting } from './rimLighting';
import type { DockPosition } from '../core/types';

interface DockRefs {
    dock: HTMLDivElement;
    header: HTMLDivElement;
    statusDot: HTMLSpanElement;
    titleText: HTMLSpanElement;
    miniCount: HTMLSpanElement;
    miniCountNum: HTMLSpanElement;
    statPosts: HTMLDivElement;
    statImages: HTMLDivElement;
    statElapsed: HTMLDivElement;
    modeRowText: HTMLSpanElement;
    modeBadge: HTMLSpanElement;
    startBtn: HTMLButtonElement;
    autoBtn: HTMLButtonElement;
    pauseBtn: HTMLButtonElement;
    stopBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    copyBtn: HTMLButtonElement;
    clearBtn: HTMLButtonElement;
    miniBtn: HTMLButtonElement;
    footerElapsed: HTMLSpanElement;
}

let refs: DockRefs | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let dragOffset: { dx: number; dy: number; w: number; h: number } | null = null;

function ensureRoot(): HTMLElement {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
        root = h('div', { id: ROOT_ID });
        document.body.appendChild(root);
    }
    return root;
}

function statCell(value: string, label: string, key: string): HTMLDivElement {
    return h('div', { class: `${NS}-stat`, 'data-stat': key }, [
        h('div', { class: `${NS}-stat-value`, text: value }),
        h('div', { class: `${NS}-stat-label`, text: label }),
    ]);
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
        const x = Math.max(0, Math.min(window.innerWidth - dragOffset.w, e.clientX - dragOffset.dx));
        const y = Math.max(0, Math.min(window.innerHeight - dragOffset.h, e.clientY - dragOffset.dy));
        applyPos({ left: x, top: y });
    });
    window.addEventListener('mouseup', () => {
        if (!dragOffset || !refs) return;
        dragOffset = null;
        document.body.style.cursor = '';
        const rect = refs.dock.getBoundingClientRect();
        const right = window.innerWidth - rect.right;
        const bottom = window.innerHeight - rect.bottom;
        // Snap when released within 24px of right or bottom edge.
        const pos: DockPosition =
            right < 24 && right >= 0
                ? { right: Math.max(8, right), top: Math.round(rect.top) }
                : bottom < 24 && bottom >= 0
                  ? { left: Math.round(rect.left), bottom: Math.max(8, bottom) }
                  : { left: Math.round(rect.left), top: Math.round(rect.top) };
        applyPos(pos);
        Storage.set(STORAGE_KEYS.dockPos, pos);
    });
}

function toggleMini(): void {
    if (!refs) return;
    const next = !refs.dock.classList.contains(`${NS}-mini`);
    refs.dock.classList.toggle(`${NS}-mini`, next);
    Store.patch({ dockMinimized: next });
    Storage.set(STORAGE_KEYS.dockMin, next);
    refs.miniBtn.innerHTML = next ? Icons.expand : Icons.minimize;
    refs.miniBtn.setAttribute('aria-label', next ? '展开' : '最小化');
    refs.miniBtn.title = next ? '展开' : '最小化';
}

function startElapsedTicker(): void {
    if (elapsedTimer != null) clearInterval(elapsedTimer);
    elapsedTimer = setInterval(() => {
        if (!refs) return;
        const ms = Store.elapsedMs();
        const txt = formatHMS(ms);
        refs.statElapsed.textContent = txt;
        refs.footerElapsed.textContent = txt;
    }, 1000);
}

function onStart(): void {
    Recorder.start();
    const m = Store.state.mode;
    Toast.show(
        m === 'discourse' ? '开始记录(Discourse模式)' : '开始记录(通用模式)',
        'success',
        1800
    );
}

function onAuto(): void {
    if (Store.state.recording) {
        Toast.show('已有记录进行中,先停止再使用一键模式', 'warning', 2200);
        return;
    }
    Toast.show('一键模式: 开始抓取并自动保存', 'info', 2000);
    void Recorder.autoSession().then(() => {
        Toast.show('一键完成: 抓取已保存', 'success', 2400);
    }).catch((err: unknown) => {
        Toast.show(
            `一键失败: ${err instanceof Error ? err.message : String(err)}`,
            'error',
            3500
        );
    });
}

function onPause(): void {
    if (Store.state.paused) {
        Recorder.resume();
        Toast.show('已恢复', 'info', 1200);
    } else {
        Recorder.pause();
        Toast.show('已暂停', 'warning', 1200);
    }
}

function onStop(): void {
    Recorder.stop();
    Toast.show('已停止', 'info', 1200);
}

function onExport(): void {
    const f = Store.get('exportFormat');
    if (f === 'zip') {
        if (!refs) return;
        refs.exportBtn.disabled = true;
        const dl = Store.get('downloadImages') ? '(含图片)' : '(仅元数据)';
        Toast.show(`开始打包 ZIP ${dl}`, 'info', 2200);
        Promise.resolve(exportPreferred())
            .then(() => {
                if (refs) refs.exportBtn.disabled = Store.counts().posts + Store.counts().chunks === 0;
                Toast.show('ZIP 打包完成', 'success', 2200);
            })
            .catch((err: unknown) => {
                if (refs) refs.exportBtn.disabled = false;
                Toast.show(`ZIP 失败: ${err instanceof Error ? err.message : String(err)}`, 'error', 3500);
            });
    } else {
        exportPreferred();
        const msg =
            f === 'md'
                ? '正在下载 Markdown'
                : f === 'json'
                  ? '正在下载 JSON'
                  : '正在下载 MD + JSON';
        Toast.show(msg, 'success');
    }
}

function onCopy(): void {
    copyMarkdown();
    Toast.show('已复制 Markdown 到剪贴板', 'success');
}

function onClear(): void {
    const counts = Store.counts();
    if (counts.posts + counts.chunks === 0) {
        Recorder.clear();
        return;
    }
    if (window.confirm('确定清空所有已记录的内容?')) {
        Recorder.clear();
        Toast.show('已清空', 'info', 1200);
    }
}

export function render(): void {
    if (!refs) return;
    const counts = Store.counts();
    const total = counts.posts || counts.chunks;
    const mode = Store.state.mode;
    const recording = Store.state.recording;
    const paused = Store.state.paused;

    refs.statPosts.textContent = String(counts.posts || counts.chunks);
    refs.statImages.textContent = String(counts.images);
    const elapsedTxt = formatHMS(Store.elapsedMs());
    refs.statElapsed.textContent = elapsedTxt;
    refs.footerElapsed.textContent = elapsedTxt;

    refs.statusDot.classList.remove(`${NS}-live`, `${NS}-paused`);
    if (recording && !paused) refs.statusDot.classList.add(`${NS}-live`);
    else if (paused) refs.statusDot.classList.add(`${NS}-paused`);

    refs.miniCountNum.textContent = String(total);

    const modeLabel =
        mode === 'discourse' ? 'Discourse' : mode === 'generic' ? '通用' : '检测中';
    const statusLabel = recording
        ? paused
            ? '已暂停'
            : '正在记录'
        : total > 0
          ? '已停止'
          : '空闲';
    refs.modeRowText.textContent = statusLabel;
    refs.modeBadge.textContent = modeLabel;
    refs.modeBadge.classList.toggle(`${NS}-generic`, mode !== 'discourse');

    refs.startBtn.disabled = recording;
    refs.startBtn.innerHTML = recording
        ? `${Icons.play}<span>记录中</span>`
        : `${Icons.play}<span>开始记录</span>`;
    refs.autoBtn.disabled = recording;
    refs.pauseBtn.disabled = !recording;
    refs.pauseBtn.innerHTML = paused
        ? `${Icons.play}<span>继续</span>`
        : `${Icons.pause}<span>暂停</span>`;
    refs.stopBtn.disabled = !recording;
    refs.exportBtn.disabled = total === 0;
    refs.copyBtn.disabled = total === 0;
    refs.clearBtn.disabled = total === 0 && !recording;

    const fmt = Store.get('exportFormat');
    const exportLabel =
        fmt === 'zip'
            ? '导出 ZIP'
            : fmt === 'md'
              ? '导出 MD'
              : fmt === 'json'
                ? '导出 JSON'
                : '导出 (MD + JSON)';
    refs.exportBtn.innerHTML = `${Icons.download}<span>${exportLabel}</span>`;
}

export function mount(): void {
    const root = ensureRoot();

    const statusDot = h('span', {
        class: `${NS}-status-dot`,
        'aria-hidden': 'true',
    }) as HTMLSpanElement;
    const titleText = h('span', {
        class: `${NS}-title-text`,
        text: '文字记录器',
    }) as HTMLSpanElement;
    const miniCountNum = h('span', {
        class: `${NS}-mini-count-num`,
        text: '0',
    }) as HTMLSpanElement;
    const miniCount = h(
        'span',
        { class: `${NS}-mini-count`, 'aria-hidden': 'true' },
        [miniCountNum]
    ) as HTMLSpanElement;
    const titleBlock = h('div', { class: `${NS}-title` }, [statusDot, titleText, miniCount]);

    const miniBtn = h('button', {
        class: `${NS}-icon-btn ${NS}-toggle-mini`,
        'aria-label': '最小化',
        title: '最小化',
        html: Icons.minimize,
        onclick: toggleMini,
    }) as HTMLButtonElement;

    const settingsBtn = h('button', {
        class: `${NS}-icon-btn`,
        'aria-label': '设置',
        title: '设置',
        html: Icons.settings,
        onclick: () => Settings.open(),
    }) as HTMLButtonElement;

    const headerActions = h('div', { class: `${NS}-header-actions` }, [settingsBtn, miniBtn]);
    const header = h('div', { class: `${NS}-header` }, [titleBlock, headerActions]);

    const stats = h('div', { class: `${NS}-stats` }, [
        statCell('--', '楼层', 'posts'),
        statCell('--', '图片', 'images'),
        statCell('00:00', '时长', 'elapsed'),
    ]);

    const modeRowText = h('span', { text: '空闲' }) as HTMLSpanElement;
    const modeBadge = h('span', {
        class: `${NS}-mode-badge`,
        text: '检测中',
    }) as HTMLSpanElement;
    const modeRow = h('div', { class: `${NS}-mode-row` }, [modeRowText, modeBadge]);

    const startBtn = h('button', {
        class: `${NS}-btn ${NS}-btn-primary ${NS}-btn-full`,
        html: `${Icons.play}<span>开始记录</span>`,
        onclick: onStart,
    }) as HTMLButtonElement;
    const autoBtn = h('button', {
        class: `${NS}-btn ${NS}-btn-full`,
        html: `${Icons.zap}<span>一键抓取并保存</span>`,
        title: '自动抓取整帖并按当前导出格式保存',
        onclick: onAuto,
    }) as HTMLButtonElement;
    const pauseBtn = h('button', {
        class: `${NS}-btn`,
        html: `${Icons.pause}<span>暂停</span>`,
        onclick: onPause,
    }) as HTMLButtonElement;
    const stopBtn = h('button', {
        class: `${NS}-btn ${NS}-btn-danger`,
        html: `${Icons.stop}<span>停止</span>`,
        onclick: onStop,
    }) as HTMLButtonElement;
    const exportBtn = h('button', {
        class: `${NS}-btn ${NS}-btn-full`,
        html: `${Icons.download}<span>导出 (MD + JSON)</span>`,
        onclick: onExport,
    }) as HTMLButtonElement;
    const copyBtn = h('button', {
        class: `${NS}-btn`,
        html: `${Icons.copy}<span>复制 MD</span>`,
        onclick: onCopy,
    }) as HTMLButtonElement;
    const clearBtn = h('button', {
        class: `${NS}-btn`,
        html: `${Icons.trash}<span>清空</span>`,
        onclick: onClear,
    }) as HTMLButtonElement;

    const recordRow = h('div', { class: `${NS}-btn-row` }, [pauseBtn, stopBtn]);
    const exportRow = h('div', { class: `${NS}-btn-row` }, [copyBtn, clearBtn]);

    const footerElapsed = h('span', {
        class: `${NS}-footer-elapsed`,
        text: '--:--',
    }) as HTMLSpanElement;
    const footer = h('div', { class: `${NS}-footer` }, [
        h('span', { text: `v${VERSION}` }),
        footerElapsed,
    ]);

    const body = h('div', { class: `${NS}-body` }, [
        stats,
        modeRow,
        startBtn,
        autoBtn,
        recordRow,
        exportBtn,
        exportRow,
        footer,
    ]);

    const dock = h(
        'div',
        {
            class: `${NS}-dock`,
            role: 'region',
            'aria-label': 'Discourse 文字记录器',
        },
        [header, body]
    ) as HTMLDivElement;
    root.appendChild(dock);

    refs = {
        dock,
        header: header as HTMLDivElement,
        statusDot,
        titleText,
        miniCount,
        miniCountNum,
        statPosts: stats.querySelector(
            `[data-stat="posts"] .${NS}-stat-value`
        ) as HTMLDivElement,
        statImages: stats.querySelector(
            `[data-stat="images"] .${NS}-stat-value`
        ) as HTMLDivElement,
        statElapsed: stats.querySelector(
            `[data-stat="elapsed"] .${NS}-stat-value`
        ) as HTMLDivElement,
        modeRowText,
        modeBadge,
        startBtn,
        autoBtn,
        pauseBtn,
        stopBtn,
        exportBtn,
        copyBtn,
        clearBtn,
        miniBtn,
        footerElapsed,
    };

    const pos = Storage.get<DockPosition | null>(STORAGE_KEYS.dockPos, null);
    if (pos && typeof pos === 'object') applyPos(pos);

    if (Store.get('dockMinimized')) dock.classList.add(`${NS}-mini`);

    attachDrag(header as HTMLElement);
    attachRimLighting(dock);
    startElapsedTicker();

    // Wire reactive updates
    Bus.on('state:changed', () => render());
    Bus.on('capture:tick', () => render());
    Bus.on('recorder:started', () => render());
    Bus.on('recorder:stopped', () => render());
    Bus.on('recorder:paused', () => render());
    Bus.on('recorder:resumed', () => render());
    Bus.on('recorder:cleared', () => render());
    Bus.on('autoscroll:stopped', (p) => {
        if (p.reason === 'end') Toast.show('自动滚动完成: 已到达底部', 'success', 2200);
        else if (p.reason === 'max') Toast.show('自动滚动: 已达最大轮次', 'warning', 2500);
    });
    Bus.on('apicapture:started', () => {
        Toast.show('API 抓取已启动', 'info', 1800);
    });
    Bus.on('apicapture:progress', (p) => {
        if (!refs) return;
        // Reuse the start button as a lightweight progress display while
        // the API capture is running — same trick the ZIP export uses on
        // the export button.
        if (Store.state.recording && Store.get('captureStrategy') === 'api') {
            refs.startBtn.innerHTML = `${Icons.play}<span>抓取中 ${p.done}/${p.total}</span>`;
        }
    });
    Bus.on('apicapture:stopped', (p) => {
        if (p.reason === 'end') Toast.show('API 抓取完成', 'success', 2200);
        else if (p.reason === 'error') Toast.show(`API 抓取失败: ${p.error ?? ''}`, 'error', 3500);
        render();
    });
    Bus.on('export:progress', (p) => {
        if (!refs) return;
        if (p.phase === 'downloading' || p.phase === 'zipping') {
            refs.exportBtn.innerHTML = `${Icons.download}<span>${p.message ?? '...'}</span>`;
        } else if (p.phase === 'done' || p.phase === 'error') {
            render();
        }
    });

    render();
}

export const Dock = { mount, render };
