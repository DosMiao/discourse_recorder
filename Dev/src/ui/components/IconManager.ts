// Icon manager — Singleton SVG registry. Each icon is stored as a path/body
// definition; getIcon() renders the wrapping <svg> with the requested size
// and caches the result so repeated lookups don't re-stringify.
//
// All icons inherit currentColor from their parent, so they automatically
// follow the active theme without any per-icon dark variants.

export interface IconOptions {
    size?: number; // width and height in px (square)
    strokeWidth?: number;
    title?: string; // adds <title> for accessibility
}

// Icon definition: either a `fill` body (stamps with fill="currentColor") or
// a `stroke` body (uses stroke="currentColor" and the requested stroke width).
// `viewBox` defaults to '0 0 24 24' which fits the Feather set we use.
type IconDef =
    | { kind: 'fill'; body: string; viewBox?: string }
    | { kind: 'stroke'; body: string; viewBox?: string; strokeWidth?: number };

const ICONS: Record<string, IconDef> = {
    play: {
        kind: 'fill',
        body: '<path d="M8 5v14l11-7L8 5z"/>',
    },
    stop: {
        kind: 'fill',
        body: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    },
    pause: {
        kind: 'fill',
        body: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    },
    download: {
        kind: 'stroke',
        strokeWidth: 2.2,
        body: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/>',
    },
    copy: {
        kind: 'stroke',
        body: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    },
    trash: {
        kind: 'stroke',
        body: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    },
    settings: {
        kind: 'stroke',
        body: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    },
    minimize: {
        kind: 'stroke',
        strokeWidth: 2.4,
        body: '<line x1="5" y1="12" x2="19" y2="12"/>',
    },
    expand: {
        kind: 'stroke',
        strokeWidth: 2.4,
        body: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
    },
    close: {
        kind: 'stroke',
        strokeWidth: 2.4,
        body: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    },
    sun: {
        kind: 'stroke',
        body: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.5" y1="4.5" x2="6.5" y2="6.5"/><line x1="17.5" y1="17.5" x2="19.5" y2="19.5"/><line x1="4.5" y1="19.5" x2="6.5" y2="17.5"/><line x1="17.5" y1="6.5" x2="19.5" y2="4.5"/>',
    },
    moon: {
        kind: 'fill',
        body: '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>',
    },
    system: {
        kind: 'stroke',
        body: '<rect x="3" y="4" width="18" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    },
    check: {
        kind: 'stroke',
        strokeWidth: 3,
        body: '<polyline points="20 6 9 17 4 12"/>',
    },
    warn: {
        kind: 'stroke',
        strokeWidth: 3,
        body: '<line x1="12" y1="5" x2="12" y2="13"/><circle cx="12" cy="18" r="0.6" fill="currentColor"/>',
    },
    x: {
        kind: 'stroke',
        strokeWidth: 3,
        body: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    },
    info: {
        kind: 'stroke',
        strokeWidth: 3,
        body: '<line x1="12" y1="10" x2="12" y2="16"/><circle cx="12" cy="7" r="0.6" fill="currentColor"/>',
    },
    // Tab icons
    capture: {
        kind: 'stroke',
        body: '<circle cx="12" cy="12" r="3"/><path d="M3 9V7a2 2 0 0 1 2-2h2"/><path d="M21 9V7a2 2 0 0 0-2-2h-2"/><path d="M3 15v2a2 2 0 0 0 2 2h2"/><path d="M21 15v2a2 2 0 0 1-2 2h-2"/>',
    },
    export: {
        kind: 'stroke',
        body: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    },
    // Language / locale
    locale: {
        kind: 'stroke',
        body: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
    },
} as const;

export type IconName = keyof typeof ICONS;

const cache = new Map<string, string>();

function renderIcon(name: IconName, options: IconOptions = {}): string {
    const def = ICONS[name];
    if (!def) return '';
    const size = options.size ?? 14;
    const cacheKey = `${name}@${size}@${options.strokeWidth ?? ''}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const viewBox = def.viewBox ?? '0 0 24 24';
    let svg: string;
    if (def.kind === 'fill') {
        svg = `<svg viewBox="${viewBox}" width="${size}" height="${size}" fill="currentColor">${def.body}</svg>`;
    } else {
        const sw = options.strokeWidth ?? def.strokeWidth ?? 2;
        svg =
            `<svg viewBox="${viewBox}" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
            `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${def.body}</svg>`;
    }
    cache.set(cacheKey, svg);
    return svg;
}

export interface IconManager {
    has(name: string): name is IconName;
    get(name: IconName, options?: IconOptions): string;
    // Returns an inline-SVG string with width/height stripped so CSS controls
    // sizing — useful when an icon sits inside a button where the parent rule
    // already says `svg { width: 14px }`.
    flexible(name: IconName): string;
}

const flexibleCache = new Map<IconName, string>();

export const IconManager: IconManager = {
    has(name: string): name is IconName {
        return name in ICONS;
    },
    get(name, options) {
        return renderIcon(name, options);
    },
    flexible(name) {
        const cached = flexibleCache.get(name);
        if (cached) return cached;
        // Render without width/height; parent CSS sets the icon size.
        const def = ICONS[name];
        if (!def) return '';
        const viewBox = def.viewBox ?? '0 0 24 24';
        let svg: string;
        if (def.kind === 'fill') {
            svg = `<svg viewBox="${viewBox}" fill="currentColor">${def.body}</svg>`;
        } else {
            const sw = def.strokeWidth ?? 2;
            svg =
                `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" ` +
                `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${def.body}</svg>`;
        }
        flexibleCache.set(name, svg);
        return svg;
    },
};

// Back-compat alias for the old `Icons.foo` lookup pattern.
export const Icons: Record<IconName, string> = new Proxy(
    {} as Record<IconName, string>,
    {
        get(_target, prop: string) {
            if (IconManager.has(prop)) return IconManager.flexible(prop);
            return '';
        },
    }
);
