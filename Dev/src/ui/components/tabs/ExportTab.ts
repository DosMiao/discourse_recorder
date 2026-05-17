// Export tab — format picker, the export action button, copy-to-clipboard,
// and the two export-flavour toggles (filename prefix, auto-save).

import { NS, STORAGE_KEYS } from '../../../bootstrap/config';
import { Storage } from '../../../infra/storage/storage';
import { Store } from '../../../core/store';
import { Bus } from '../../../core/eventBus';
import type { ExportFormat } from '../../../core/types';
import { copyMarkdown, exportPreferred } from '../../../exporter/exporter';
import { h } from '../../utils/dom';
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

export function createExportTab(deps: ExportTabDeps): ExportTabHandle {
    const { i18n } = deps;

    // ── format picker ────────────────────────────────────────
    const fmtSeg: SegmentedHandle<ExportFormat> = createSegmented<ExportFormat>({
        value: Store.get('exportFormat'),
        options: [
            { value: 'zip', label: i18n.t('fmt_zip') },
            { value: 'both', label: i18n.t('fmt_both') },
            { value: 'md', label: i18n.t('fmt_md') },
            { value: 'json', label: i18n.t('fmt_json') },
        ],
        onChange: (next) => {
            Store.patch({ exportFormat: next });
            Storage.set(STORAGE_KEYS.exportFormat, next);
            refresh();
        },
        ariaLabel: i18n.t('section_format'),
    });

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

    function onExport(): void {
        const fmt = Store.get('exportFormat');
        if (fmt === 'zip') {
            exportBtn.setDisabled(true);
            const dl = Store.get('downloadImages')
                ? i18n.t('toast_zip_with_images')
                : i18n.t('toast_zip_without_images');
            Toast.show(`${i18n.t('toast_zip_start')} ${dl}`, 'info', 2200);
            Promise.resolve(exportPreferred())
                .then(() => {
                    exportBtn.setDisabled(
                        Store.counts().posts + Store.counts().chunks === 0
                    );
                    Toast.show(i18n.t('toast_zip_done'), 'success', 2200);
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
        }
    }

    // ── advanced toggles ─────────────────────────────────────
    const autoSaveRow = createToggleRow({
        name: i18n.t('toggle_auto_save'),
        description: i18n.t('toggle_auto_save_desc'),
        checked: Store.get('autoSaveOnComplete'),
        onChange: (v) => {
            Store.patch({ autoSaveOnComplete: v });
            Storage.set(STORAGE_KEYS.autoSaveOnComplete, v);
        },
        ariaLabel: i18n.t('toggle_auto_save'),
    });
    const filenamePrefixRow = createToggleRow({
        name: i18n.t('toggle_filename_prefix'),
        description: i18n.t('toggle_filename_prefix_desc'),
        checked: Store.get('filenamePrefix'),
        onChange: (v) => {
            Store.patch({ filenamePrefix: v });
            Storage.set(STORAGE_KEYS.filenamePrefix, v);
        },
        ariaLabel: i18n.t('toggle_filename_prefix'),
    });
    const downloadImagesRow = createToggleRow({
        name: i18n.t('toggle_download_images'),
        description: i18n.t('toggle_download_images_desc'),
        checked: Store.get('downloadImages'),
        onChange: (v) => {
            Store.patch({ downloadImages: v });
            Storage.set(STORAGE_KEYS.downloadImages, v);
        },
        ariaLabel: i18n.t('toggle_download_images'),
    });

    // export progress (rendered into the export button when running)
    Bus.on('export:progress', (p) => {
        if (p.phase === 'downloading' || p.phase === 'zipping') {
            exportBtn.setLabel(p.message ?? '...');
        } else if (p.phase === 'done' || p.phase === 'error') {
            refresh();
        }
    });

    // ── assemble ─────────────────────────────────────────────
    const formatGroup = h('div', { class: `${NS}-group` }, [
        h('div', { class: `${NS}-group-title`, text: i18n.t('section_format') }),
        fmtSeg.element,
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
        [formatGroup, exportBtn.element, copyBtn.element, advancedGroup]
    ) as HTMLDivElement;

    function refresh(): void {
        const counts = Store.counts();
        const total = counts.posts || counts.chunks;
        const fmt = Store.get('exportFormat');

        const exportLabel =
            fmt === 'zip'
                ? `${i18n.t('btn_export')} (ZIP)`
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

        // Sync toggle states (in case they were changed elsewhere).
        type Handle = SwitchHandle;
        (autoSaveRow.handle as Handle).set(Store.get('autoSaveOnComplete'));
        (filenamePrefixRow.handle as Handle).set(Store.get('filenamePrefix'));
        (downloadImagesRow.handle as Handle).set(Store.get('downloadImages'));
    }

    refresh();
    return { element, refresh };
}
