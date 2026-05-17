// Tiny element factory. Not JSX — just a typed wrapper around
// `document.createElement` so component files stay declarative.
//
// `attrs` accepts a mix of:
//   - 'class' / 'text' / 'html' as shorthands
//   - 'style' as a CSSStyleDeclaration partial
//   - 'aria' object for batched aria-* attrs
//   - 'onXxx' for event listeners
//   - any other string key → setAttribute
//
// Children may be strings (auto text nodes) or Elements.

type Child = Element | string | null | false | undefined;

interface AttrsBase {
    class?: string;
    text?: string;
    html?: string;
    style?: Partial<CSSStyleDeclaration>;
    aria?: Record<string, string | number | boolean>;
}

type Attrs = AttrsBase & {
    [key: string]: unknown;
};

export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Attrs,
    children?: Child | Child[]
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);

    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v === false || v == null) continue;
            if (k === 'class') {
                el.className = String(v);
            } else if (k === 'style' && typeof v === 'object') {
                Object.assign(el.style, v as Partial<CSSStyleDeclaration>);
            } else if (k === 'text') {
                el.textContent = String(v);
            } else if (k === 'html') {
                el.innerHTML = String(v);
            } else if (k === 'aria' && typeof v === 'object' && v !== null) {
                for (const [ak, av] of Object.entries(v as Record<string, unknown>)) {
                    el.setAttribute(`aria-${ak}`, String(av));
                }
            } else if (k.startsWith('on') && typeof v === 'function') {
                el.addEventListener(
                    k.slice(2).toLowerCase(),
                    v as EventListenerOrEventListenerObject
                );
            } else {
                el.setAttribute(k, String(v));
            }
        }
    }

    if (children !== undefined && children !== null) {
        const list = Array.isArray(children) ? children : [children];
        for (const c of list) {
            if (c == null || c === false) continue;
            if (typeof c === 'string') el.appendChild(document.createTextNode(c));
            else el.appendChild(c);
        }
    }

    return el;
}
