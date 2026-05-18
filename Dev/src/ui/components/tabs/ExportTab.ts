// Export tab — format picker, the export action button, copy-to-clipboard,
// and the two export-flavour toggles (filename prefix, auto-save).

import {
    NS,
    STORAGE_KEYS,
    DEFAULT_SHARD_CAP_LINES,
    MIN_SHARD_CAP_LINES,
    MAX_SHARD_CAP_LINES,
} from '../../../bootstrap/config';
import { storageOP } from '../../../infra/storage/storageOperator';
import { Store } from '../../../core/store';
import type { ExportFormat } from '../../../core/types';
import {
    copyMarkdown,
    exportBaseName,
    exportPageHtml,
    exportPreferred,
} from '../../../exporter/exporter';
import { h } from '../../../utils/dom';
import { Toast } from '../Toast';
import { createButton, type ButtonHandle } from '../Button';
import { createSegmented, type SegmentedHandle } from '../Segmented';
import { createToggleRow, type SwitchHandle } from '../Switch';
import type { I18n } from '../../../infra/i18n/i18n';

export interface ExportTabHandle {
    element: HTMLDivElement;
    refresh(): void;
}

interface ExportTabDeps {
    i18n: I18n;
}

// Show the Windows long-path advisory at most once per page lifetime so the
// user isn't nagged on every export. Threshold: 50 chars of slug means the
// title alone is ~40+ chars after the date prefix, which is where copy-to-
// deep-destination starts approaching MAX_PATH=260 in practice.
const LONG_PATH_SLUG_THRESHOLD = 50;
let _longPathToastShown = false;

function isWindows(): boolean {
    return /windows/i.test(navigator.userAgent);
}

function maybeWarnLongPath(i18n: I18n): void {
    if (_longPathToastShown) return;
    if (!isWindows()) return;
    const base = exportBaseName();
    if (base.length <= LONG_PATH_SLUG_THRESHOLD) return;
    _longPathToastShown = true;
    Toast.show(i18n.t('toast_long_path_warn'), 'warning', 6000);
}

