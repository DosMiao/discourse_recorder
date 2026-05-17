// Minimal HTML → Markdown converter, tailored to Discourse's "cooked" post
// HTML. We don't try to handle arbitrary HTML — only the constructs Discourse
// emits: paragraphs, lists, blockquotes, code blocks, headings, quote asides,
// lightbox images, details/summary, inline strong/em/del/code.

interface WalkContext {
    out: string[];
}

function walkInto(ctx: WalkContext, node: Node, buffer: string[]): void {
    const saved = ctx.out.length;
    walk(ctx, node);
    const collected = ctx.out.splice(saved, ctx.out.length - saved);
    buffer.push(collected.join(''));
}

function walk(ctx: WalkContext, node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
        ctx.out.push(node.nodeValue ?? '');
        return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (el.classList.contains('post-action-menu')) return;
    if (el.classList.contains('quote-controls')) return;
    if (tag === 'svg' || tag === 'button' || tag === 'script' || tag === 'style') return;

    if (tag === 'img') {
        const img = el as HTMLImageElement;
        if (img.classList.contains('emoji')) {
            ctx.out.push(img.getAttribute('alt') ?? img.getAttribute('title') ?? '');
            return;
        }
        const lightboxAnchor = img.closest('a.lightbox');
        const href = lightboxAnchor?.getAttribute('href') ?? '';
        const src = href || img.getAttribute('data-src') || img.getAttribute('src') || '';
        const alt = (img.getAttribute('alt') ?? '').replace(/[[\]]/g, '');
        if (src) ctx.out.push(`\n\n![${alt}](${src})\n\n`);
        return;
    }

    if (tag === 'aside' && el.classList.contains('quote')) {
        const user = el.getAttribute('data-username') ?? '';
        const post = el.getAttribute('data-post') ?? '';
        const bq = el.querySelector('blockquote');
        const buf: string[] = [];
        if (bq) for (const c of Array.from(bq.childNodes)) walkInto(ctx, c, buf);
        const inner = buf.join('').trim();
        const head = user ? `> [引用 @${user}${post ? ` #${post}` : ''}]` : '> [引用]';
        const quoted = inner
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n');
        ctx.out.push(`\n\n${head}\n${quoted}\n\n`);
        return;
    }

    if (tag === 'br') {
        ctx.out.push('\n');
        return;
    }
    if (tag === 'hr') {
        ctx.out.push('\n\n---\n\n');
        return;
    }

    if (tag === 'p') {
        ctx.out.push('\n\n');
        descend(ctx, el);
        ctx.out.push('\n\n');
        return;
    }

    if (tag === 'blockquote') {
        const buf: string[] = [];
        for (const c of Array.from(el.childNodes)) walkInto(ctx, c, buf);
        const inner = buf.join('').trim();
        const lines = inner
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n');
        ctx.out.push(`\n\n${lines}\n\n`);
        return;
    }

    if (tag === 'pre') {
        const code = el.querySelector('code');
        const text = (code ?? el).textContent ?? '';
        const lang = code
            ? (Array.from(code.classList).find((c) => c.startsWith('lang-')) ?? '').replace(
                  'lang-',
                  ''
              )
            : '';
        ctx.out.push(`\n\n\`\`\`${lang}\n${text.replace(/\n+$/, '')}\n\`\`\`\n\n`);
        return;
    }

    if (tag === 'code') {
        ctx.out.push('`');
        descend(ctx, el);
        ctx.out.push('`');
        return;
    }
    if (tag === 'strong' || tag === 'b') {
        ctx.out.push('**');
        descend(ctx, el);
        ctx.out.push('**');
        return;
    }
    if (tag === 'em' || tag === 'i') {
        ctx.out.push('*');
        descend(ctx, el);
        ctx.out.push('*');
        return;
    }
    if (tag === 'del' || tag === 's' || tag === 'strike') {
        ctx.out.push('~~');
        descend(ctx, el);
        ctx.out.push('~~');
        return;
    }

    if (tag === 'a') {
        const href = el.getAttribute('href') ?? '';
        if (el.classList.contains('lightbox')) {
            descend(ctx, el);
            return;
        }
        if (!href) {
            descend(ctx, el);
            return;
        }
        ctx.out.push('[');
        descend(ctx, el);
        ctx.out.push(`](${href})`);
        return;
    }

    if (tag === 'ul' || tag === 'ol') {
        ctx.out.push('\n');
        let i = 1;
        for (const li of Array.from(el.children)) {
            if (li.tagName.toLowerCase() !== 'li') continue;
            ctx.out.push(tag === 'ol' ? `${i++}. ` : '- ');
            descend(ctx, li);
            ctx.out.push('\n');
        }
        ctx.out.push('\n');
        return;
    }

    if (/^h[1-6]$/.test(tag)) {
        const level = '#'.repeat(parseInt(tag[1] ?? '1', 10));
        ctx.out.push(`\n\n${level} `);
        descend(ctx, el);
        ctx.out.push('\n\n');
        return;
    }

    if (tag === 'details') {
        const summary = el.querySelector(':scope > summary');
        const sumText = summary ? (summary.textContent ?? '').trim() : '展开';
        ctx.out.push(`\n\n<details>\n<summary>${sumText}</summary>\n\n`);
        for (const c of Array.from(el.childNodes)) {
            if (c !== summary) walk(ctx, c);
        }
        ctx.out.push('\n\n</details>\n\n');
        return;
    }

    descend(ctx, el);
}

function descend(ctx: WalkContext, el: Element): void {
    for (const c of Array.from(el.childNodes)) walk(ctx, c);
}

export function htmlToMarkdown(root: Element | null | undefined): string {
    if (!root) return '';
    const ctx: WalkContext = { out: [] };
    for (const c of Array.from(root.childNodes)) walk(ctx, c);
    let md = ctx.out.join('');
    md = md.replace(/[ \t]+\n/g, '\n');
    md = md.replace(/\n{3,}/g, '\n\n');
    return md.trim();
}
