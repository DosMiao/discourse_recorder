// Radio-card list — used by the capture-strategy picker where each option
// needs a longer description than a segmented control comfortably shows.

import { NS } from '../../bootstrap/config';
import { h } from '../../utils/dom';

export interface OptionCardItem<V extends string> {
    value: V;
    name: string;
    description?: string;
}

export interface OptionCardConfig<V extends string> {
    options: OptionCardItem<V>[];
    value: V;
    onChange: (next: V) => void;
    ariaLabel?: string;
}

export interface OptionCardHandle<V extends string> {
    element: HTMLDivElement;
    set(value: V): void;
}

export function createOptionCardList<V extends string>(
    config: OptionCardConfig<V>
): OptionCardHandle<V> {
    let current = config.value;

    function makeCard(opt: OptionCardItem<V>): HTMLButtonElement {
        const pressed = opt.value === current;
        const text = h('div', { class: `${NS}-option-card-text` }, [
            h('div', { class: `${NS}-option-card-name`, text: opt.name }),
            opt.description
                ? h('div', { class: `${NS}-option-card-desc`, text: opt.description })
                : '',
        ]);
        const card = h(
            'button',
            {
                class: `${NS}-option-card`,
                type: 'button',
                role: 'radio',
                'data-value': opt.value,
                'aria-checked': String(pressed),
                'aria-pressed': String(pressed),
                onclick: () => {
                    if (current === opt.value) return;
                    set(opt.value);
                    config.onChange(opt.value);
                },
            },
            [h('span', { class: `${NS}-option-card-radio` }), text]
        ) as HTMLButtonElement;
        return card;
    }

    function applyPressed(): void {
        const cards = element.querySelectorAll<HTMLButtonElement>(
            `.${NS}-option-card`
        );
        cards.forEach((b) => {
            const v = b.dataset.value === current;
            b.setAttribute('aria-pressed', String(v));
            b.setAttribute('aria-checked', String(v));
        });
    }

    function set(value: V): void {
        if (value === current) return;
        current = value;
        applyPressed();
    }

    const element = h(
        'div',
        {
            class: `${NS}-option-list`,
            role: 'radiogroup',
            'aria-label': config.ariaLabel ?? 'options',
        },
        config.options.map(makeCard)
    ) as HTMLDivElement;

    return { element, set };
}
