// Stylesheet injection. Concatenates the three CSS partials (tokens →
// components → animations) and inserts a single <style id="dtr-styles">
// into <head>. Idempotent — re-calling is a no-op.

import { STYLE_ID } from '../core/constants';
import { TOKENS_CSS } from './tokens';
import { COMPONENTS_CSS } from './components';
import { ANIMATIONS_CSS } from './animations';

export function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const css = `${TOKENS_CSS}\n${COMPONENTS_CSS}\n${ANIMATIONS_CSS}`;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    (document.head ?? document.documentElement).appendChild(el);
}
