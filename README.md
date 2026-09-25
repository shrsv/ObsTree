# ObsTree

Obsidian plugin that turns a dash-indented text outline into an interactive dendrogram — the
core capability of [notes2tree.com](https://notes2tree.com), native to your vault.

## Syntax

Depth = number of leading `-` characters. A line with no leading dash starts a new top-level
block; all top-level blocks become children of one root node (the note's first `# H1`, or its
filename if there's no H1).

```
time
- pulse
-- oscillation
-- non-linear
-- ultradian cycles
--- 90-120 mins
-- "series of sprints" (not marathon)

energy
- physical
- emotional
- mental
- spiritual
```

## Two ways to use it

- **Inline in any note**: wrap the outline in a ` ```tree ` fenced code block. Renders inline in
  Reading view and Live Preview, updating whenever the block's text changes.
- **Dedicated `.ntr` files**: click the ObsTree ribbon icon (or run "New tree note") to create a
  standalone tree file with its own edit/preview toggle.

## Interacting with the dendrogram

- **Scroll / pinch** — zoom, cursor-anchored.
- **Drag** — pan.
- **Click a node**, or focus the canvas and use **arrow keys** — `↓`/`↑` move through the tree,
  `←` jumps to the parent, `→` jumps to the first child.
- **Enter / Space** — zoom to fit the focused node's subtree.
- **Escape** — zoom to fit the whole tree.

## Install

### Option A — BRAT (recommended, no manual files)

1. Install the **BRAT** community plugin (Settings → Community plugins → Browse → search "BRAT").
2. BRAT settings → "Add beta plugin" → paste this repo's URL: `https://github.com/shrsv/ObsTree`.
3. Enable "ObsTree" under Settings → Community plugins.

### Option B — Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](../../releases/latest).
2. Create `<your-vault>/.obsidian/plugins/obs-tree/` and place the three files inside it.
3. Settings → Community plugins → turn off "Restricted mode" if needed → enable "ObsTree".

## Settings

Open Settings → ObsTree to configure the default folder for new `.ntr` files, root-label
behavior, node color theme, and live-update delay. Keyboard shortcuts for "New tree note" and
"Toggle tree edit/preview" can be rebound from there too (pan/zoom/arrow-key navigation inside
the canvas itself are not separately rebindable — they're always on while the canvas has focus).

## Scope

v1 ships the dendrogram view only — no AI-derived views (timelines, flowcharts, etc.), and no
LLM calls anywhere in the plugin. The parser and renderer are architected separately
(`src/parser.ts` vs. `src/renderers/`) so more view types can be added later without touching how
outlines are parsed. See `AGENTS.md` for the architecture.

## Development

```
npm install
npm run dev    # watch build
npm run build  # production build
```

To cut a release: `make release VERSION=x.y.z` — bumps the version, commits, tags, and pushes;
GitHub Actions builds and publishes the release assets automatically.
