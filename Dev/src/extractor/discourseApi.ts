// Fast-path capture via Discourse's JSON API. Two endpoints:
//
//   GET /t/<id>.json
//     Returns topic meta + the first ~20 posts + post_stream.stream
//     (the ordered list of EVERY post ID in the topic).
//
//   GET /t/<id>/posts.json?post_ids[]=N&post_ids[]=N&...
//     Batch-fetches up to 20 posts by ID. Subsequent pages walk the stream
//     in chunks.
//
// Compared to scroll-based capture, this is ~50× faster on long threads
// (2000 posts ≈ 100 requests ≈ 30s) and avoids Discourse's virtual scroller
// missing posts. The downside is it's Discourse-specific and depends on the
// site keeping the JSON endpoint accessible to logged-in users.
//
// Cancellation: callers pass `signal` via CaptureAllOptions and get an
// immediate `apicapture:stopped({reason:'manual'})` when they trigger it —
// no need to wait for the in-flight fetch to settle. The task signal owned
// by the Tasks registry is also honoured so the Activity Panel's cancel
// button works end-to-end.

import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import { Tasks } from '../core/taskRegistry';
import { htmlToMarkdown } from './htmlToMarkdown';
import { collectImageUrls } from './images';
import type { PostData } from '../core/types';
import type { TaskStage } from '../core/tasks';

const BATCH_SIZE = 20;
const REQUEST_GAP_MS = 120; // tiny pause between batches so we don't get rate-limited

interface ApiPost {
    id: number;
    post_number: number;
    username?: string;
    name?: string;
    created_at?: string;
    cooked?: string;
    actions_summary?: { id: number; count?: number }[];
}

interface TopicResponse {
    id?: number;
    slug?: string;
    title?: string;
    category_id?: number;
    post_stream?: {
        posts?: ApiPost[];
        stream?: number[];
    };
}

interface PostsResponse {
    post_stream?: {
        posts?: ApiPost[];
    };
}

export interface CaptureAllOptions {
    signal?: AbortSignal;
    onProgress?: (p: { done: number; total: number }) => void;
}

