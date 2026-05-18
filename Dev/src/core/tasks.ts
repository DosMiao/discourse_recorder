// Task model — used by the Activity Panel and any producer that wants
// rich, real-time progress (exporter, image downloader, API capture).
//
// A Task is a snapshot of one async operation. The TaskRegistry (taskRegistry.ts)
// owns the live records; producers call create/update/end through it, and
// consumers (the Activity Panel) subscribe to the `task:*` bus events.
//
// Design notes:
//   - `titleKey` + `titleParams` keep tasks locale-independent — the panel
//     localises at render time.
//   - `failures[]` is capped (see MAX_RETAINED_FAILURES in taskRegistry); when
//     the cap is reached, oldest entries are dropped and `failuresTruncated`
//     is incremented so the UI can show "+N more".
//   - `parentId` / `childIds` let retry sub-tasks be linked to their origin
//     without mutating the original task's history.

import type { StringKey } from '../infra/i18n/zh';

export type TaskKind =
    | 'export.zip'
    | 'export.sharded'
    | 'apicapture'
    | 'image.download'
    | 'image.retry';

export type TaskStatus =
    | 'pending'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled';

export type TaskUnit = 'posts' | 'images' | 'files' | 'items';

export type TaskStageStatus = 'pending' | 'active' | 'done' | 'skipped';

export interface TaskFailure {
    // Stable identity used by retry — for image tasks this is the URL.
    id: string;
    label: string;
    error: string;
    at: number;
}

export interface TaskStage {
    id: string;
    labelKey: StringKey;
    status: TaskStageStatus;
    done?: number;
    total?: number;
}

export interface TaskSnapshot {
    id: string;
    kind: TaskKind;
    status: TaskStatus;
    titleKey: StringKey;
    titleParams?: Record<string, string | number>;
    unit: TaskUnit;
    done: number;
    total: number;
    failedCount: number;
    failures: readonly TaskFailure[];
    failuresTruncated: number;
    stages: readonly TaskStage[];
    activeStageId: string | null;
    message: string | null;
    startedAt: number;
    endedAt: number | null;
    parentId: string | null;
    childIds: readonly string[];
    cancellable: boolean;
    retryable: boolean;
    throughputPerSec: number;
    etaMs: number | null;
}

export interface CreateTaskInput {
    kind: TaskKind;
    titleKey: StringKey;
    titleParams?: Record<string, string | number>;
    unit: TaskUnit;
    total: number;
    stages?: TaskStage[];
    parentId?: string;
    cancellable?: boolean;
    retryable?: boolean;
}

export interface UpdateTaskInput {
    done?: number;
    total?: number;
    message?: string | null;
    activeStageId?: string | null;
    stagePatch?: {
        id: string;
        status?: TaskStageStatus;
        done?: number;
        total?: number;
    };
    addFailure?: Omit<TaskFailure, 'at'>;
    removeFailure?: string;
}

export interface EndTaskInput {
    status: 'succeeded' | 'failed' | 'cancelled';
    message?: string | null;
}
