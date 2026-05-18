// Capture tab — status, stats, mode badge, and the start/pause/stop trio.
// Below them sit the capture-strategy radio cards (scroll vs API) which
// only apply to the *next* recording session.

import { NS, STORAGE_KEYS } from '../../../bootstrap/config';
import { storageOP } from '../../../infra/storage/storageOperator';
import { Store } from '../../../core/store';
import type { CaptureStrategy } from '../../../core/types';
import { Recorder } from '../../../recorder/recorder';
import { formatHMS, previewShardPlan } from '../../../exporter/exporter';
import { h } from '../../../utils/dom';
import { IconManager } from '../IconManager';
import { Toast } from '../Toast';
import { createButton, type ButtonHandle } from '../Button';
import { createStatCell, type StatCellHandle } from '../StatCell';
import { createOptionCardList } from '../OptionCard';
import type { I18n } from '../../../infra/i18n/i18n';

export interface CaptureTabHandle {
    element: HTMLDivElement;
    refresh(): void;
}

interface CaptureTabDeps {
    i18n: I18n;
}

export function createCaptureTab(deps: CaptureTabDeps): CaptureTabHandle {
    const { i18n } = deps;

    // ── stats row ─────────────────────────────────────────────
    const statPosts: StatCellHandle = createStatCell({
        value: '--',
        label: i18n.t('stat_posts'),
        key: 'posts',
    });
    const statImages: StatCellHandle = createStatCell({
        value: '--',
        label: i18n.t('stat_images'),
        key: 'images',
    });
    const statElapsed: StatCellHandle = createStatCell({
        value: '00:00',
        label: i18n.t('stat_elapsed'),
        key: 'elapsed',
    });
    const stats = h('div', { class: `${NS}-stats` }, [
        statPosts.element,
        statImages.element,
        statElapsed.element,
    ]);

    // Live shard preview — derives from Store.posts every refresh, hidden
    // until any posts have been captured. The user wanted statistics visible
    // *while* recording (not only at export), and this is the cheapest signal:
    // shard count + oversize warnings tell them whether their thread will
    // produce a clean sharded export or hit the oversize edge case.
    const shardPreview = h('div', {
        class: `${NS}-toggle-desc`,
        style: { paddingTop: '4px', textAlign: 'center' },
    }) as HTMLDivElement;
    shardPreview.hidden = true;

    // ── mode row ──────────────────────────────────────────────
    const modeText = h('span', { text: i18n.t('status_idle') }) as HTMLSpanElement;
    const modeBadge = h('span', {
        class: `${NS}-mode-badge`,
        text: i18n.t('mode_detecting'),
    }) as HTMLSpanElement;
    const modeRow = h('div', { class: `${NS}-mode-row` }, [modeText, modeBadge]);

    // ── action buttons ────────────────────────────────────────
    const startBtn: ButtonHandle = createButton({
        label: i18n.t('btn_start'),
        icon: 'play',
        variant: 'primary',
        fullWidth: true,
        onClick: () => {
            Recorder.start();
            const m = Store.state.mode;
            Toast.show(
                m === 'discourse'
                    ? i18n.t('toast_started_discourse')
                    : i18n.t('toast_started_generic'),
                'success',
                1800
            );
        },
    });

    const pauseBtn: ButtonHandle = createButton({
        label: i18n.t('btn_pause'),
        icon: 'pause',
        onClick: () => {
            if (Store.state.paused) {
                Recorder.resume();
                Toast.show(i18n.t('toast_resumed'), 'info', 1200);
            } else {
                Recorder.pause();
                Toast.show(i18n.t('toast_paused'), 'warning', 1200);
            }
        },
    });

    const stopBtn: ButtonHandle = createButton({
        label: i18n.t('btn_stop'),
        icon: 'stop',
        variant: 'danger',
        onClick: () => {
            Recorder.stop();
            Toast.show(i18n.t('toast_stopped'), 'info', 1200);
        },
    });

    const clearBtn: ButtonHandle = createButton({
        label: i18n.t('btn_clear'),
        icon: 'trash',
        onClick: () => {
            const counts = Store.counts();
            if (counts.posts + counts.chunks === 0) {
                Recorder.clear();
                return;
            }
            if (window.confirm(i18n.t('toast_clear_confirm'))) {
                Recorder.clear();
                Toast.show(i18n.t('toast_cleared'), 'info', 1200);
            }
        },
    });

    const actionRow = h('div', { class: `${NS}-btn-row` }, [
        pauseBtn.element,
        stopBtn.element,
    ]);

    // ── capture strategy ──────────────────────────────────────
    const strategyCard = createOptionCardList<CaptureStrategy>({
        value: Store.get('captureStrategy'),
        options: [
            {
                value: 'scroll',
                name: i18n.t('strategy_scroll'),
                description: i18n.t('strategy_scroll_desc'),
            },
            {
                value: 'api',
                name: i18n.t('strategy_api'),
                description: i18n.t('strategy_api_desc'),
            },
        ],
        onChange: (next) => {
            Store.patch({ captureStrategy: next });
            storageOP.set(STORAGE_KEYS.captureStrategy, next);
        },
        ariaLabel: i18n.t('section_capture_strategy'),
    });

    // API capture progress is rendered by the Activity Panel (in-dock task
    // card with progress bar + ETA + cancel). No inline text needed here.

    // ── assemble ──────────────────────────────────────────────
    const strategyGroup = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_capture_strategy') }),
        strategyCard.element,
    ]);

    const element = h(
        'div',
        {
            class: `${NS}-tabpanel`,
            role: 'tabpanel',
            id: `${NS}-tabpanel-capture`,
            'aria-labelledby': `${NS}-tab-capture`,
        },
        [
            stats,
            shardPreview,
            modeRow,
            startBtn.element,
            actionRow,
            clearBtn.element,
            strategyGroup,
        ]
    ) as HTMLDivElement;

    function refresh(): void {
        const counts = Store.counts();
        const total = counts.posts || counts.chunks;
        const mode = Store.state.mode;
        const recording = Store.state.recording;
        const paused = Store.state.paused;

        statPosts.setValue(String(counts.posts || counts.chunks));
        statImages.setValue(String(counts.images));
        statElapsed.setValue(formatHMS(Store.elapsedMs()));

        // Shard preview — only computes when posts are present, and is
        // memoised inside previewShardPlan() so this is cheap to call
        // every state:changed tick.
        const plan = counts.posts > 0 ? previewShardPlan() : null;
        if (plan) {
            const oversize = plan.totals.oversizeShards;
            const head = `📦 ${plan.shards.length} ${i18n.t('shard_preview_shards')}`;
            const tail =
                oversize > 0
                    ? ` · ⚠ ${oversize} ${i18n.t('shard_preview_oversize')}`
                    : '';
            shardPreview.textContent = head + tail;
            shardPreview.hidden = false;
        } else {
            shardPreview.hidden = true;
            shardPreview.textContent = '';
        }

        const modeLabel =
            mode === 'discourse'
                ? i18n.t('mode_discourse')
                : mode === 'generic'
                  ? i18n.t('mode_generic')
                  : i18n.t('mode_detecting');
        const statusLabel = recording
            ? paused
                ? i18n.t('status_paused')
                : i18n.t('status_recording')
            : total > 0
              ? i18n.t('status_stopped')
              : i18n.t('status_idle');
        modeText.textContent = statusLabel;
        modeBadge.textContent = modeLabel;
        modeBadge.classList.toggle(`${NS}-generic`, mode !== 'discourse');

        // Buttons
        startBtn.setDisabled(recording);
        startBtn.setLabel(
            recording ? i18n.t('btn_recording') : i18n.t('btn_start')
        );
        pauseBtn.setDisabled(!recording);
        pauseBtn.setLabel(paused ? i18n.t('btn_resume') : i18n.t('btn_pause'));
        pauseBtn.setIcon(paused ? 'play' : 'pause');
        stopBtn.setDisabled(!recording);
        clearBtn.setDisabled(total === 0 && !recording);

        strategyCard.set(Store.get('captureStrategy'));
    }

    refresh();

    // Hint-only: pre-warm the icon cache for the play icon swap on pause.
    IconManager.flexible('play');

    return { element, refresh };
}
