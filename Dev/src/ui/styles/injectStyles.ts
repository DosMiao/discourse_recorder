// Stylesheet injection. Concatenates tokens + every CSS partial and inserts
// a single <style id="dtr-styles"> into <head>. Idempotent — re-calling is a
// no-op.

import { STYLE_ID } from '../../bootstrap/config';
import { TOKENS_CSS } from './tokens';
import { PARTIAL_CSS_LIST } from './partials';

export function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const css = [TOKENS_CSS, ...PARTIAL_CSS_LIST].join('\n');
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    (document.head ?? document.documentElement).appendChild(el);
}
