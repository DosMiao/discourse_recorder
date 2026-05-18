// Shared data shapes used across modules. Keeping them in one place avoids
// circular imports between Store ↔ Recorder ↔ Exporter.

import type { TabId } from '../bootstrap/config';
import type { TaskSnapshot } from './tasks';

export type ThemeMode = 'light' | 'dark' | 'system';
// 'sharded' is a ZIP variant that splits posts.md into per-range shards and
// emits an index.md / by-user.md / posts.jsonl — designed for AI tools that
// hit per-Read line limits on thousand-post threads.
export type ExportFormat = 'both' | 'md' | 'json' | 'zip' | 'sharded';
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

// One shard in the sharded export — a contiguous postNumber range that fits
// under capLines (or a single oversized post that exceeds it).
export interface ShardEntry {
    name: string; // "p0001-0187" or "p1487"
    path: string; // "posts/p0001-0187.md"
    firstPost: number;
    lastPost: number;
    postCount: number;
    lineCount: number;
    userCount: number;
    imageCount: number;
    oversize: boolean; // true if a single post on its own exceeds capLines
}

export interface ShardStats {
    posts: number;
    users: number;
    images: number;
    chars: number;
    lines: number;
    shards: number;
    oversizeShards: number;
}

// Output of planShards(). The postLocations map lets the index file point at
// the exact line a post starts on within its shard, without re-rendering.
export interface ShardPlan {
    capLines: number;
    shards: ShardEntry[];
    postLocations: Map<number, { shardName: string; shardPath: string; line: number }>;
    totals: ShardStats;
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
    'apicapture:stopped': { reason: 'end' | 'manual' | 'error'; error?: string };
    // Unified "capture pass complete" signal — fires once per session when
    // either AutoScroll exits with 'end' OR the API capture finishes. Consumed
    // by the auto-save chain so it doesn't have to subscribe to both.
    'capture:complete': { reason: 'autoscroll' | 'api' };
    // Unified task model — drives the Activity Panel and any rich-progress
    // consumer. All progress reporting flows through Tasks (core/taskRegistry.ts).
    'task:registered': TaskSnapshot;
    'task:updated': TaskSnapshot;
    'task:ended': TaskSnapshot;
    'task:dismissed': { id: string };
    'theme:applied': { mode: ThemeMode; effective: 'light' | 'dark' };
    'locale:changed': { locale: 'zh' | 'en' };
    'tab:changed': { tab: TabId };
}
