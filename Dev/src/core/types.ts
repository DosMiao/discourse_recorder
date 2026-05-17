// Shared data shapes used across modules. Keeping them in one place avoids
// circular imports between Store ↔ Recorder ↔ Exporter.

import type { TabId } from '../bootstrap/config';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ExportFormat = 'both' | 'md' | 'json' | 'zip';
export type CaptureMode = 'idle' | 'discourse' | 'generic';
export type ToastType = 'success' | 'info' | 'warning' | 'error';
// 'scroll' walks the page via AutoScroll (works everywhere, slow).
// 'api'    hits Discourse's JSON endpoints in batches (Discourse-only, ~50× faster).
export type CaptureStrategy = 'scroll' | 'api';

export type { TabId };

export interface TopicMeta {
    title: string;
    url: string;
    category: string;
    tags: string[];
}

export interface PostData {
    postNumber: number;
    username: string;
    fullName: string;
    postedAt: string;
    postedAtIso: string;
    permalink: string;
    text: string;
    images: string[];
    likes: number;
    capturedAt: string;
    source?: 'dom' | 'preloaded';
}

export interface GenericChunk {
    tag: string;
    text: string;
    images: string[];
    ts: string;
}

export interface DockPosition {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
}

// Bus event channel → payload map. Strongly typed at the call site via
// keyof EventMap so listeners receive the right payload shape.
export interface EventMap {
    'state:changed': void;
    'capture:tick': { added: number };
    'recorder:started': { mode: CaptureMode };
    'recorder:stopped': void;
    'recorder:paused': void;
    'recorder:resumed': void;
    'recorder:cleared': void;
    'autoscroll:started': void;
    'autoscroll:stopped': { reason: 'manual' | 'end' | 'max' };
    'apicapture:started': void;
    'apicapture:progress': { done: number; total: number };
    'apicapture:stopped': { reason: 'end' | 'manual' | 'error'; error?: string };
    // Unified "capture pass complete" signal — fires once per session when
    // either AutoScroll exits with 'end' OR the API capture finishes. Consumed
    // by the auto-save chain so it doesn't have to subscribe to both.
    'capture:complete': { reason: 'autoscroll' | 'api' };
    'export:progress': {
        phase: 'idle' | 'downloading' | 'zipping' | 'done' | 'error';
        done: number;
        total: number;
        failed: number;
        message?: string;
    };
    'theme:applied': { mode: ThemeMode; effective: 'light' | 'dark' };
    'locale:changed': { locale: 'zh' | 'en' };
    'tab:changed': { tab: TabId };
}
