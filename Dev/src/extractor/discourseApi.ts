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

import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import { htmlToMarkdown } from './htmlToMarkdown';
import { collectImageUrls } from './images';
import type { PostData } from '../core/types';

const BATCH_SIZE = 20;
const REQUEST_GAP_MS = 120; // tiny pause between batches so we don't get rate-limited

let aborted = false;

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

async function fetchJSON<T>(url: string): Promise<T> {
    const res = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
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

export async function captureAll(): Promise<{ posts: number; total: number }> {
    aborted = false;
    const topicId = getTopicId();
    if (topicId == null) {
        throw new Error('无法识别 Discourse topic ID');
    }

    Bus.emit('apicapture:started', undefined);

    const topic = await fetchJSON<TopicResponse>(`/t/${topicId}.json`);
    const slug = topic.slug;
    const stream = topic.post_stream?.stream ?? [];
    const seedPosts = topic.post_stream?.posts ?? [];

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
    Bus.emit('apicapture:progress', { done: seedPosts.length, total: stream.length });

    // Walk the stream in BATCH_SIZE chunks, skipping IDs we've already seen
    // from the seed batch.
    const seenIds = new Set(seedPosts.map((p) => p.id));
    const remaining = stream.filter((id) => !seenIds.has(id));

    let done = seedPosts.length;
    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        if (aborted) {
            Bus.emit('apicapture:stopped', { reason: 'manual' });
            return { posts: Store.state.posts.size, total: stream.length };
        }
        const ids = remaining.slice(i, i + BATCH_SIZE);
        const qs = ids.map((id) => `post_ids[]=${id}`).join('&');
        try {
            const batch = await fetchJSON<PostsResponse>(`/t/${topicId}/posts.json?${qs}`);
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
            Bus.emit('apicapture:progress', { done, total: stream.length });
        } catch (err) {
            Bus.emit('apicapture:stopped', {
                reason: 'error',
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
        if (i + BATCH_SIZE < remaining.length) {
            await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
        }
    }

    Bus.emit('apicapture:stopped', { reason: 'end' });
    Bus.emit('capture:complete', { reason: 'api' });
    return { posts: Store.state.posts.size, total: stream.length };
}

export function abort(): void {
    aborted = true;
}

export const DiscourseApi = { captureAll, abort, getTopicId };
