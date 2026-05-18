// Cross-origin image fetcher. Discourse CDNs (e.g. uscardforum's S3) generally
// don't send Access-Control-Allow-Origin, so plain fetch() fails. We prefer
// GM_xmlhttpRequest (which Tampermonkey exempts from CORS) and fall back to
// fetch only if the userscript manager doesn't expose it.
//
// Concurrency is capped to a small number of in-flight requests so we don't
// hammer the CDN — long threads can easily have hundreds of images.
//
// Cancellation: pass `signal` in DownloadAllOptions. Already-in-flight
// requests are aborted via GMXHRHandle.abort() / fetch's AbortSignal; the
// worker loop bails before pulling the next URL when the signal fires.

const MAX_CONCURRENT = 4;
const TIMEOUT_MS = 30_000;

export interface DownloadedImage {
    url: string;
    filename: string; // relative path inside the zip (e.g. "images/0001-name.jpg")
    bytes: Uint8Array;
    mimeType: string;
}

export interface DownloadProgress {
    done: number;
    total: number;
    failed: number;
    currentUrl?: string;
}

export interface ItemDoneInfo {
    url: string;
    ok: boolean;
    error?: string;
}

export interface DownloadAllOptions {
    onProgress?: (p: DownloadProgress) => void;
    onItemDone?: (info: ItemDoneInfo) => void;
    signal?: AbortSignal;
}

// Heuristic extension picker — prefer the URL path's extension, fall back to
// the Content-Type, then default to .bin so the file is still usable.
function pickExtension(url: string, mime: string): string {
    try {
        const pathname = new URL(url).pathname;
        const m = pathname.match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
        if (m && m[1]) {
            const ext = m[1].toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) {
                return ext === 'jpeg' ? 'jpg' : ext;
            }
        }
    } catch {
        /* fall through */
    }
    const lower = (mime || '').toLowerCase();
    if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
    if (lower.includes('png')) return 'png';
    if (lower.includes('gif')) return 'gif';
    if (lower.includes('webp')) return 'webp';
    if (lower.includes('svg')) return 'svg';
    if (lower.includes('avif')) return 'avif';
    return 'bin';
}

function sanitizeBasename(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const last = pathname.split('/').filter(Boolean).pop() ?? '';
        return last.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) ||
            'image';
    } catch {
        return 'image';
    }
}

function parseMimeFromHeaders(headers: string): string {
    const m = headers.match(/^content-type:\s*([^\r\n;]+)/im);
    return m && m[1] ? m[1].trim() : '';
}

function fetchViaGM(
    url: string,
    signal?: AbortSignal
): Promise<{ bytes: Uint8Array; mime: string }> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('aborted'));
            return;
        }
        let handle: GMXHRHandle | null = null;
        let settled = false;
        const onAbort = (): void => {
            if (settled) return;
            settled = true;
            handle?.abort();
            reject(new Error('aborted'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        const cleanup = (): void => {
            settled = true;
            signal?.removeEventListener('abort', onAbort);
        };
        try {
            handle = GM_xmlhttpRequest({
                url,
                method: 'GET',
                responseType: 'arraybuffer',
                timeout: TIMEOUT_MS,
                onload: (r) => {
                    if (settled) return;
                    cleanup();
                    if (r.status >= 200 && r.status < 300 && r.response) {
                        const buf = r.response as ArrayBuffer;
                        resolve({
                            bytes: new Uint8Array(buf),
                            mime: parseMimeFromHeaders(r.responseHeaders || ''),
                        });
                    } else {
                        reject(new Error(`HTTP ${r.status} ${r.statusText}`));
                    }
                },
                onerror: () => {
                    if (settled) return;
                    cleanup();
                    reject(new Error('network error'));
                },
                ontimeout: () => {
                    if (settled) return;
                    cleanup();
                    reject(new Error('timeout'));
                },
                onabort: () => {
                    if (settled) return;
                    cleanup();
                    reject(new Error('aborted'));
                },
            });
        } catch (err) {
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

async function fetchViaFetch(
    url: string,
    signal?: AbortSignal
): Promise<{ bytes: Uint8Array; mime: string }> {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return {
        bytes: new Uint8Array(buf),
        mime: res.headers.get('content-type') ?? '',
    };
}

async function downloadOne(
    url: string,
    index: number,
    signal?: AbortSignal
): Promise<{ ok: true; image: DownloadedImage } | { ok: false; error: string }> {
    let result: { bytes: Uint8Array; mime: string };
    try {
        result =
            typeof GM_xmlhttpRequest === 'function'
                ? await fetchViaGM(url, signal)
                : await fetchViaFetch(url, signal);
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    const ext = pickExtension(url, result.mime);
    const base = sanitizeBasename(url);
    const seq = String(index + 1).padStart(4, '0');
    return {
        ok: true,
        image: {
            url,
            filename: `images/${seq}-${base}.${ext}`,
            bytes: result.bytes,
            mimeType: result.mime || `image/${ext}`,
        },
    };
}

function normalizeOptions(
    optsOrFn: DownloadAllOptions | ((p: DownloadProgress) => void) | undefined
): DownloadAllOptions {
    if (!optsOrFn) return {};
    if (typeof optsOrFn === 'function') return { onProgress: optsOrFn };
    return optsOrFn;
}

export async function downloadAll(
    urls: string[],
    optsOrFn?: DownloadAllOptions | ((p: DownloadProgress) => void)
): Promise<DownloadedImage[]> {
    const opts = normalizeOptions(optsOrFn);
    const { onProgress, onItemDone, signal } = opts;
    const unique = Array.from(new Set(urls.filter(Boolean)));
    const total = unique.length;
    if (total === 0) return [];

    const results: DownloadedImage[] = [];
    let cursor = 0;
    let done = 0;
    let failed = 0;

    async function worker(): Promise<void> {
        while (cursor < total) {
            if (signal?.aborted) return;
            const idx = cursor++;
            const url = unique[idx]!;
            onProgress?.({ done, total, failed, currentUrl: url });
            const item = await downloadOne(url, idx, signal);
            if (item.ok) {
                results.push(item.image);
                onItemDone?.({ url, ok: true });
            } else {
                failed++;
                onItemDone?.({ url, ok: false, error: item.error });
            }
            done++;
            onProgress?.({ done, total, failed });
        }
    }

    const workers: Promise<void>[] = [];
    const n = Math.min(MAX_CONCURRENT, total);
    for (let i = 0; i < n; i++) workers.push(worker());
    await Promise.all(workers);

    // Preserve original ordering — workers complete out of order, but the
    // zip layout looks neater if images line up with their URL index.
    results.sort((a, b) => a.filename.localeCompare(b.filename));
    return results;
}
