// Expandable failure list rendered inside a TaskCard. Renders up to N
// failure rows; if the registry truncated extras (failuresTruncated > 0),
// shows a "...and N more" line at the bottom. The retry button (if the
// card hosts one) lives just below the list.
//
// Rebuild semantics: the list is rebuilt only when failures.length or
// failuresTruncated changes — see TaskCard.update(). That keeps DOM churn
// flat even if `update` runs every frame.

import { NS } from '../../../bootstrap/config';
import { h } from '../../../utils/dom';
import type { I18n } from '../../../infra/i18n/i18n';
import type { TaskFailure } from '../../../core/tasks';

export interface TaskFailureListHandle {
    element: HTMLDetailsElement;
    update(failures: readonly TaskFailure[], truncated: number): void;
    setRetryButton(button: HTMLButtonElement | null): void;
}

interface TaskFailureListDeps {
    i18n: I18n;
}

export function createTaskFailureList(deps: TaskFailureListDeps): TaskFailureListHandle {
    const { i18n } = deps;

    const summary = h('summary', { class: `${NS}-task-failures-summary` }) as HTMLElement;
    const list = h('ul', { class: `${NS}-task-failure-list` }) as HTMLUListElement;
    const moreLine = h('div', { class: `${NS}-task-failures-more` }) as HTMLDivElement;
    moreLine.hidden = true;
    const retrySlot = h('div', { class: `${NS}-task-failures-retry-slot` }) as HTMLDivElement;

    const element = h('details', { class: `${NS}-task-failures` }, [
        summary,
        list,
        moreLine,
        retrySlot,
    ]) as HTMLDetailsElement;
    element.hidden = true;

    let lastLength = -1;
    let lastTruncated = -1;
    let currentRetryBtn: HTMLButtonElement | null = null;

    function update(failures: readonly TaskFailure[], truncated: number): void {
        if (failures.length === 0 && truncated === 0) {
            element.hidden = true;
            lastLength = 0;
            lastTruncated = 0;
            return;
        }
        element.hidden = false;
        summary.textContent = i18n.t('task_failures_summary', { n: failures.length });
        // Only rebuild when content actually changes — most update() calls
        // come from done/total ticks, not new failures.
        if (failures.length !== lastLength || truncated !== lastTruncated) {
            list.replaceChildren();
            for (const f of failures) {
                const item = h('li', { class: `${NS}-task-failure-item` }, [
                    h('span', { class: `${NS}-task-failure-label`, text: f.label }),
                    h('span', {
                        class: `${NS}-task-failure-error`,
                        text: f.error || i18n.t('task_failure_unknown_error'),
                    }),
                ]);
                list.appendChild(item);
            }
            if (truncated > 0) {
                moreLine.textContent = i18n.t('task_failures_more', { n: truncated });
                moreLine.hidden = false;
            } else {
                moreLine.hidden = true;
            }
            lastLength = failures.length;
            lastTruncated = truncated;
        }
    }

    function setRetryButton(button: HTMLButtonElement | null): void {
        if (currentRetryBtn === button) return;
        retrySlot.replaceChildren();
        if (button) retrySlot.appendChild(button);
        currentRetryBtn = button;
    }

    return { element, update, setRetryButton };
}
