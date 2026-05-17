// Output builders + downloaders. The Markdown export is structured as a
// human-readable transcript (one ## per post with metadata + body + image
// links); the JSON export preserves the same data as machine-readable
// structured records for downstream processing.

import { VERSION } from '../core/constants';
import { Store } from '../core/store';
import { Bus } from '../core/eventBus';
import { getTopicMeta } from '../extractor/discourse';
import { downloadAll, type DownloadedImage } from './imageDownload';
import { buildZip, type ZipEntry } from './zip';
import type { TopicMeta } from '../core/types';

function safeFilename(name: string): string {
    return (
        (name || 'recording').replace(/[\\/:*?"<>|\r\n\t]+/g, '_').slice(0, 120).trim() ||
        'recording'
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
function exportBaseName(): string {
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

    const renderImage = (u: string): string => {
        const local = localImagePaths?.get(u);
        return local ? `![](${local})` : `![](${u})`;
    };

    if (Store.state.mode === 'discourse' || Store.state.posts.size > 0) {
        const ordered = Array.from(Store.state.posts.values()).sort(
            (a, b) => a.postNumber - b.postNumber
        );
        for (const p of ordered) {
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
                if (localImagePaths) {
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
        }
    } else {
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
        payload.posts = Array.from(Store.state.posts.values()).sort(
            (a, b) => a.postNumber - b.postNumber
        );
    } else {
        payload.chunks = Store.state.genericChunks.slice();
    }
    return JSON.stringify(payload, null, 2);
}

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
        `- 图片总数 ${urls.length},成功下载 ${downloaded.length},失败 ${urls.length - downloaded.length}\n`;
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

const _enc = new TextEncoder();
function utf8Encode(s: string): Uint8Array {
    return _enc.encode(s);
}
