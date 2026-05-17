// One cell of the stat row — big tabular value + small uppercase label.

import { NS } from '../../bootstrap/config';
import { h } from '../../utils/dom';

export interface StatCellConfig {
    value: string;
    label: string;
    key?: string;
}

export interface StatCellHandle {
    element: HTMLDivElement;
    setValue(value: string): void;
}

export function createStatCell(config: StatCellConfig): StatCellHandle {
    const value = h('div', {
        class: `${NS}-stat-value`,
        text: config.value,
    }) as HTMLDivElement;
    const element = h(
        'div',
        {
            class: `${NS}-stat`,
            'data-stat': config.key ?? config.label,
        },
        [value, h('div', { class: `${NS}-stat-label`, text: config.label })]
    ) as HTMLDivElement;
    return {
        element,
        setValue(next) {
            if (value.textContent !== next) value.textContent = next;
        },
    };
}
