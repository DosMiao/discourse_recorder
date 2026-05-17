// Compile-time constants. NS prefixes every CSS class, custom property,
// and storage key — keeps the script's namespace from clashing with the
// host page's stylesheet.

export const NS = 'dtr';
export const VERSION = '3.0.0';

export const THEME_CLASS = `${NS}-theme-dark`;
export const STYLE_ID = `${NS}-styles`;
export const ROOT_ID = `${NS}-root`;
export const THEME_TRANSITIONING_CLASS = `${NS}-theme-transitioning`;
export const THEME_TRANSITION_MS = 320;

export const STORAGE_KEYS = {
    theme: `${NS}.theme`,
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
} as const;

// Z-index reservations. Userscript overlays sit above virtually anything
// the host page draws; toasts are highest so they always win over the modal.
export const Z = {
    dock: 2147483600,
    modal: 2147483640,
    toast: 2147483650,
} as const;