export function createExportTab(deps: ExportTabDeps): ExportTabHandle {
    const { i18n } = deps;

    // ── format picker ────────────────────────────────────────
    const fmtSeg: SegmentedHandle<ExportFormat> = createSegmented<ExportFormat>({
        value: Store.get('exportFormat'),
        options: [
            { value: 'sharded', label: i18n.t('fmt_sharded') },
            { value: 'zip', label: i18n.t('fmt_zip') },
            { value: 'both', label: i18n.t('fmt_both') },
            { value: 'md', label: i18n.t('fmt_md') },
            { value: 'json', label: i18n.t('fmt_json') },
        ],
        onChange: (next) => {
            Store.patch({ exportFormat: next });
            storageOP.set(STORAGE_KEYS.exportFormat, next);
            refresh();
        },
        ariaLabel: i18n.t('section_format'),
    });

    // ── shard cap input (only visible when format === 'sharded') ──
    const shardCapInput = h('input', {
        type: 'number',
        min: String(MIN_SHARD_CAP_LINES),
        max: String(MAX_SHARD_CAP_LINES),
        step: '50',
        value: String(Store.get('shardCap') || DEFAULT_SHARD_CAP_LINES),
        'aria-label': i18n.t('label_shard_cap'),
        style: {
            width: '72px',
            padding: '4px 8px',
            font: `500 var(--${NS}-fs-md)/1.2 var(--${NS}-font)`,
            color: `var(--${NS}-text-primary)`,
            background: `var(--${NS}-E4-bg)`,
            border: `1px solid var(--${NS}-E4-border)`,
            borderRadius: `var(--${NS}-radius-md)`,
            textAlign: 'right',
        },
        onchange: () => {
            const raw = Number(shardCapInput.value);
            const clamped = Math.max(
                MIN_SHARD_CAP_LINES,
                Math.min(
                    MAX_SHARD_CAP_LINES,
                    Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_SHARD_CAP_LINES
                )
            );
            if (String(clamped) !== shardCapInput.value) {
                shardCapInput.value = String(clamped);
            }
            Store.patch({ shardCap: clamped });
            storageOP.set(STORAGE_KEYS.shardCap, clamped);
        },
    }) as HTMLInputElement;

    const shardCapRow = h('div', { class: `${NS}-toggle-row` }, [
        h('div', { class: `${NS}-toggle-label` }, [
            h('div', {
                class: `${NS}-toggle-name`,
                text: i18n.t('label_shard_cap'),
            }),
            h('div', {
                class: `${NS}-toggle-desc`,
                text: i18n.t('desc_shard_cap'),
            }),
        ]),
        shardCapInput,
    ]) as HTMLDivElement;

    // ── action buttons ───────────────────────────────────────
    const exportBtn: ButtonHandle = createButton({
        label: i18n.t('btn_export'),
        icon: 'download',
        variant: 'primary',
        fullWidth: true,
        onClick: onExport,
    });

    const copyBtn: ButtonHandle = createButton({
        label: i18n.t('btn_copy_md'),
        icon: 'copy',
        fullWidth: true,
        onClick: () => {
            copyMarkdown();
            Toast.show(i18n.t('toast_copied_md'), 'success');
        },
    });

    const exportDomBtn: ButtonHandle = createButton({
        label: i18n.t('btn_export_dom'),
        icon: 'download',
        fullWidth: true,
        onClick: () => {
            exportPageHtml();
            Toast.show(i18n.t('toast_export_dom'), 'success');
            maybeWarnLongPath(i18n);
        },
    });

    function onExport(): void {
        const fmt = Store.get('exportFormat');
        // Both 'zip' and 'sharded' are async ZIP builders (potentially long if
        // images download). Disable the button + show progress for both.
        if (fmt === 'zip' || fmt === 'sharded') {
            exportBtn.setDisabled(true);
            const startMsg =
                fmt === 'sharded'
                    ? i18n.t('toast_export_sharded')
                    : (() => {
                          const dl = Store.get('downloadImages')
                              ? i18n.t('toast_zip_with_images')
                              : i18n.t('toast_zip_without_images');
                          return `${i18n.t('toast_zip_start')} ${dl}`;
                      })();
            Toast.show(startMsg, 'info', 2200);
            Promise.resolve(exportPreferred())
                .then(() => {
                    exportBtn.setDisabled(
                        Store.counts().posts + Store.counts().chunks === 0
                    );
                    Toast.show(
                        fmt === 'sharded'
                            ? i18n.t('toast_export_sharded_done')
                            : i18n.t('toast_zip_done'),
                        'success',
                        2200
                    );
                    maybeWarnLongPath(i18n);
                })
                .catch((err: unknown) => {
                    exportBtn.setDisabled(false);
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    Toast.show(`${i18n.t('toast_zip_failed')}: ${msg}`, 'error', 3500);
                });
        } else {
            void exportPreferred();
            const msg =
                fmt === 'md'
                    ? i18n.t('toast_export_md')
                    : fmt === 'json'
                      ? i18n.t('toast_export_json')
                      : i18n.t('toast_export_both');
            Toast.show(msg, 'success');
            maybeWarnLongPath(i18n);
        }
    }

    // ── advanced toggles ─────────────────────────────────────
    const autoSaveRow = createToggleRow({
        name: i18n.t('toggle_auto_save'),
        description: i18n.t('toggle_auto_save_desc'),
        checked: Store.get('autoSaveOnComplete'),
        onChange: (v) => {
            Store.patch({ autoSaveOnComplete: v });
            storageOP.set(STORAGE_KEYS.autoSaveOnComplete, v);
        },
        ariaLabel: i18n.t('toggle_auto_save'),
    });
    const filenamePrefixRow = createToggleRow({
        name: i18n.t('toggle_filename_prefix'),
        description: i18n.t('toggle_filename_prefix_desc'),
        checked: Store.get('filenamePrefix'),
        onChange: (v) => {
            Store.patch({ filenamePrefix: v });
            storageOP.set(STORAGE_KEYS.filenamePrefix, v);
        },
        ariaLabel: i18n.t('toggle_filename_prefix'),
    });
    const downloadImagesRow = createToggleRow({
        name: i18n.t('toggle_download_images'),
        description: i18n.t('toggle_download_images_desc'),
        checked: Store.get('downloadImages'),
        onChange: (v) => {
            Store.patch({ downloadImages: v });
            storageOP.set(STORAGE_KEYS.downloadImages, v);
        },
        ariaLabel: i18n.t('toggle_download_images'),
    });

    // Export progress lives in the Activity Panel now — the export button
    // keeps its static label throughout. onExport handles button state
    // (disabled/re-enabled) via the exportPreferred() promise chain.

    // ── assemble ─────────────────────────────────────────────
    const formatGroup = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_format') }),
        fmtSeg.element,
        shardCapRow,
    ]);
    const advancedGroup = h('div', { class: `${NS}-group` }, [
        h('div', {
            class: `${NS}-group-title`,
            text: i18n.t('section_export_advanced'),
        }),
        downloadImagesRow.element,
        filenamePrefixRow.element,
        autoSaveRow.element,
    ]);

    const element = h(
        'div',
        {
            class: `${NS}-tabpanel`,
            role: 'tabpanel',
            id: `${NS}-tabpanel-export`,
            'aria-labelledby': `${NS}-tab-export`,
        },
        [
            formatGroup,
            exportBtn.element,
            copyBtn.element,
            exportDomBtn.element,
            advancedGroup,
        ]
    ) as HTMLDivElement;

    function refresh(): void {
        const counts = Store.counts();
        const total = counts.posts || counts.chunks;
        const fmt = Store.get('exportFormat');

        const exportLabel =
            fmt === 'zip'
                ? `${i18n.t('btn_export')} (ZIP)`
                : fmt === 'sharded'
                  ? `${i18n.t('btn_export')} (${i18n.t('fmt_sharded')})`
                  : fmt === 'md'
                    ? `${i18n.t('btn_export')} MD`
                    : fmt === 'json'
                      ? `${i18n.t('btn_export')} JSON`
                      : `${i18n.t('btn_export')} (MD+JSON)`;
        exportBtn.setLabel(exportLabel);
        exportBtn.setIcon('download');
        exportBtn.setDisabled(total === 0);
        copyBtn.setDisabled(total === 0);
        fmtSeg.set(fmt);

        // Shard cap input is only meaningful in 'sharded' mode.
        shardCapRow.hidden = fmt !== 'sharded';
        const cap = Store.get('shardCap') || DEFAULT_SHARD_CAP_LINES;
        if (shardCapInput.value !== String(cap)) {
            shardCapInput.value = String(cap);
        }

        // Sync toggle states (in case they were changed elsewhere).
        type Handle = SwitchHandle;
        (autoSaveRow.handle as Handle).set(Store.get('autoSaveOnComplete'));
        (filenamePrefixRow.handle as Handle).set(Store.get('filenamePrefix'));
        (downloadImagesRow.handle as Handle).set(Store.get('downloadImages'));
    }

    refresh();
    return { element, refresh };
}
