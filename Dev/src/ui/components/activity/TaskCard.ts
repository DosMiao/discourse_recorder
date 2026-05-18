// One card per task. DOM is built once on construct; subsequent update(snap)
// calls only touch what changed (textContent, style.width, hidden, attrs).
// Failure list is rebuilt only when failures.length / failuresTruncated change
// (see TaskFailureList).
//
// Single component, kind-agnostic — apicapture/export.zip/export.sharded all
// render through the same card; differences (cancel/retry/dismiss visibility,
// throughput unit, stage labels) are payload-driven.

import { NS } from '../../../bootstrap/config';
import { h } from '../../../utils/dom';
import { IconManager } from '../IconManager';
import { createTaskFailureList, type TaskFailureListHandle } from './TaskFailureList';
import {
    formatCounter,
    formatEta,
    formatPercent,
    formatStageLabel,
    formatStatus,
    formatThroughput,
    formatTitle,
} from './taskFormatters';
import type { I18n } from '../../../infra/i18n/i18n';
import type { TaskSnapshot } from '../../../core/tasks';

export interface TaskCardActions {
    onCancel(id: string): void;
    onRetry(id: string): void;
    onDismiss(id: string): void;
}

export interface TaskCardHandle {
    element: HTMLDivElement;
    update(snap: TaskSnapshot): void;
    destroy(): void;
}

interface TaskCardDeps {
    i18n: I18n;
    snapshot: TaskSnapshot;
    actions: TaskCardActions;
}

const KIND_ICON: Record<string, string> = {
    'export.zip': '📦',
    'export.sharded': '🗂️',
    'apicapture': '📡',
    'image.download': '🖼️',
    'image.retry': '🔁',
};

// Stage chip status → visual style. Defined as data attribute selectors in
// activity.ts CSS so we don't have to toggle classes here.

function shouldShowRetry(snap: TaskSnapshot): boolean {
    if (snap.status === 'running' || snap.status === 'pending') return false;
    if (snap.failures.length === 0) return false;
    if (!snap.retryable) return false;
    return true;
}

function shouldShowCancel(snap: TaskSnapshot): boolean {
    return snap.cancellable && (snap.status === 'running' || snap.status === 'pending');
}

function shouldShowDismiss(snap: TaskSnapshot): boolean {
    return snap.status === 'succeeded' || snap.status === 'failed' || snap.status === 'cancelled';
}

