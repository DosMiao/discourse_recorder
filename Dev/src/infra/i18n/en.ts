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
    btn_export_dom: 'Export DOM',
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
    fmt_sharded: 'Sharded (AI-friendly)',

    // ── Sharded format options ────────────────────────────────────
    section_shard: 'Sharding',
    label_shard_cap: 'Shard cap (lines)',
    desc_shard_cap:
        'Max lines per shard. Posts are atomic — a single oversized post becomes its own shard.',

    // ── Live shard preview (CaptureTab) ───────────────────────────
    shard_preview_label: 'Shards',
    shard_preview_shards: 'shards',
    shard_preview_oversize: 'oversize',

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
    toast_export_sharded: 'Building sharded ZIP',
    toast_export_sharded_done: 'Sharded ZIP ready',
    toast_export_dom: 'Downloading page HTML snapshot',
    toast_long_path_warn:
        'Long filename. Copying it into a deep destination may trigger "path too long" — keep the destination short, or enable Windows LongPathsEnabled.',
    toast_autoscroll_end: 'Auto-scroll finished: reached the bottom',
    toast_autoscroll_max: 'Auto-scroll: hit the max-iterations cap',
    toast_apicapture_started: 'API capture started',
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

    // ── Activity panel & tasks ────────────────────────────────────
    activity_panel_label: 'Tasks',
    activity_empty: 'No active tasks',
    activity_dismiss: 'Dismiss',
    activity_dismiss_all: 'Dismiss completed',

    task_status_pending: 'Pending',
    task_status_running: 'Running',
    task_status_succeeded: 'Done',
    task_status_failed: 'Failed',
    task_status_cancelled: 'Cancelled',

    task_title_export_zip: 'Export ZIP',
    task_title_export_sharded: 'Export sharded ZIP',
    task_title_apicapture: 'API capture',
    task_title_image_download: 'Image download',
    task_title_image_retry: 'Retry {n} images',

    task_stage_fetch_topic: 'Load topic',
    task_stage_fetch_batch: 'Fetch batch',
    task_stage_render: 'Render',
    task_stage_download: 'Download images',
    task_stage_pack: 'Pack archive',

    task_eta: 'ETA',
    task_throughput_posts: 'posts/s',
    task_throughput_images: 'imgs/s',
    task_throughput_files: 'files/s',
    task_throughput_items: 'items/s',
    task_failed_count: 'failed {n}',
    task_failures_summary: 'Show {n} failures',
    task_failures_more: '...and {n} more not shown',
    task_failure_unknown_error: 'Unknown error',
    task_retry: 'Retry {n}',
    task_cancel: 'Cancel',
    task_dismiss: 'Close',
    task_unit_posts: 'posts',
    task_unit_images: 'images',
    task_unit_files: 'files',
    task_unit_items: 'items',
};
