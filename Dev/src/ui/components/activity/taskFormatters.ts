// Pure formatters for task UI — kept separate from the components so they
// stay easy to unit-test and reuse if we add a CLI/console adapter later.

import type { I18n, StringKey } from '../../../infra/i18n/i18n';
import type { TaskSnapshot, TaskStage, TaskStatus, TaskUnit } from '../../../core/tasks';

export function formatEta(ms: number | null): string {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 1) return '<1s';
    if (totalSec < 60) return `${totalSec}s`;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}

const UNIT_TO_KEY: Record<TaskUnit, StringKey> = {
    posts: 'task_throughput_posts',
    images: 'task_throughput_images',
    files: 'task_throughput_files',
    items: 'task_throughput_items',
};

export function formatThroughput(rate: number, unit: TaskUnit, i18n: I18n): string {
    if (!rate || rate <= 0 || !Number.isFinite(rate)) return '—';
    const label = i18n.t(UNIT_TO_KEY[unit]);
    // One decimal under 10/s, integer above.
    const display = rate < 10 ? rate.toFixed(1) : Math.round(rate).toString();
    return `${display} ${label}`;
}

export function formatCounter(done: number, total: number): string {
    if (total <= 0) return `${done}`;
    return `${done}/${total}`;
}

export function formatPercent(done: number, total: number): number {
    if (total <= 0) return 0;
    const pct = (done / total) * 100;
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, Math.min(100, pct));
}

const STATUS_KEY: Record<TaskStatus, StringKey> = {
    pending: 'task_status_pending',
    running: 'task_status_running',
    succeeded: 'task_status_succeeded',
    failed: 'task_status_failed',
    cancelled: 'task_status_cancelled',
};

export function formatStatus(status: TaskStatus, i18n: I18n): string {
    return i18n.t(STATUS_KEY[status]);
}

export function formatTitle(snap: TaskSnapshot, i18n: I18n): string {
    return i18n.t(snap.titleKey, snap.titleParams);
}

export function formatStageLabel(stage: TaskStage, i18n: I18n): string {
    const base = i18n.t(stage.labelKey);
    if (stage.total != null && stage.total > 0 && stage.done != null) {
        return `${base} ${stage.done}/${stage.total}`;
    }
    return base;
}
