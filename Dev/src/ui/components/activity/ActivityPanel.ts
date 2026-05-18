// Activity Panel — pinned at the bottom of the Dock body (above the footer).
// Shows one TaskCard per registered task. Hidden when empty. Rebuilds itself
// when the locale changes (parent Dock destroys + recreates).
//
// Subscribes to task:registered / task:updated / task:ended / task:dismissed.
// rAF-coalesces card creates/updates so a producer ticking 50× / sec only
// triggers one DOM mutation per frame.
//
// Cancel / dismiss are wired to the Tasks registry directly. Retry is wired
// via the deps' onRetry callback so the panel doesn't pull in
// imageRetry.ts directly (keeps the dependency graph one-way).

import { NS } from '../../../bootstrap/config';
import { Bus } from '../../../core/eventBus';
import { Tasks } from '../../../core/taskRegistry';
import { h } from '../../../utils/dom';
import { createTaskCard, type TaskCardHandle } from './TaskCard';
import type { I18n } from '../../../infra/i18n/i18n';
import type { TaskSnapshot } from '../../../core/tasks';

export interface ActivityPanelHandle {
    element: HTMLDivElement;
    refresh(): void;
    destroy(): void;
}

export interface ActivityPanelDeps {
    i18n: I18n;
    // Retry handler — invoked when the user clicks the "Retry N" button on a
    // failed task's failure list. Receives the original task id.
    onRetry(taskId: string): void;
}

export function createActivityPanel(deps: ActivityPanelDeps): ActivityPanelHandle {
    const cards = new Map<string, TaskCardHandle>();
    const list = h('div', { class: `${NS}-activity-list` }) as HTMLDivElement;
    const element = h(
        'div',
        {
            class: `${NS}-activity-panel`,
            role: 'region',
            'aria-label': deps.i18n.t('activity_panel_label'),
        },
        [list]
    ) as HTMLDivElement;
    element.hidden = true;

    const pendingIds = new Set<string>();
    let rafToken = 0;

    function scheduleRender(id: string): void {
        pendingIds.add(id);
        if (rafToken !== 0) return;
        rafToken = requestAnimationFrame(flushRender);
    }

    function ensureCard(snap: TaskSnapshot): TaskCardHandle {
        let card = cards.get(snap.id);
        if (card) return card;
        card = createTaskCard({
            i18n: deps.i18n,
            snapshot: snap,
            actions: {
                onCancel: (id) => Tasks.cancel(id),
                onRetry: (id) => deps.onRetry(id),
                onDismiss: (id) => Tasks.dismiss(id),
            },
        });
        cards.set(snap.id, card);
        list.appendChild(card.element);
        return card;
    }

    function flushRender(): void {
        rafToken = 0;
        for (const id of pendingIds) {
            const snap = Tasks.get(id);
            const existing = cards.get(id);
            if (!snap) {
                // Task was dismissed between schedule and flush.
                existing?.destroy();
                cards.delete(id);
                continue;
            }
            const card = ensureCard(snap);
            card.update(snap);
        }
        pendingIds.clear();
        updateVisibility();
    }

    function updateVisibility(): void {
        const shouldShow = cards.size > 0;
        if (element.hidden === !shouldShow) return;
        element.hidden = !shouldShow;
    }

    function onRegistered(snap: TaskSnapshot): void {
        scheduleRender(snap.id);
    }
    function onUpdated(snap: TaskSnapshot): void {
        scheduleRender(snap.id);
    }
    function onEnded(snap: TaskSnapshot): void {
        scheduleRender(snap.id);
    }
    function onDismissed(payload: { id: string }): void {
        const card = cards.get(payload.id);
        card?.destroy();
        cards.delete(payload.id);
        // Drop any pending render for this id — there's no record to read.
        pendingIds.delete(payload.id);
        updateVisibility();
    }

    const offRegistered = Bus.on('task:registered', onRegistered);
    const offUpdated = Bus.on('task:updated', onUpdated);
    const offEnded = Bus.on('task:ended', onEnded);
    const offDismissed = Bus.on('task:dismissed', onDismissed);

    // Seed from any tasks already in flight when the panel mounts — happens
    // on locale rebuild.
    for (const snap of Tasks.list()) {
        scheduleRender(snap.id);
    }

    function refresh(): void {
        for (const id of cards.keys()) scheduleRender(id);
    }

    function destroy(): void {
        offRegistered();
        offUpdated();
        offEnded();
        offDismissed();
        if (rafToken !== 0) {
            cancelAnimationFrame(rafToken);
            rafToken = 0;
        }
        pendingIds.clear();
        for (const card of cards.values()) card.destroy();
        cards.clear();
        element.remove();
    }

    return { element, refresh, destroy };
}
