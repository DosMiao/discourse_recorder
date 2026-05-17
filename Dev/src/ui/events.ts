// Centralised typed-emit helpers for UI lifecycle events. Components emit
// through these wrappers so the underlying Bus channels and payload shapes
// stay consistent, and so a future test can spy on view changes without
// monkey-patching console.

import { Bus } from '../core/eventBus';
import type { TabId } from '../bootstrap/config';
import type { ToastType } from '../core/types';

export function emitTabChanged(tab: TabId): void {
    Bus.emit('tab:changed', { tab });
}

export function emitLocaleChanged(locale: 'zh' | 'en'): void {
    Bus.emit('locale:changed', { locale });
}

export function emitThemeApplied(
    mode: 'light' | 'dark' | 'system',
    effective: 'light' | 'dark'
): void {
    Bus.emit('theme:applied', { mode, effective });
}

// Re-exported for the dock's keyboard shortcut handler so it doesn't have
// to know the Toast singleton's import path.
export type { ToastType };
