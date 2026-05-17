// English strings. Must contain every key from zh.ts — TypeScript enforces
// this via the StringKey type derived from the Chinese catalog.

import type { StringKey } from './zh';

export const EN_STRINGS: Record<StringKey, string> = {
    // ── Dock chrome ───────────────────────────────────────────────
    dock_title: 'Forum Recorder',
    dock_minimize: 'Minimize',
    dock_expand: 'Expand',
    dock_settings: 'Settings',

    // ── Tabs ──────────────────────────────────────────────────────
    tab_capture: 'Capture',
    tab_export: 'Export',
    tab_settings: 'Settings',

    // ── Status labels ─────────────────────────────────────────────
    status_idle: 'Idle',
    status_recording: 'Recording',
    status_paused: 'Paused',
    status_stopped: 'Stopped',
    status_detecting: 'Detecting',

    // ── Mode badge ────────────────────────────────────────────────
    mode_discourse: 'Discourse',
    mode_generic: 'Generic',
    mode_detecting: 'Detecting',

    // ── Stat cell labels ──────────────────────────────────────────
    stat_posts: 'Posts',
    stat_images: 'Images',
    stat_elapsed: 'Time',

    // ── Action buttons ────────────────────────────────────────────
    btn_start: 'Start',
    btn_recording: 'Recording',
    btn_pause: 'Pause',
    btn_resume: 'Resume',
    btn_stop: 'Stop',
    btn_export: 'Export',
    btn_copy_md: 'Copy MD',
    btn_clear: 'Clear',
    btn_done: 'Done',
    btn_reset_prefs: 'Reset preferences',

    // ── Section titles ────────────────────────────────────────────
    section_theme: 'Appearance',
    section_format: 'Export format',
    section_capture: 'Capture options',
    section_capture_strategy: 'Capture strategy',
    section_export_advanced: 'Export options',
    section_about: 'About',

    // ── Theme picker ──────────────────────────────────────────────
    theme_light: 'Light',
    theme_dark: 'Dark',
    theme_system: 'System',

    // ── Export format picker ──────────────────────────────────────
    fmt_zip: 'ZIP (with images)',
    fmt_both: 'MD + JSON',
    fmt_md: 'MD only',
    fmt_json: 'JSON only',

    // ── Capture strategy picker ───────────────────────────────────
    strategy_scroll: 'Scroll capture',
    strategy_scroll_desc: 'Generic mode; records as you scroll. Works on any forum.',
    strategy_api: 'API capture',
    strategy_api_desc: 'Discourse only; hits the JSON endpoint directly. ~50× faster.',

    // ── Toggle labels & descriptions ──────────────────────────────
    toggle_capture_images: 'Record image URLs',
    toggle_capture_images_desc: 'Capture original image links from each post (off = text only).',
    toggle_download_images: 'Download images in ZIP',
    toggle_download_images_desc: 'Pack image files inside the .zip (off = links only).',
    toggle_auto_scroll: 'Auto-scroll',
    toggle_auto_scroll_desc: 'Scroll the page automatically after Start, until no new posts appear.',
    toggle_auto_start: 'Auto-start on topic open',
    toggle_auto_start_desc: 'Begin recording the moment a Discourse topic page loads.',
    toggle_auto_save: 'Auto-export when capture completes',
    toggle_auto_save_desc: 'Save in the current format once the capture pass finishes.',
    toggle_filename_prefix: 'Date-prefix export filenames',
    toggle_filename_prefix_desc: 'Filename: {YYYY-MM-DD}_{title}.{ext}',

    // ── About card ────────────────────────────────────────────────
    about_blurb:
        'Liquid-glass recorder for Discourse-style forums. Captures post text and image URLs, exports to Markdown, JSON, or a ZIP bundle.',
    about_privacy: 'Stays local. No data is sent to any server.',
    about_version: 'Version',
    about_build: 'Build',
    about_shortcuts: 'Keyboard shortcuts',
    about_shortcut_record: 'Alt+Shift+R · Start / stop recording',
    about_shortcut_theme: 'Alt+Shift+T · Cycle theme',

    // ── Toast messages ────────────────────────────────────────────
    toast_started_discourse: 'Recording started (Discourse mode)',
    toast_started_generic: 'Recording started (generic mode)',
    toast_paused: 'Paused',
    toast_resumed: 'Resumed',
    toast_stopped: 'Stopped',
    toast_cleared: 'Cleared',
    toast_clear_confirm: 'Clear all recorded content?',
    toast_copied_md: 'Markdown copied to clipboard',
    toast_zip_start: 'Building ZIP',
    toast_zip_with_images: '(with images)',
    toast_zip_without_images: '(metadata only)',
    toast_zip_done: 'ZIP ready',
    toast_zip_failed: 'ZIP failed',
    toast_export_md: 'Downloading Markdown',
    toast_export_json: 'Downloading JSON',
    toast_export_both: 'Downloading MD + JSON',
    toast_autoscroll_end: 'Auto-scroll finished: reached the bottom',
    toast_autoscroll_max: 'Auto-scroll: hit the max-iterations cap',
    toast_apicapture_started: 'API capture started',
    toast_apicapture_progress: 'API capture',
    toast_apicapture_done: 'API capture finished',
    toast_apicapture_error: 'API capture failed',
    toast_theme_changed: 'Theme',
    toast_locale_changed: 'Language',
    toast_prefs_reset: 'Preferences reset — reload the page to apply',

    // ── Locale picker ─────────────────────────────────────────────
    section_locale: 'Language',
    locale_zh: '中文',
    locale_en: 'English',
    locale_system: 'System',
};
