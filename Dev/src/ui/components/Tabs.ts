// Tab strip — three buttons (Capture / Export / Settings) with a sliding
// underline indicator. The buttons own only the visual switching; the dock
// owns the actual panel show/hide.

import { NS } from '../../bootstrap/config';
import { h } from '../../utils/dom';
import { IconManager, type IconName } from './IconManager';
import type { TabId } from '../../bootstrap/config';

export interface TabDescriptor {
    id: TabId;
    label: string;
    icon?: IconName;
    ariaLabel?: string;
}

export interface TabsConfig {
    tabs: TabDescriptor[];
    active: TabId;
    onChange: (id: TabId) => void;
}

export interface TabsHandle {
    element: HTMLDivElement;
    setActive(id: TabId): void;
    relabel(tabs: TabDescriptor[]): void;
}

export function createTabs(config: TabsConfig): TabsHandle {
    let active = config.active;
    let descriptors = config.tabs;

    function buildButton(desc: TabDescriptor): HTMLButtonElement {
        const selected = desc.id === active;
        const inner = desc.icon
            ? `${IconManager.flexible(desc.icon)}<span>${escapeHtml(desc.label)}</span>`
            : escapeHtml(desc.label);
        return h('button', {
            class: `${NS}-tab-btn`,
            type: 'button',
            role: 'tab',
            'data-tab': desc.id,
            'aria-selected': String(selected),
            'aria-controls': `${NS}-tabpanel-${desc.id}`,
            id: `${NS}-tab-${desc.id}`,
            'aria-label': desc.ariaLabel ?? desc.label,
            html: inner,
            onclick: () => {
                if (desc.id === active) return;
                setActive(desc.id);
                config.onChange(desc.id);
            },
        }) as HTMLButtonElement;
    }

    function rebuild(): void {
        element.innerHTML = '';
        for (const d of descriptors) element.appendChild(buildButton(d));
    }

    function setActive(next: TabId): void {
        if (next === active) return;
        active = next;
        const buttons = element.querySelectorAll<HTMLButtonElement>(
            `.${NS}-tab-btn`
        );
        buttons.forEach((b) => {
            const selected = b.dataset.tab === active;
            b.setAttribute('aria-selected', String(selected));
        });
    }

    const element = h('div', {
        class: `${NS}-tabbar`,
        role: 'tablist',
    }) as HTMLDivElement;

    rebuild();

    return {
        element,
        setActive,
        relabel(tabs) {
            descriptors = tabs;
            rebuild();
        },
    };
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
