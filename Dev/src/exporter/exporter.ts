// Output builders + downloaders. Two flavours of markdown export:
//   - "flat"     — one big topic.md (human-readable transcript)
//   - "sharded"  — split into posts/p####-####.md shards, plus index.md /
//                  by-user.md / posts.jsonl / README.md (AI-friendly: every
//                  shard fits under Claude Code's per-Read line limit, and
//                  the index files contain ONLY structural metadata —
//                  never truncated content excerpts, so an AI can't mistake
//                  the index for the source).
//
// JSON export preserves the same data as a machine-readable structured
// record for downstream processing. JSONL export (used inside the sharded
// ZIP) is one Post per line — directly addressable with `Read offset=N`.

import {
    VERSION,
    DEFAULT_SHARD_CAP_LINES,
    MIN_SHARD_CAP_LINES,
    MAX_SHARD_CAP_LINES,
} from '../bootstrap/config';
import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import { getTopicMeta } from '../extractor/discourse';
import { downloadAll, type DownloadedImage } from './imageDownload';
import { buildZip, type ZipEntry } from './zip';
import type {
    PostData,
    ShardEntry,
    ShardPlan,
    TopicMeta,
} from '../core/types';

// 60 chars (down from 120) leaves headroom for: 11-char date prefix, the
// ~25-char Downloads root, the inside-zip `posts/p####-####.md` suffix (~22
// chars), and the user's eventual destination path — without bumping into
// Windows MAX_PATH=260 when the file gets moved around. CJK titles still fit
// comfortably (60 codepoints ≈ a meaningful sentence).
const MAX_TITLE_SLICE = 60;

function safeFilename(name: string): string {
    return (
        (name || 'recording')
            .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
            .slice(0, MAX_TITLE_SLICE)
            .trim() || 'recording'
    );
}

