// Ambient declarations for Greasemonkey / Tampermonkey / Violentmonkey APIs.
// Only the `@grant`s we actually request are declared. Each is `unknown`-ish
// to force runtime feature-detection — callers must guard with `typeof X ===
// 'function'`, mirroring how a userscript runs across multiple managers.

declare function GM_setValue<T>(key: string, value: T): void;
declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
declare function GM_deleteValue(key: string): void;
declare function GM_setClipboard(
    text: string,
    options?: string | { type?: string; mimetype?: string }
): void;
declare function GM_addStyle(css: string): HTMLStyleElement;

// GM_xmlhttpRequest — needed for cross-origin image downloads (Discourse
// CDNs typically don't send permissive CORS headers, so plain fetch() fails).
interface GMXHRResponse {
    readonly status: number;
    readonly statusText: string;
    readonly response: ArrayBuffer | Blob | string | null;
    readonly responseHeaders: string;
    readonly finalUrl?: string;
}
interface GMXHRDetails {
    url: string;
    method?: 'GET' | 'POST' | 'HEAD';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    timeout?: number;
    headers?: Record<string, string>;
    onload?: (r: GMXHRResponse) => void;
    onerror?: (r: GMXHRResponse) => void;
    ontimeout?: (r: GMXHRResponse) => void;
    onabort?: (r: GMXHRResponse) => void;
}
interface GMXHRHandle {
    abort: () => void;
}
declare function GM_xmlhttpRequest(details: GMXHRDetails): GMXHRHandle;

// Webpack DefinePlugin injection
declare const __BUILD_DATE__: string;
