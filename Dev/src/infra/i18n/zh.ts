// Simplified-Chinese strings. Keys mirror the structure of the en.ts catalog;
// add/rename in lockstep so the TypeScript Strings type stays exhaustive.

export const ZH_STRINGS = {
    // ── Dock chrome ───────────────────────────────────────────────
    dock_title: '论坛文字记录器',
    dock_minimize: '最小化',
    dock_expand: '展开',
    dock_settings: '设置',

    // ── Tabs ──────────────────────────────────────────────────────
    tab_capture: '记录',
    tab_export: '导出',
    tab_settings: '设置',

    // ── Status labels (shown in the mode row) ─────────────────────
    status_idle: '空闲',
    status_recording: '正在记录',
    status_paused: '已暂停',
    status_stopped: '已停止',
    status_detecting: '检测中',

    // ── Mode badge ────────────────────────────────────────────────
    mode_discourse: 'Discourse',
    mode_generic: '通用',
    mode_detecting: '检测中',

    // ── Stat cell labels ──────────────────────────────────────────
    stat_posts: '楼层',
    stat_images: '图片',
    stat_elapsed: '时长',

    // ── Action buttons ────────────────────────────────────────────
    btn_start: '开始记录',
    btn_recording: '记录中',
    btn_pause: '暂停',
    btn_resume: '继续',
    btn_stop: '停止',
    btn_export: '导出',
    btn_copy_md: '复制 MD',
    btn_clear: '清空',
    btn_done: '完成',
    btn_reset_prefs: '清空所有偏好',

    // ── Section titles ────────────────────────────────────────────
    section_theme: '主题外观',
    section_format: '导出格式',
    section_capture: '记录选项',
    section_capture_strategy: '抓取策略',
    section_export_advanced: '导出选项',
    section_about: '关于',

    // ── Theme picker ──────────────────────────────────────────────
    theme_light: '浅色',
    theme_dark: '深色',
    theme_system: '系统',

    // ── Export format picker ──────────────────────────────────────
    fmt_zip: 'ZIP (含图片)',
    fmt_both: 'MD + JSON',
    fmt_md: '仅 MD',
    fmt_json: '仅 JSON',

    // ── Capture strategy picker ───────────────────────────────────
    strategy_scroll: '滚动抓取',
    strategy_scroll_desc: '通用模式;边滚动边记录,适合所有论坛',
    strategy_api: 'API 抓取',
    strategy_api_desc: '仅 Discourse;直接请求 JSON 接口,比滚动快约 50 倍',

    // ── Toggle labels & descriptions ──────────────────────────────
    toggle_capture_images: '记录图片 URL',
    toggle_capture_images_desc: '抓取楼层中图片的原图链接(关闭可只记文字)',
    toggle_download_images: '导出 ZIP 时下载图片',
    toggle_download_images_desc: '把图片文件一起打包进 zip(关闭则只保留链接)',
    toggle_auto_scroll: '自动滚动加载',
    toggle_auto_scroll_desc: '开始记录后自动向下滚动,直到没有新楼层为止',
    toggle_auto_start: '打开论坛时自动开始',
    toggle_auto_start_desc: '在 Discourse 主题页面打开时自动启动记录',
    toggle_auto_save: '抓取完成后自动导出',
    toggle_auto_save_desc: '抓取到底或 API 跑完后自动按当前格式保存一份',
    toggle_filename_prefix: '导出文件加日期前缀',
    toggle_filename_prefix_desc: '文件名格式: {YYYY-MM-DD}_{标题}.{后缀}',

    // ── About card ────────────────────────────────────────────────
    about_blurb: '液态玻璃风格的 Discourse 论坛记录器,记录文字与图片链接,导出 Markdown / JSON / ZIP。',
    about_privacy: '仅在本地保存记录,不向任何服务器上传数据。',
    about_version: '版本',
    about_build: '构建',
    about_shortcuts: '快捷键',
    about_shortcut_record: 'Alt+Shift+R · 开始 / 停止记录',
    about_shortcut_theme: 'Alt+Shift+T · 切换主题',

    // ── Toast messages ────────────────────────────────────────────
    toast_started_discourse: '开始记录 (Discourse 模式)',
    toast_started_generic: '开始记录 (通用模式)',
    toast_paused: '已暂停',
    toast_resumed: '已恢复',
    toast_stopped: '已停止',
    toast_cleared: '已清空',
    toast_clear_confirm: '确定清空所有已记录的内容?',
    toast_copied_md: '已复制 Markdown 到剪贴板',
    toast_zip_start: '开始打包 ZIP',
    toast_zip_with_images: '(含图片)',
    toast_zip_without_images: '(仅元数据)',
    toast_zip_done: 'ZIP 打包完成',
    toast_zip_failed: 'ZIP 失败',
    toast_export_md: '正在下载 Markdown',
    toast_export_json: '正在下载 JSON',
    toast_export_both: '正在下载 MD + JSON',
    toast_autoscroll_end: '自动滚动完成: 已到达底部',
    toast_autoscroll_max: '自动滚动: 已达最大轮次',
    toast_apicapture_started: '正在使用 API 抓取',
    toast_apicapture_progress: 'API 抓取',
    toast_apicapture_done: 'API 抓取完成',
    toast_apicapture_error: 'API 抓取失败',
    toast_theme_changed: '主题',
    toast_locale_changed: '语言',
    toast_prefs_reset: '偏好已重置,刷新页面后生效',

    // ── Locale picker ─────────────────────────────────────────────
    section_locale: '语言',
    locale_zh: '中文',
    locale_en: 'English',
    locale_system: '跟随系统',
} as const;

export type StringKey = keyof typeof ZH_STRINGS;
