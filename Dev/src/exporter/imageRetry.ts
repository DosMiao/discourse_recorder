// One-click retry for image download failures recorded on an export task.
// Creates a sub-task linked to the original; re-downloads only the failed
// URLs. Successes are removed from BOTH the sub-task's and the parent's
// failure lists so the parent's "Retry N" button copy decrements live.
//
// Intentional limitation (v4.0): retry does NOT repack the ZIP. The freshly
// downloaded bytes are not folded back into the original archive — the user
// must re-trigger the export (with the now-cached images succeeding) if
// they want a complete ZIP. The retry path is for "I want to know if the
// failures were transient" rather than "I want a fixed ZIP without rebuilding".

import { Tasks } from '../core/taskRegistry';
import { downloadAll } from './imageDownload';

export async function retryImageFailures(originalId: string): Promise<void> {
    const original = Tasks.get(originalId);
    if (!original || original.failures.length === 0) return;
    const failedUrls = original.failures.map((f) => f.id);

    const { id, signal } = Tasks.create({
        kind: 'image.retry',
        titleKey: 'task_title_image_retry',
        titleParams: { n: failedUrls.length },
        unit: 'images',
        total: failedUrls.length,
        parentId: originalId,
        cancellable: true,
        retryable: true,
    });
    Tasks.linkChild(originalId, id);

    try {
        const ok = await downloadAll(failedUrls, {
            signal,
            onProgress: (p) => {
                Tasks.update(id, { done: p.done, total: p.total });
            },
            onItemDone: (item) => {
                if (item.ok) {
                    Tasks.update(id, { removeFailure: item.url });
                    // Decrement the parent's outstanding failure list so its
                    // "Retry N" copy updates and the button vanishes once
                    // failures.length hits 0.
                    Tasks.update(originalId, { removeFailure: item.url });
                } else {
                    Tasks.update(id, {
                        addFailure: {
                            id: item.url,
                            label: item.url,
                            error: item.error ?? 'unknown',
                        },
                    });
                }
            },
        });
        if (signal.aborted) {
            Tasks.end(id, { status: 'cancelled' });
            return;
        }
        Tasks.end(id, {
            status: ok.length === failedUrls.length ? 'succeeded' : 'failed',
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Tasks.end(id, { status: 'failed', message: msg });
        throw err;
    }
}
