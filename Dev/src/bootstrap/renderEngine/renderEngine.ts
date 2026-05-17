// Owns the lifecycle of the user-facing UI surface (the dock and its tabs).
// The initializer asks the render engine to attach to a host element; from
// there the engine creates the dock, wires its Bus subscriptions, and
// re-renders on tab/state changes.
//
// AmexOfferMax has multiple full-screen views and a renderEngine that
// caches DOM per view. This script has a single Dock, so the engine is
// thinner — but the seam exists so future surfaces (e.g. a fullscreen
// browser tab) can plug in without touching initializer.

import { ROOT_ID } from '../config';
import { injectStyles } from '../../ui/styles/injectStyles';
import { createDock, type DockHandle } from '../../ui/components/Dock';
import type { ApplicationServices } from '../serviceFactory';

export interface RenderEngine {
    mount(): boolean;
    isMounted(): boolean;
    refresh(): void;
}

export interface RenderEngineResult {
    renderEngine: RenderEngine;
}

export function createRenderEngine(services: ApplicationServices): RenderEngineResult {
    const { i18n, logRender } = services;
    let dock: DockHandle | null = null;

    const renderEngine: RenderEngine = {
        mount(): boolean {
            if (document.getElementById(ROOT_ID)?.querySelector('.dtr-dock')) {
                logRender.debug('mount.skip', { message: 'dock already present' });
                return false;
            }

            const span = logRender.span('mount', { message: 'styles + dock' });
            injectStyles();
            dock = createDock({ i18n });
            dock.mount();
            span.end({}, 'info');
            return true;
        },

        isMounted(): boolean {
            return dock !== null;
        },

        refresh(): void {
            dock?.refresh();
        },
    };

    return { renderEngine };
}