export function createTaskCard(deps: TaskCardDeps): TaskCardHandle {
    const { i18n, snapshot: initial, actions } = deps;
    const id = initial.id;

    // ── Header ────────────────────────────────────────────────
    const kindIcon = h('span', {
        class: `${NS}-task-kind-icon`,
        text: KIND_ICON[initial.kind] ?? '⚙️',
        'aria-hidden': 'true',
    }) as HTMLSpanElement;
    const titleEl = h('span', {
        class: `${NS}-task-title`,
        text: formatTitle(initial, i18n),
    }) as HTMLSpanElement;
    const statusPill = h('span', {
        class: `${NS}-task-status-pill`,
        text: formatStatus(initial.status, i18n),
    }) as HTMLSpanElement;
    const cancelBtn = h('button', {
        class: `${NS}-task-btn ${NS}-task-cancel`,
        type: 'button',
        title: i18n.t('task_cancel'),
        'aria-label': i18n.t('task_cancel'),
        html: IconManager.flexible('x'),
        onclick: () => actions.onCancel(id),
    }) as HTMLButtonElement;
    const dismissBtn = h('button', {
        class: `${NS}-task-btn ${NS}-task-dismiss`,
        type: 'button',
        title: i18n.t('task_dismiss'),
        'aria-label': i18n.t('task_dismiss'),
        html: IconManager.flexible('x'),
        onclick: () => actions.onDismiss(id),
    }) as HTMLButtonElement;
    dismissBtn.hidden = true;

    const header = h('div', { class: `${NS}-task-header` }, [
        kindIcon,
        titleEl,
        statusPill,
        cancelBtn,
        dismissBtn,
    ]);

    // ── Progress ──────────────────────────────────────────────
    const barFill = h('div', { class: `${NS}-task-bar-fill` }) as HTMLDivElement;
    const bar = h('div', { class: `${NS}-task-bar` }, [barFill]);
    const counter = h('span', { class: `${NS}-task-counter` }) as HTMLSpanElement;
    const progressRow = h('div', { class: `${NS}-task-progress-row` }, [bar, counter]);

    // ── Meta ──────────────────────────────────────────────────
    const etaEl = h('span', { class: `${NS}-task-eta` }) as HTMLSpanElement;
    const throughputEl = h('span', { class: `${NS}-task-throughput` }) as HTMLSpanElement;
    const failedEl = h('span', { class: `${NS}-task-failed` }) as HTMLSpanElement;
    failedEl.hidden = true;
    const messageEl = h('span', { class: `${NS}-task-message` }) as HTMLSpanElement;
    messageEl.hidden = true;
    const meta = h('div', { class: `${NS}-task-meta` }, [
        etaEl,
        throughputEl,
        failedEl,
        messageEl,
    ]);

    // ── Stages ────────────────────────────────────────────────
    const stagesRow = h('div', { class: `${NS}-task-stages` }) as HTMLDivElement;
    stagesRow.hidden = true;
    const stageEls = new Map<string, HTMLSpanElement>();

    // ── Failures + retry slot ─────────────────────────────────
    const failureList: TaskFailureListHandle = createTaskFailureList({ i18n });
    let retryBtn: HTMLButtonElement | null = null;

    function ensureRetryButton(snap: TaskSnapshot): HTMLButtonElement {
        if (retryBtn) return retryBtn;
        retryBtn = h('button', {
            class: `${NS}-task-btn ${NS}-task-retry`,
            type: 'button',
            onclick: () => actions.onRetry(id),
        }) as HTMLButtonElement;
        retryBtn.textContent = i18n.t('task_retry', { n: snap.failures.length });
        return retryBtn;
    }

    // ── Card root ─────────────────────────────────────────────
    const element = h(
        'div',
        {
            class: `${NS}-task-card`,
            'data-kind': initial.kind,
            'data-status': initial.status,
            'data-task-id': id,
            role: 'group',
            'aria-label': formatTitle(initial, i18n),
        },
        [header, progressRow, meta, stagesRow, failureList.element]
    ) as HTMLDivElement;

    // Build stage chips up front (stages are immutable in count, only their
    // status changes). If no stages, hide the row.
    if (initial.stages.length > 0) {
        for (const stage of initial.stages) {
            const chip = h('span', {
                class: `${NS}-task-stage`,
                'data-stage': stage.id,
                'data-stage-status': stage.status,
            }) as HTMLSpanElement;
            chip.textContent = formatStageLabel(stage, i18n);
            stageEls.set(stage.id, chip);
            stagesRow.appendChild(chip);
        }
        stagesRow.hidden = false;
    }

    // Initialise display state from the seed snapshot.
    update(initial);

    function update(snap: TaskSnapshot): void {
        // Header
        if (titleEl.textContent !== formatTitle(snap, i18n)) {
            titleEl.textContent = formatTitle(snap, i18n);
        }
        if (element.getAttribute('data-status') !== snap.status) {
            element.setAttribute('data-status', snap.status);
        }
        const statusText = formatStatus(snap.status, i18n);
        if (statusPill.textContent !== statusText) statusPill.textContent = statusText;

        const showCancel = shouldShowCancel(snap);
        if (cancelBtn.hidden === showCancel) cancelBtn.hidden = !showCancel;
        const showDismiss = shouldShowDismiss(snap);
        if (dismissBtn.hidden === showDismiss) dismissBtn.hidden = !showDismiss;

        // Progress
        const pct = formatPercent(snap.done, snap.total);
        const widthStr = `${pct.toFixed(1)}%`;
        if (barFill.style.width !== widthStr) barFill.style.width = widthStr;
        const counterStr = formatCounter(snap.done, snap.total);
        if (counter.textContent !== counterStr) counter.textContent = counterStr;

        // Meta — only show ETA / throughput while running
        if (snap.status === 'running') {
            etaEl.hidden = false;
            throughputEl.hidden = false;
            const etaStr = `${i18n.t('task_eta')} ${formatEta(snap.etaMs)}`;
            if (etaEl.textContent !== etaStr) etaEl.textContent = etaStr;
            const tpStr = formatThroughput(snap.throughputPerSec, snap.unit, i18n);
            if (throughputEl.textContent !== tpStr) throughputEl.textContent = tpStr;
        } else {
            etaEl.hidden = true;
            throughputEl.hidden = true;
        }

        // Failures pill (lifetime count)
        if (snap.failedCount > 0) {
            const failedStr = i18n.t('task_failed_count', { n: snap.failedCount });
            if (failedEl.textContent !== failedStr) failedEl.textContent = failedStr;
            failedEl.hidden = false;
        } else {
            failedEl.hidden = true;
        }

        // Optional one-line message (e.g. error reason on a failed task)
        if (snap.message) {
            if (messageEl.textContent !== snap.message) messageEl.textContent = snap.message;
            messageEl.hidden = false;
        } else {
            messageEl.hidden = true;
        }

        // Stage chips
        for (const stage of snap.stages) {
            const chip = stageEls.get(stage.id);
            if (!chip) continue;
            chip.setAttribute('data-stage-status', stage.status);
            chip.classList.toggle(`${NS}-task-stage-active`, stage.id === snap.activeStageId);
            const label = formatStageLabel(stage, i18n);
            if (chip.textContent !== label) chip.textContent = label;
        }

        // Failure list + retry button
        failureList.update(snap.failures, snap.failuresTruncated);
        if (shouldShowRetry(snap)) {
            const btn = ensureRetryButton(snap);
            const txt = i18n.t('task_retry', { n: snap.failures.length });
            if (btn.textContent !== txt) btn.textContent = txt;
            failureList.setRetryButton(btn);
        } else {
            failureList.setRetryButton(null);
            retryBtn = null;
        }
    }

    function destroy(): void {
        element.remove();
    }

    return { element, update, destroy };
}