// YYYY-MM-DD in local time. Used as the session-prefix date component so the
// folder grouping in Downloads matches the user's mental model of "today",
// not UTC (which can disagree near midnight).
function localDate(d: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Build a session slug: "{YYYY-MM-DD}_{safeTitle}". Captured once at recording
// start so re-exports during the same session stay consistent even if the
// page's title changes mid-thread.
export function buildSessionSlug(title: string, startedAt: Date | null): string {
    const date = localDate(startedAt ?? new Date());
    return `${date}_${safeFilename(title)}`;
}

// Resolve the base filename for an export. If the user enabled the filename
// prefix and the recorder set a sessionSlug, that slug becomes the base —
// otherwise fall back to the topic title alone (legacy behaviour).
export function exportBaseName(): string {
    const meta = currentMeta();
    if (Store.get('filenamePrefix') && Store.state.sessionSlug) {
        return Store.state.sessionSlug;
    }
    return safeFilename(meta.title);
}

export function formatHMS(ms: number): string {
    if (!ms || ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number): string => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function fmtElapsed(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function currentMeta(): TopicMeta {
    return Store.state.topicMeta ?? getTopicMeta();
}

function sortedPosts(): PostData[] {
    return Array.from(Store.state.posts.values()).sort(
        (a, b) => a.postNumber - b.postNumber
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Per-post rendering — shared by the flat MD export, the per-shard MDs,
// and the shard-plan line counter.
// ──────────────────────────────────────────────────────────────────────────

interface RenderPostOpts {
    localImagePaths?: Map<string, string>;
}

// Render ONE post to markdown. Always ends with a single trailing "\n" so
// concatenations stay well-formed.
function renderPostMd(p: PostData, opts: RenderPostOpts): string {
    const renderImage = (u: string): string => {
        const local = opts.localImagePaths?.get(u);
        return local ? `![](${local})` : `![](${u})`;
    };

    const lines: string[] = [];
    lines.push(
        `## #${p.postNumber} · @${p.username || '(未知)'}${p.fullName ? ` (${p.fullName})` : ''}`
    );
    const subParts: string[] = [];
    if (p.postedAt) subParts.push(`*${p.postedAt}*`);
    if (p.permalink) subParts.push(`[永久链接](${p.permalink})`);
    if (subParts.length) lines.push(subParts.join(' — '));
    lines.push('');
    lines.push(p.text || '*(空内容)*');
    if (p.images.length > 0) {
        lines.push('');
        if (opts.localImagePaths) {
            lines.push('**附图:**');
            lines.push('');
            for (const u of p.images) lines.push(renderImage(u));
        } else {
            lines.push('**附图链接:**');
            for (const u of p.images) lines.push(`- ${u}`);
        }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    return lines.join('\n');
}

// Number of lines a rendered string would occupy when concatenated into a
// file. Matches `cat -n` line counts: empty → 0, trailing "\n" doesn't add
// a phantom line.
function countLines(s: string): number {
    if (s.length === 0) return 0;
    let n = 0;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
    if (s.charCodeAt(s.length - 1) !== 10) n++;
    return n;
}

interface RenderedPost {
    post: PostData;
    md: string;
    lineCount: number;
}

function renderAllPosts(
    posts: PostData[],
    localImagePaths?: Map<string, string>
): RenderedPost[] {
    return posts.map((p) => {
        const md = renderPostMd(p, { localImagePaths });
        return { post: p, md, lineCount: countLines(md) };
    });
}

// ──────────────────────────────────────────────────────────────────────────
// Flat MD + JSON export (legacy behaviour)
// ──────────────────────────────────────────────────────────────────────────

export function buildMarkdown(localImagePaths?: Map<string, string>): string {
    const meta = currentMeta();
    const lines: string[] = [];
    lines.push(`# ${meta.title || document.title}`);
    lines.push('');
    if (meta.url) lines.push(`- 链接: ${meta.url}`);
    if (meta.category) lines.push(`- 分类: ${meta.category}`);
    if (meta.tags.length) lines.push(`- 标签: ${meta.tags.join(', ')}`);
    if (Store.state.startedAt) {
        lines.push(`- 记录开始: ${Store.state.startedAt.toISOString()}`);
    }
    lines.push(`- 导出时间: ${new Date().toISOString()}`);
    lines.push(`- 时长: ${fmtElapsed(Store.elapsedMs())}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    if (Store.state.mode === 'discourse' || Store.state.posts.size > 0) {
        const ordered = sortedPosts();
        for (const p of ordered) {
            lines.push(renderPostMd(p, { localImagePaths }));
        }
    } else {
        const renderImage = (u: string): string => {
            const local = localImagePaths?.get(u);
            return local ? `![](${local})` : `![](${u})`;
        };
        for (const c of Store.state.genericChunks) {
            lines.push(`> [${c.tag}] ${c.ts}`);
            lines.push('');
            lines.push(c.text);
            for (const u of c.images) lines.push(renderImage(u));
            lines.push('');
        }
    }

    return lines.join('\n');
}

export function buildJSON(): string {
    const meta = currentMeta();
    const payload: Record<string, unknown> = {
        kind: Store.state.mode,
        recorder: `discourse-text-recorder@${VERSION}`,
        startedAt: Store.state.startedAt?.toISOString() ?? null,
        exportedAt: new Date().toISOString(),
        elapsedMs: Store.elapsedMs(),
        page: {
            title: meta.title || document.title,
            url: meta.url || location.href,
            category: meta.category,
            tags: meta.tags,
        },
    };
    if (Store.state.mode === 'discourse' || Store.state.posts.size > 0) {
        payload.posts = sortedPosts();
    } else {
        payload.chunks = Store.state.genericChunks.slice();
    }
    return JSON.stringify(payload, null, 2);
}

// ──────────────────────────────────────────────────────────────────────────
// Sharded export — index, by-user, posts.jsonl, per-range MD shards.
// ──────────────────────────────────────────────────────────────────────────

// Lines the shard's own "# Posts #X – #Y\n\n" header takes. Used both when
// planning (so the cap accounts for the header) and when materialising
// (so postLocations point at the right line).
const SHARD_HEADER_LINES = 2;

function clampCap(n: number): number {
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_SHARD_CAP_LINES;
    return Math.max(
        MIN_SHARD_CAP_LINES,
        Math.min(MAX_SHARD_CAP_LINES, Math.floor(n))
    );
}

function pad4(n: number): string {
    return String(n).padStart(4, '0');
}

function shardName(firstPost: number, lastPost: number): string {
    return firstPost === lastPost
        ? `p${pad4(firstPost)}`
        : `p${pad4(firstPost)}-${pad4(lastPost)}`;
}

// Greedy bin-pack. Posts are atomic — a single post that exceeds capLines
// gets its own shard (marked oversize). Posts arrive in ascending postNumber
// order so shards are always contiguous ranges.
export function planShards(rendered: RenderedPost[], capLines: number): ShardPlan {
    const shards: ShardEntry[] = [];
    const postLocations = new Map<
        number,
        { shardName: string; shardPath: string; line: number }
    >();

    interface Bucket {
        posts: RenderedPost[];
        lines: number;
        users: Set<string>;
        images: number;
        firstPost: number;
        lastPost: number;
    }
    let cur: Bucket | null = null;

    const flush = (): void => {
        if (!cur || cur.posts.length === 0) return;
        const name = shardName(cur.firstPost, cur.lastPost);
        const path = `posts/${name}.md`;
        const oversize = cur.posts.length === 1 && cur.lines > capLines;
        let lineCursor = SHARD_HEADER_LINES + 1;
        for (const rp of cur.posts) {
            postLocations.set(rp.post.postNumber, {
                shardName: name,
                shardPath: path,
                line: lineCursor,
            });
            lineCursor += rp.lineCount;
        }
        shards.push({
            name,
            path,
            firstPost: cur.firstPost,
            lastPost: cur.lastPost,
            postCount: cur.posts.length,
            lineCount: cur.lines,
            userCount: cur.users.size,
            imageCount: cur.images,
            oversize,
        });
        cur = null;
    };

    for (const rp of rendered) {
        const u = rp.post.username || '(unknown)';
        const imgs = rp.post.images?.length ?? 0;
        if (!cur) {
            cur = {
                posts: [rp],
                lines: SHARD_HEADER_LINES + rp.lineCount,
                users: new Set([u]),
                images: imgs,
                firstPost: rp.post.postNumber,
                lastPost: rp.post.postNumber,
            };
            continue;
        }
        if (cur.lines + rp.lineCount <= capLines) {
            cur.posts.push(rp);
            cur.lines += rp.lineCount;
            cur.users.add(u);
            cur.images += imgs;
            cur.lastPost = rp.post.postNumber;
        } else {
            flush();
            cur = {
                posts: [rp],
                lines: SHARD_HEADER_LINES + rp.lineCount,
                users: new Set([u]),
                images: imgs,
                firstPost: rp.post.postNumber,
                lastPost: rp.post.postNumber,
            };
        }
    }
    flush();

    const allUsers = new Set<string>();
    let totalChars = 0;
    let totalImages = 0;
    let totalLines = 0;
    let oversizeShards = 0;
    for (const s of shards) {
        totalLines += s.lineCount;
        if (s.oversize) oversizeShards++;
    }
    for (const rp of rendered) {
        allUsers.add(rp.post.username || '(unknown)');
        totalChars += rp.post.text?.length ?? 0;
        totalImages += rp.post.images?.length ?? 0;
    }

    return {
        capLines,
        shards,
        postLocations,
        totals: {
            posts: rendered.length,
            users: allUsers.size,
            images: totalImages,
            chars: totalChars,
            lines: totalLines,
            shards: shards.length,
            oversizeShards,
        },
    };
}

function buildShardMd(shard: ShardEntry, rendered: RenderedPost[]): string {
    const title =
        shard.firstPost === shard.lastPost
            ? `# Post #${shard.firstPost}`
            : `# Posts #${shard.firstPost} – #${shard.lastPost}`;
    let out = `${title}\n\n`;
    for (const rp of rendered) {
        if (
            rp.post.postNumber >= shard.firstPost &&
            rp.post.postNumber <= shard.lastPost
        ) {
            out += rp.md;
        }
    }
    return out;
}

function escapeMdCell(s: string): string {
    return s.replace(/\|/g, '\\|');
}

function buildIndexMd(
    plan: ShardPlan,
    posts: PostData[],
    rendered: RenderedPost[]
): string {
    const t = plan.totals;
    const lines: string[] = [];
    lines.push(`# Index — ${t.posts} 楼 · ${t.users} 用户 · ${t.images} 图`);
    lines.push('');
    lines.push(
        '> 元数据索引，无内容片段。AI 应通过"位置"列打开对应 shard 读取完整内容。'
    );
    lines.push('');
    lines.push('| 楼 | 用户 | 位置 | 字符 | 行 | 图 | 赞 |');
    lines.push('|---|---|---|---|---|---|---|');

    const byNum = new Map<number, RenderedPost>();
    for (const rp of rendered) byNum.set(rp.post.postNumber, rp);

    for (const p of posts) {
        const loc = plan.postLocations.get(p.postNumber);
        if (!loc) continue;
        const rp = byNum.get(p.postNumber);
        const lc = rp ? rp.lineCount : 0;
        const chars = p.text?.length ?? 0;
        const imgs = p.images?.length ?? 0;
        const likes = p.likes ?? 0;
        const user = p.username || '(unknown)';
        lines.push(
            `| #${p.postNumber} | @${escapeMdCell(user)} | ${loc.shardPath}:${loc.line} | ${chars} | ${lc} | ${imgs} | ${likes} |`
        );
    }
    lines.push('');
    return lines.join('\n');
}

function buildByUserMd(plan: ShardPlan, posts: PostData[]): string {
    const byUser = new Map<string, PostData[]>();
    for (const p of posts) {
        const u = p.username || '(unknown)';
        let bucket = byUser.get(u);
        if (!bucket) {
            bucket = [];
            byUser.set(u, bucket);
        }
        bucket.push(p);
    }
    const sortedUsers = Array.from(byUser.entries()).sort(
        (a, b) => b[1].length - a[1].length
    );

    const lines: string[] = [];
    lines.push(`# By User — ${sortedUsers.length} 用户`);
    lines.push('');
    lines.push('> 用户索引，纯位置，无内容片段。');
    lines.push('');

    for (const [user, userPosts] of sortedUsers) {
        lines.push(`## @${user} (${userPosts.length} 楼)`);
        const byShard = new Map<string, Array<{ n: number; line: number }>>();
        for (const p of userPosts) {
            const loc = plan.postLocations.get(p.postNumber);
            if (!loc) continue;
            let arr = byShard.get(loc.shardPath);
            if (!arr) {
                arr = [];
                byShard.set(loc.shardPath, arr);
            }
            arr.push({ n: p.postNumber, line: loc.line });
        }
        for (const [shardPath, entries] of byShard) {
            const refs = entries.map((e) => `#${e.n}:${e.line}`).join(', ');
            lines.push(`- ${shardPath}: ${refs}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}

function buildJsonl(posts: PostData[]): string {
    if (posts.length === 0) return '';
    return posts.map((p) => JSON.stringify(p)).join('\n') + '\n';
}

function formatThousand(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / 1_000_000).toFixed(2)}M`;
}

function buildReadmeMd(
    meta: TopicMeta,
    plan: ShardPlan,
    downloaded: DownloadedImage[],
    urls: string[],
    startedAt: Date | null,
    elapsedMs: number
): string {
    const t = plan.totals;
    const lines: string[] = [];
    lines.push(`# ${meta.title || '(untitled)'}`);
    lines.push('');
    if (meta.url) lines.push(`- 链接: ${meta.url}`);
    if (meta.category) lines.push(`- 分类: ${meta.category}`);
    if (meta.tags?.length) lines.push(`- 标签: ${meta.tags.join(', ')}`);
    if (startedAt) lines.push(`- 记录开始: ${startedAt.toISOString()}`);
    lines.push(`- 导出时间: ${new Date().toISOString()}`);
    lines.push(`- 时长: ${fmtElapsed(elapsedMs)}`);
    lines.push(`- 导出工具: discourse-text-recorder v${VERSION}`);
    lines.push('');

    lines.push('## 统计');
    lines.push('');
    lines.push(`- 楼数: ${t.posts}`);
    lines.push(`- 用户: ${t.users}`);
    if (urls.length > 0) {
        const failed = urls.length - downloaded.length;
        lines.push(
            `- 图片: ${t.images}（下载成功 ${downloaded.length} / 失败 ${failed}）`
        );
    } else {
        lines.push(`- 图片: ${t.images}（仅链接，未下载）`);
    }
    lines.push(`- 字符: ~${formatThousand(t.chars)}`);
    lines.push(`- 行数: ~${formatThousand(t.lines)}`);
    lines.push('');

    lines.push(`## 分片（上限 ${plan.capLines} 行/片）`);
    lines.push('');
    lines.push('| shard | posts | lines | users | imgs | flag |');
    lines.push('|---|---|---|---|---|---|');
    for (const s of plan.shards) {
        const flag = s.oversize ? '⚠ oversize' : '';
        lines.push(
            `| ${s.path} | ${s.postCount} | ${s.lineCount} | ${s.userCount} | ${s.imageCount} | ${flag} |`
        );
    }
    lines.push('');
    if (t.oversizeShards > 0) {
        lines.push(
            `⚠ ${t.oversizeShards} 片为单楼超长（>${plan.capLines} 行）独占，AI Read 时需要分页。`
        );
        lines.push('');
    }

    lines.push('## 文件清单');
    lines.push('');
    lines.push('- [index.md](index.md) — 主索引（按楼号，只含结构元数据）');
    lines.push('- [by-user.md](by-user.md) — 按用户索引（楼号 → 位置）');
    lines.push(
        '- [posts.jsonl](posts.jsonl) — 一楼一行 JSON，适合 `Read offset=N` 寻址'
    );
    lines.push(`- posts/ — ${plan.shards.length} 个分片 Markdown`);
    if (downloaded.length > 0) {
        lines.push(`- images/ — ${downloaded.length} 张已下载图片`);
    }
    lines.push('');

    lines.push('## 给 AI 的导航建议');
    lines.push('');
    lines.push(
        '1. 先读 `index.md` 了解全貌（每行：楼号 · 用户 · 位置 · 字符 · 行 · 图 · 赞）'
    );
    lines.push('2. 找特定用户用 `by-user.md`，grep `@username`');
    lines.push(
        '3. 找特定楼号或关键词，用 `posts.jsonl`（每行一楼）或对应 `posts/p####-####.md` 分片'
    );
    lines.push(
        '4. **不要把 index.md / by-user.md 当成内容来源** —— 里面没有内容片段，只有定位元数据。'
    );
    lines.push('');

    return lines.join('\n');
}

// Live preview of the shard plan, used by the dock to show "📦 N shards"
// during recording. Cached by (lastCapturedAt, capLines) so rapid UI
// refreshes don't re-render 2000+ posts each tick.
let _previewCache: {
    lastCapturedAt: number | null;
    capLines: number;
    postsSize: number;
    plan: ShardPlan;
} | null = null;

export function previewShardPlan(): ShardPlan | null {
    const postsSize = Store.state.posts.size;
    if (postsSize === 0) return null;
    const capLines = clampCap(Store.get('shardCap'));
    const lastCapturedAt = Store.state.lastCapturedAt?.getTime() ?? null;
    if (
        _previewCache &&
        _previewCache.lastCapturedAt === lastCapturedAt &&
        _previewCache.capLines === capLines &&
        _previewCache.postsSize === postsSize
    ) {
        return _previewCache.plan;
    }
    const posts = sortedPosts();
    const rendered = renderAllPosts(posts);
    const plan = planShards(rendered, capLines);
    _previewCache = { lastCapturedAt, capLines, postsSize, plan };
    return plan;
}

// ──────────────────────────────────────────────────────────────────────────
// Download plumbing
// ──────────────────────────────────────────────────────────────────────────

function download(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
    }, 1000);
}

function collectAllImageUrls(): string[] {
    const urls = new Set<string>();
    for (const p of Store.state.posts.values()) {
        for (const u of p.images) if (u) urls.add(u);
    }
    for (const c of Store.state.genericChunks) {
        for (const u of c.images) if (u) urls.add(u);
    }
    return Array.from(urls);
}

export function exportMarkdown(): void {
    download(buildMarkdown(), `${exportBaseName()}.md`, 'text/markdown');
}

export function exportJSON(): void {
    download(buildJSON(), `${exportBaseName()}.json`, 'application/json');
}

export function exportBoth(): void {
    exportMarkdown();
    setTimeout(exportJSON, 250);
}

export function copyMarkdown(): void {
    const md = buildMarkdown();
    if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(md, { type: 'text', mimetype: 'text/plain' });
    } else if (navigator.clipboard) {
        void navigator.clipboard.writeText(md);
    }
}

export function exportPreferred(): Promise<void> {
    const fmt = Store.get('exportFormat');
    if (fmt === 'md') {
        exportMarkdown();
        return Promise.resolve();
    }
    if (fmt === 'json') {
        exportJSON();
        return Promise.resolve();
    }
    if (fmt === 'zip') return exportZip();
    if (fmt === 'sharded') return exportSharded();
    exportBoth();
    return Promise.resolve();
}

// Bundle MD + JSON + downloaded images into a single ZIP. The markdown inside
// the zip uses local image paths (images/0001-foo.jpg) so the archive is
// self-contained when extracted.
export async function exportZip(): Promise<void> {
    const meta = currentMeta();
    const baseName = exportBaseName();
    const entries: ZipEntry[] = [];
    let downloaded: DownloadedImage[] = [];

    const urls = Store.get('downloadImages') ? collectAllImageUrls() : [];
    if (urls.length > 0) {
        Bus.emit('export:progress', {
            phase: 'downloading',
            done: 0,
            total: urls.length,
            failed: 0,
            message: `下载图片 0/${urls.length}`,
        });
        downloaded = await downloadAll(urls, (p) => {
            Bus.emit('export:progress', {
                phase: 'downloading',
                done: p.done,
                total: p.total,
                failed: p.failed,
                message: `下载图片 ${p.done}/${p.total}${p.failed ? ` (失败 ${p.failed})` : ''}`,
            });
        });
    }

    Bus.emit('export:progress', {
        phase: 'zipping',
        done: downloaded.length,
        total: urls.length,
        failed: urls.length - downloaded.length,
        message: '正在打包...',
    });

    const localPaths = new Map<string, string>();
    for (const img of downloaded) {
        localPaths.set(img.url, img.filename);
        entries.push({ path: `${baseName}/${img.filename}`, data: img.bytes });
    }

    const md = buildMarkdown(downloaded.length > 0 ? localPaths : undefined);
    const json = buildJSON();
    entries.push({
        path: `${baseName}/${baseName}.md`,
        data: utf8Encode(md),
    });
    entries.push({
        path: `${baseName}/${baseName}.json`,
        data: utf8Encode(json),
    });

    // README so the zip recipient sees context (download stats, source URL)
    // without opening the markdown or JSON.
    const readme =
        `# ${meta.title || '(untitled)'}\n\n` +
        `Source: ${meta.url || location.href}\n\n` +
        `Exported by Discourse Text Recorder v${VERSION} at ${new Date().toISOString()}.\n\n` +
        `- ${Store.state.posts.size} 个楼层 / ${Store.state.genericChunks.length} 个文本段\n` +
        `- 图片总数 ${urls.length}, 成功下载 ${downloaded.length}, 失败 ${urls.length - downloaded.length}\n`;
    entries.push({
        path: `${baseName}/README.txt`,
        data: utf8Encode(readme),
    });

    const blob = buildZip(entries);
    downloadBlob(blob, `${baseName}.zip`);

    Bus.emit('export:progress', {
        phase: 'done',
        done: downloaded.length,
        total: urls.length,
        failed: urls.length - downloaded.length,
        message: `导出完成: ${downloaded.length}/${urls.length} 张图片`,
    });
}

// Sharded ZIP — README.md / index.md / by-user.md / posts.jsonl /
// posts/p####-####.md / images/. Designed so an AI agent with a per-Read
// line cap can navigate a thousand-post thread without loading everything.
export async function exportSharded(): Promise<void> {
    const meta = currentMeta();
    const baseName = exportBaseName();
    const capLines = clampCap(Store.get('shardCap'));
    const entries: ZipEntry[] = [];
    let downloaded: DownloadedImage[] = [];

    const urls = Store.get('downloadImages') ? collectAllImageUrls() : [];
    if (urls.length > 0) {
        Bus.emit('export:progress', {
            phase: 'downloading',
            done: 0,
            total: urls.length,
            failed: 0,
            message: `下载图片 0/${urls.length}`,
        });
        downloaded = await downloadAll(urls, (p) => {
            Bus.emit('export:progress', {
                phase: 'downloading',
                done: p.done,
                total: p.total,
                failed: p.failed,
                message: `下载图片 ${p.done}/${p.total}${p.failed ? ` (失败 ${p.failed})` : ''}`,
            });
        });
    }

    Bus.emit('export:progress', {
        phase: 'zipping',
        done: downloaded.length,
        total: urls.length,
        failed: urls.length - downloaded.length,
        message: '正在分片打包...',
    });

    const localPaths = new Map<string, string>();
    for (const img of downloaded) {
        localPaths.set(img.url, img.filename);
        entries.push({ path: `${baseName}/${img.filename}`, data: img.bytes });
    }

    const posts = sortedPosts();
    const rendered = renderAllPosts(
        posts,
        downloaded.length > 0 ? localPaths : undefined
    );
    const plan = planShards(rendered, capLines);

    for (const shard of plan.shards) {
        entries.push({
            path: `${baseName}/${shard.path}`,
            data: utf8Encode(buildShardMd(shard, rendered)),
        });
    }

    entries.push({
        path: `${baseName}/index.md`,
        data: utf8Encode(buildIndexMd(plan, posts, rendered)),
    });
    entries.push({
        path: `${baseName}/by-user.md`,
        data: utf8Encode(buildByUserMd(plan, posts)),
    });
    entries.push({
        path: `${baseName}/posts.jsonl`,
        data: utf8Encode(buildJsonl(posts)),
    });
    entries.push({
        path: `${baseName}/README.md`,
        data: utf8Encode(
            buildReadmeMd(
                meta,
                plan,
                downloaded,
                urls,
                Store.state.startedAt,
                Store.elapsedMs()
            )
        ),
    });

    const blob = buildZip(entries);
    downloadBlob(blob, `${baseName}.zip`);

    Bus.emit('export:progress', {
        phase: 'done',
        done: downloaded.length,
        total: urls.length,
        failed: urls.length - downloaded.length,
        message: `分片导出完成: ${plan.shards.length} 片 / ${downloaded.length}/${urls.length} 图`,
    });
}

const _enc = new TextEncoder();
function utf8Encode(s: string): Uint8Array {
    return _enc.encode(s);
}
