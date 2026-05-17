# Discourse Text Recorder

Liquid-glass userscript that records Discourse forum posts (text + image URLs) as you scroll, then exports to Markdown + JSON. Light / dark / system theme, drag-and-snap dock, three-tier design tokens, modular TypeScript source.

Tested against `uscardforum.com` (Discourse 2026.5.0).

## Build

```bash
npm install
npm run build          # → .dist/discourse-text-recorder.user.js
```

| Script | What it does |
|---|---|
| `npm run build` | Production bundle with source map at `.dist/discourse-text-recorder.user.js` |
| `npm run build:map` | Same, but inline source map (single-file install for debugging) |
| `npm run dev` | Watch mode — webpack rebuilds on save |
| `npm run typecheck` | Strict TypeScript check (no emit) |
| `npm run lint` | ESLint with the typescript-eslint recommended rules |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Prettier across the repo |
| `npm run clean` | Remove `.dist/` |

## Install

1. Run `npm run build` once.
2. Open Tampermonkey / Violentmonkey, click **Create new script**, paste the contents of `.dist/discourse-text-recorder.user.js`, save. (Or open the file directly — the manager will prompt to install.)
3. Visit any Discourse forum (e.g. `uscardforum.com/t/topic/502565`). The liquid-glass dock appears at the bottom-right.

## Use

- **Start recording** → seeds from the page's `data-preloaded` JSON (first batch of posts, no scrolling required), then captures additional posts via `MutationObserver` + scroll listener as Discourse virtualizes the thread.
- **Pause / Resume / Stop** — pause keeps observers attached but freezes captures; the elapsed counter excludes paused time.
- **Export (MD + JSON)** — picks up your preferred format from settings (default: both). Filename is the topic title (sanitised).
- **Copy MD** — drops the Markdown transcript into the clipboard.

Keyboard shortcuts: `Alt+Shift+R` toggle record · `Alt+Shift+T` cycle theme.

## Architecture

```
Dev/src/
  main.ts                   ← entry (webpack)
  global.d.ts               ← ambient GM_* declarations
  header.txt                ← raw userscript metadata (prepended by BannerPlugin)
  core/
    constants.ts            ← NS, version, storage keys, z-index reservations
    types.ts                ← shared data shapes + EventMap
    storage.ts              ← GM_setValue / localStorage dual-write
    eventBus.ts             ← typed pub/sub
    store.ts                ← single reactive state object
  theme/
    theme.ts                ← light / dark / system + prefers-color-scheme listener
  styles/
    tokens.ts               ← three-tier CSS custom properties (light + dark)
    components.ts           ← dock / modal / toast / buttons / segmented / switch
    animations.ts           ← keyframes + theme-transition + reduced-motion
    injectStyles.ts         ← single <style> injection
  extractor/
    htmlToMarkdown.ts       ← HTML → Markdown for Discourse "cooked" bodies
    images.ts               ← lightbox → original URL preference order
    discourse.ts            ← page detection, topic meta, post extraction, preloaded JSON
  recorder/
    recorder.ts             ← orchestrates discourse + generic capture, pause/resume
  exporter/
    exporter.ts             ← Markdown + JSON builders, downloader, clipboard
  ui/
    dom.ts                  ← tiny h() element factory
    icons.ts                ← inline SVG strings (typed icon name union)
    rimLighting.ts          ← mouse-tracked --dtr-rim-mx / -my / -hover
    toast.ts                ← bottom-center stack
    settings.ts             ← modal (theme · format · capture toggles · about)
    dock.ts                 ← main floating panel + reactive renderer
  bootstrap/
    boot.ts                 ← isDiscoursePage gate + Theme.init + Dock.mount + shortcuts
```

### Token hierarchy

Three tiers, all under the `--dtr-*` namespace:

1. **Primitives** — colour palette, radius/font/shadow/easing scales
2. **Semantic** — `--dtr-text-primary`, surface elevations `E1`–`E4`, intent fills (`info-soft`, `danger-border`, etc.)
3. **Component-scoped** — toast/modal/dock-specific overrides

Dark theme overrides only the deltas under `html.dtr-theme-dark`. The host page is **not** touched by theme changes — only `#dtr-root` and its descendants animate.

### Data flow

```
[page]  →  extractor/discourse  →  Store.posts  →  Bus.emit('capture:tick')
                                        ↓
                       ui/dock.render() subscribes
                                        ↓
                              [updated dock UI]

[user click Export]  →  exporter.buildMarkdown() reads Store → download
```

## Project layout

```
discorrd chat export/
├── package.json           ← npm config + scripts
├── webpack.config.js      ← webpack + BannerPlugin (reads Dev/src/header.txt)
├── tsconfig.json          ← strict TypeScript
├── eslint.config.cjs      ← flat config, typescript-eslint
├── .prettierrc
├── Dev/src/               ← source (see Architecture above)
├── .dist/                 ← build output (gitignored)
├── legacy/                ← previous single-file releases (v2.0)
└── README.md
```

## License

MIT
