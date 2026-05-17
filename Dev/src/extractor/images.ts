// Image URL harvester for a post body. Prefers the original (lightbox parent
// href) over the served thumbnail, falls back to data-src, then src. Skips
// emoji <img>s, which are tiny inline glyphs rather than user content.

export function collectImageUrls(root: Element | null | undefined): string[] {
    if (!root) return [];
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const img of Array.from(root.querySelectorAll('img'))) {
        if (img.classList.contains('emoji')) continue;
        const lightbox = img.closest('a.lightbox');
        const url =
            lightbox?.getAttribute('href') ??
            img.getAttribute('data-src') ??
            img.getAttribute('src') ??
            '';
        if (url && !seen.has(url)) {
            seen.add(url);
            urls.push(url);
        }
    }
    return urls;
}
