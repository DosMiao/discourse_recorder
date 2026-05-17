// Compile-time script configuration. The single source of truth for things
// that other modules used to import piecemeal from core/constants:
//   - namespace (NS) → prefixes all CSS classes, custom properties, storage keys
//   - version + build date → surfaced in the About tab and the userscript header
//   - z-index reservations → ensure overlays beat virtually anything on the host page
//
// Anything purely structural that doesn't change between builds belongs here.
// Anything that varies per user/session belongs in the Store.

export const NS = 'dtr';
export const VERSION = '4.0.0';
// __BUILD_DATE__ is injected by webpack.DefinePlugin. Falls back to '' in test
// environments where the define isn't applied.
export const BUILD_DATE: string =
    typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '';

export const ROOT_ID = `${NS}-root`;
export const STYLE_ID = `${NS}-styles`;
export const PAGE_STYLE_ID = `${NS}-page-dark`;

export const THEME_CLASS = `${NS}-theme-dark`;
export const THEME_TRANSITIONING_CLASS = `${NS}-theme-transitioning`;
export const THEME_TRANSITION_MS = 320;

// Tab identifiers — used by the dock to switch between Capture / Export /
// Settings. Kept as a const tuple so the type is the literal union.
export const TAB_IDS = ['capture', 'export', 'settings'] as const;
export type TabId = (typeof TAB_IDS)[number];

// Userscript-overlay z-index family. Toast above modal, modal above dock,
// dock above the host page. The numbers are intentionally near the int32 max
// because Discourse themes occasionally push their own large z-indexes.
export const Z = {
    dock: 2147483600,
    modal: 2147483640,
    toast: 2147483650,
} as const;

// All keys we write to GM_setValue / localStorage. Centralised so a future
// "reset all preferences" UI can iterate Object.values(STORAGE_KEYS).
export const STORAGE_KEYS = {
    theme: `${NS}.theme`,
    locale: `${NS}.locale`,
    activeTab: `${NS}.activeTab`,
    dockPos: `${NS}.dock.position`,
    dockMin: `${NS}.dock.minimized`,
    autoStart: `${NS}.autoStart`,
    autoScroll: `${NS}.autoScroll`,
    captureImages: `${NS}.captureImages`,
    downloadImages: `${NS}.downloadImages`,
    exportFormat: `${NS}.exportFormat`,
    captureStrategy: `${NS}.captureStrategy`,
    autoSaveOnComplete: `${NS}.autoSaveOnComplete`,
    filenamePrefix: `${NS}.filenamePrefix`,
    shardCap: `${NS}.shardCap`,
} as const;

// Default cap for the sharded export (one shard ≤ this many rendered lines).
// 1800 leaves ~200 lines of headroom below Claude Code's default Read limit
// of 2000 lines, so an AI tool can pull an entire shard in one call.
export const DEFAULT_SHARD_CAP_LINES = 1800;
// Hard bounds for the cap input. Below ~400 you get an absurd number of tiny
// shards; above 2000 you defeat the whole point.
export const MIN_SHARD_CAP_LINES = 400;
export const MAX_SHARD_CAP_LINES = 2000;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const SCRIPT_CONFIG = {
    NS,
    VERSION,
    BUILD_DATE,
    ROOT_ID,
    STYLE_ID,
    PAGE_STYLE_ID,
    THEME_CLASS,
    THEME_TRANSITIONING_CLASS,
    THEME_TRANSITION_MS,
    TAB_IDS,
    Z,
    STORAGE_KEYS,
} as const;

export type ScriptConfig = typeof SCRIPT_CONFIG;
