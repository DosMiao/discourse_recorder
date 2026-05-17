// Discourse-specific extraction:
//   - isDiscoursePage()    : sniff via meta/generator/root markup
//   - getTopicMeta()       : title, URL, category, tags
//   - extractPostData(el)  : pull post fields from a rendered <article id="post_N">
//   - seedFromPreloaded()  : parse <div id="data-preloaded"> JSON
//
// Discourse uses virtual scrolling, so posts get unmounted as you scroll.
// The recorder layers three independent capture paths: preloaded JSON
// (initial batch), DOM observer (anything currently mounted), and a scroll
// listener (re-scan after the virtual scroller swaps).

import { Store } from '../core/store';
import { htmlToMarkdown } from './htmlToMarkdown';
import { collectImageUrls } from './images';
import type { PostData, TopicMeta } from '../core/types';

export function isDiscoursePage(): boolean {
    const gen = document.querySelector('meta[name="generator"]');
    if (gen && /Discourse/i.test(gen.getAttribute('content') ?? '')) return true;
    if (document.querySelector('meta[name="discourse_theme_id"]')) return true;
    if (document.querySelector('#main-outlet, .post-stream, article[id^="post_"]')) return true;
    return false;
}

export function getTopicMeta(): TopicMeta {
    const titleEl = document.querySelector(
        '.fancy-title, .topic-title, h1 .topic-link, h1 a'
    );
    const title =
        titleEl?.textContent?.trim() ?? document.title.replace(/\s*-\s*[^-]*$/, '').trim();

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const url = canonical?.href ?? location.href;

    const categoryEl = document.querySelector(
        '.topic-category .badge-category__name, .badge-category .badge-category__name'
    );
    const category = categoryEl?.textContent?.trim() ?? '';

    const tags = Array.from(document.querySelectorAll('.discourse-tag'))
        .map((t) => t.textContent?.trim() ?? '')
        .filter(Boolean);

    return { title, url, category, tags: Array.from(new Set(tags)) };
}

export function extractPostData(article: Element): PostData {
    let postNumber: number | null = null;

    const id = article.id || '';
    const idMatch = id.match(/^post_(\d+)$/);
    if (idMatch && idMatch[1]) postNumber = parseInt(idMatch[1], 10);

    if (postNumber === null) {
        const numEl = article.querySelector('.post-info.post-number, [itemprop="position"]');
        const m = numEl?.textContent?.match(/\d+/);
        if (m) postNumber = parseInt(m[0], 10);
    }
    if (postNumber === null) {
        const ariaPost = article.getAttribute('data-post-number');
        if (ariaPost) postNumber = parseInt(ariaPost, 10);
    }

    const usernameLink = article.querySelector(
        '.names .first .username a, .names .username a, .creator .username a, a[data-user-card]'
    );
    const username =
        usernameLink?.getAttribute('data-user-card') ??
        usernameLink?.textContent?.trim() ??
        '';

    const fullNameEl = article.querySelector('.names .full-name, .names .second.full-name a');
    const fullName = fullNameEl?.textContent?.trim() ?? '';

    const timeEl = article.querySelector(
        '.post-info.post-date a, .post-date a, .relative-date, time'
    );
    let postedAt = '';
    let postedAtIso = '';
    if (timeEl) {
        postedAt =
            timeEl.getAttribute('title') ??
            timeEl.getAttribute('data-time') ??
            timeEl.textContent?.trim() ??
            '';
        const dt = timeEl.getAttribute('datetime') ?? timeEl.getAttribute('data-time');
        if (dt) {
            const n = Number(dt);
            postedAtIso = Number.isNaN(n) ? dt : new Date(n).toISOString();
        }
    }

    const permaEl = article.querySelector(
        '.post-info.post-date a, .post-date a'
    ) as HTMLAnchorElement | null;
    const permalink = permaEl?.href ?? '';

    const cooked = article.querySelector('.cooked');
    const text = cooked ? htmlToMarkdown(cooked) : (article.textContent ?? '').trim();
    const images = cooked && Store.get('captureImages') ? collectImageUrls(cooked) : [];

    const likeBtn = article.querySelector('.like-count, button.like-count');
    const likeMatch = likeBtn?.textContent?.match(/\d+/);
    const likes = likeMatch ? parseInt(likeMatch[0], 10) : 0;

    return {
        postNumber: postNumber ?? 0,
        username,
        fullName,
        postedAt,
        postedAtIso,
        permalink,
        text,
        images,
        likes,
        capturedAt: new Date().toISOString(),
        source: 'dom',
    };
}

interface PreloadedPost {
    post_number: number;
    username?: string;
    name?: string;
    created_at?: string;
    cooked?: string;
}

interface PreloadedTopic {
    id?: number;
    slug?: string;
    title?: string;
    post_stream?: { posts?: PreloadedPost[] };
}

export function seedFromPreloaded(): number {
    const node = document.getElementById('data-preloaded');
    if (!node) return 0;
    let outer: Record<string, string>;
    try {
        outer = JSON.parse(node.getAttribute('data-preloaded') ?? '{}');
    } catch {
        return 0;
    }

    let added = 0;
    const captureImages = Store.get('captureImages');

    for (const key of Object.keys(outer)) {
        if (!key.startsWith('topic_')) continue;
        let topic: PreloadedTopic;
        try {
            topic = JSON.parse(outer[key] ?? '{}');
        } catch {
            continue;
        }
        const posts = topic.post_stream?.posts;
        if (!Array.isArray(posts)) continue;

        const existingMeta = Store.state.topicMeta;
        if (!existingMeta || !existingMeta.title) {
            Store.state.topicMeta = {
                title: topic.title ?? existingMeta?.title ?? '',
                url: existingMeta?.url ?? location.href,
                category: existingMeta?.category ?? '',
                tags: existingMeta?.tags ?? [],
            };
        }

        for (const p of posts) {
            if (typeof p.post_number !== 'number') continue;
            const tmp = document.createElement('div');
            tmp.innerHTML = p.cooked ?? '';
            const text = htmlToMarkdown(tmp);
            const images = captureImages ? collectImageUrls(tmp) : [];
            const existing = Store.state.posts.get(p.post_number);
            if (!existing || (text && text.length > (existing.text ?? '').length)) {
                Store.state.posts.set(p.post_number, {
                    postNumber: p.post_number,
                    username: p.username ?? '',
                    fullName: p.name ?? '',
                    postedAt: p.created_at ?? '',
                    postedAtIso: p.created_at ?? '',
                    permalink:
                        location.origin +
                        (topic.slug && topic.id
                            ? `/t/${topic.slug}/${topic.id}/${p.post_number}`
                            : ''),
                    text,
                    images,
                    likes: 0,
                    capturedAt: new Date().toISOString(),
                    source: 'preloaded',
                });
                added++;
            }
        }
    }
    return added;
}