export function getTopicId(): number | null {
    // 1) <meta name="discourse-topic-id" content="502565">
    const metaEl = document.querySelector(
        'meta[name="discourse-topic-id"]'
    ) as HTMLMetaElement | null;
    if (metaEl?.content) {
        const n = parseInt(metaEl.content, 10);
        if (!Number.isNaN(n)) return n;
    }
    // 2) URL: /t/<slug>/<id> or /t/topic/<id>
    const m = location.pathname.match(/\/t\/(?:[^/]+\/)?(\d+)/);
    if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) return n;
    }
    // 3) any post article carries data-topic-id
    const art = document.querySelector('article[data-topic-id]') as HTMLElement | null;
    if (art?.dataset.topicId) {
        const n = parseInt(art.dataset.topicId, 10);
        if (!Number.isNaN(n)) return n;
    }
    return null;
}

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} (${url})`);
    return (await res.json()) as T;
}

function apiPostToPostData(p: ApiPost, slug: string | undefined, topicId: number): PostData {
    const tmp = document.createElement('div');
    tmp.innerHTML = p.cooked ?? '';
    const text = htmlToMarkdown(tmp);
    const images = Store.get('captureImages') ? collectImageUrls(tmp) : [];

    // actions_summary[].id === 2 is the "Like" action on stock Discourse.
    let likes = 0;
    if (Array.isArray(p.actions_summary)) {
        const like = p.actions_summary.find((a) => a && a.id === 2);
        if (like && typeof like.count === 'number') likes = like.count;
    }

    return {
        postNumber: p.post_number,
        username: p.username ?? '',
        fullName: p.name ?? '',
        postedAt: p.created_at ?? '',
        postedAtIso: p.created_at ?? '',
        permalink:
            location.origin +
            (slug ? `/t/${slug}/${topicId}/${p.post_number}` : `/t/${topicId}/${p.post_number}`),
        text,
        images,
        likes,
        capturedAt: new Date().toISOString(),
        source: 'preloaded',
    };
}

function mergePost(p: PostData): boolean {
    const existing = Store.state.posts.get(p.postNumber);
    if (!existing || (p.text && p.text.length > (existing.text ?? '').length)) {
        Store.state.posts.set(p.postNumber, p);
        return true;
    }
    return false;
}

function recomputeImageCount(): void {
    let total = 0;
    for (const p of Store.state.posts.values()) total += p.images.length;
    Store.patch({ imageCount: total });
}

export async function captureAll(opts: CaptureAllOptions = {}): Promise<{ posts: number; total: number }> {
    const { signal: callerSignal, onProgress } = opts;

    // Create the task up front so the panel shows "fetching topic..." stage
    // even before we know the post count. total is updated once stream.length
    // is known.
    const stages: TaskStage[] = [
        { id: 'fetch-topic', labelKey: 'task_stage_fetch_topic', status: 'pending' },
        { id: 'fetch-batch', labelKey: 'task_stage_fetch_batch', status: 'pending' },
    ];
    const { id: taskId, signal: taskSignal } = Tasks.create({
        kind: 'apicapture',
        titleKey: 'task_title_apicapture',
        unit: 'posts',
        total: 0,
        stages,
        cancellable: true,
        retryable: false,
    });

    // Single-shot stopped emit — fired by the task signal, the caller
    // signal, or normal completion. Dedup so autoSession doesn't get told
    // twice.
    let stoppedEmitted = false;
    const emitStopped = (
        payload: { reason: 'manual' | 'end' | 'error'; error?: string }
    ): void => {
        if (stoppedEmitted) return;
        stoppedEmitted = true;
        Bus.emit('apicapture:stopped', payload);
    };

    let signalAborted = false;
    const onSignalAbort = (): void => {
        if (signalAborted) return;
        signalAborted = true;
        // Producer must emit immediately so autoSession's pending capture:complete
        // listener doesn't wait on the in-flight fetch to settle.
        emitStopped({ reason: 'manual' });
    };
    callerSignal?.addEventListener('abort', onSignalAbort, { once: true });
    taskSignal.addEventListener('abort', onSignalAbort, { once: true });
    // Pre-aborted callers — fast-bail.
    if (callerSignal?.aborted || taskSignal.aborted) {
        onSignalAbort();
        Tasks.end(taskId, { status: 'cancelled' });
        return { posts: Store.state.posts.size, total: 0 };
    }

    const isAborted = (): boolean => signalAborted;
    const cleanup = (): void => {
        callerSignal?.removeEventListener('abort', onSignalAbort);
        taskSignal.removeEventListener('abort', onSignalAbort);
    };

    // We pass the task signal directly to fetch so an abort triggers the
    // network request to reject immediately rather than waiting for the loop
    // to notice. Caller signal still routes through `signalAborted` for the
    // loop check, but fetch only honours one AbortSignal at a time.
    const fetchSignal = taskSignal;

    try {
        const topicId = getTopicId();
        if (topicId == null) {
            throw new Error('无法识别 Discourse topic ID');
        }

        Bus.emit('apicapture:started', undefined);
        Tasks.update(taskId, { activeStageId: 'fetch-topic', stagePatch: { id: 'fetch-topic', status: 'active' } });

        const topic = await fetchJSON<TopicResponse>(`/t/${topicId}.json`, fetchSignal);
        const slug = topic.slug;
        const stream = topic.post_stream?.stream ?? [];
        const seedPosts = topic.post_stream?.posts ?? [];
        Tasks.update(taskId, { stagePatch: { id: 'fetch-topic', status: 'done' }, total: stream.length });

        // Seed posts come back with the same shape as the batched fetch — merge
        // them in first so the dock immediately shows progress.
        let added = 0;
        for (const p of seedPosts) {
            if (mergePost(apiPostToPostData(p, slug, topicId))) added++;
        }
        if (added > 0) {
            Store.state.lastCapturedAt = new Date();
            recomputeImageCount();
            Bus.emit('capture:tick', { added });
        }
        onProgress?.({ done: seedPosts.length, total: stream.length });
        Tasks.update(taskId, {
            activeStageId: 'fetch-batch',
            stagePatch: { id: 'fetch-batch', status: 'active', total: stream.length, done: seedPosts.length },
            done: seedPosts.length,
        });

        const seenIds = new Set(seedPosts.map((p) => p.id));
        const remaining = stream.filter((id) => !seenIds.has(id));

        let done = seedPosts.length;
        for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
            if (isAborted()) {
                emitStopped({ reason: 'manual' });
                Tasks.end(taskId, { status: 'cancelled' });
                return { posts: Store.state.posts.size, total: stream.length };
            }
            const ids = remaining.slice(i, i + BATCH_SIZE);
            const qs = ids.map((id) => `post_ids[]=${id}`).join('&');
            try {
                const batch = await fetchJSON<PostsResponse>(
                    `/t/${topicId}/posts.json?${qs}`,
                    fetchSignal
                );
                const posts = batch.post_stream?.posts ?? [];
                let batchAdded = 0;
                for (const p of posts) {
                    if (mergePost(apiPostToPostData(p, slug, topicId))) batchAdded++;
                }
                if (batchAdded > 0) {
                    Store.state.lastCapturedAt = new Date();
                    recomputeImageCount();
                    Bus.emit('capture:tick', { added: batchAdded });
                }
                done += posts.length;
                onProgress?.({ done, total: stream.length });
                Tasks.update(taskId, {
                    done,
                    stagePatch: { id: 'fetch-batch', done, total: stream.length },
                });
            } catch (err) {
                if (isAborted()) {
                    emitStopped({ reason: 'manual' });
                    Tasks.end(taskId, { status: 'cancelled' });
                    return { posts: Store.state.posts.size, total: stream.length };
                }
                const msg = err instanceof Error ? err.message : String(err);
                emitStopped({ reason: 'error', error: msg });
                Tasks.update(taskId, {
                    addFailure: { id: `batch-${i}`, label: `batch #${i / BATCH_SIZE + 1} (ids ${ids[0]}-${ids[ids.length - 1]})`, error: msg },
                });
                Tasks.end(taskId, { status: 'failed', message: msg });
                throw err;
            }
            if (i + BATCH_SIZE < remaining.length) {
                await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
            }
        }

        Tasks.update(taskId, { stagePatch: { id: 'fetch-batch', status: 'done' } });
        emitStopped({ reason: 'end' });
        Bus.emit('capture:complete', { reason: 'api' });
        Tasks.end(taskId, { status: 'succeeded' });
        return { posts: Store.state.posts.size, total: stream.length };
    } finally {
        cleanup();
    }
}

export const DiscourseApi = { captureAll, getTopicId };
