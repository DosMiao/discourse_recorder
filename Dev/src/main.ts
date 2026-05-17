// Entry point. Webpack BannerPlugin prepends header.txt verbatim so the
// userscript manager sees the @grant / @match metadata before this code.

import { boot, bootPoll } from './bootstrap/boot';

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        () => {
            boot();
            bootPoll();
        },
        { once: true }
    );
} else {
    boot();
    bootPoll();
}
