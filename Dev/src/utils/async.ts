// Debounce + throttle. Imported by anything that needs to rate-limit a
// pointer/scroll handler — currently the recorder's scroll observer and
// the dock's elapsed-time ticker.

export function debounce<A extends unknown[]>(
    fn: (...args: A) => void,
    wait: number
): (...args: A) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function (this: unknown, ...args: A): void {
        if (timeout !== undefined) clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}

export function throttle<A extends unknown[]>(
    fn: (...args: A) => void,
    limit: number
): (...args: A) => void {
    let inThrottle = false;
    return function (this: unknown, ...args: A): void {
        if (inThrottle) return;
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
            inThrottle = false;
        }, limit);
    };
}

// Resolves on the next animation frame. Useful for scheduling a paint
// before a heavier follow-up step.
export function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
