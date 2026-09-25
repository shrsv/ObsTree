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
- **Dedicated `.ntr` files**: a standalone tree file. The main pane is a preview-only canvas;
  editing happens in the **ObsTree sidebar** (see below) so you always see the live dendrogram
  next to what you're typing, instead of switching between an edit mode and a preview mode.

### Creating a `.ntr` file

- **Right-click a folder** in the file explorer → **New tree** — the location is already known
  from the click, so this just asks for a name and creates it there immediately.
- **Ribbon icon** (or the "Toggle ObsTree sidebar" command) opens the sidebar. If no tree is
  currently focused, it asks which folder and name to create one with.
- **"New tree note"** command — same folder/name prompt, from anywhere.

## The ObsTree sidebar

Click the ribbon icon to toggle a right-sidebar panel containing a real editor (the same
CodeMirror engine Obsidian's own notes use — undo/redo, selection, Ctrl+F search all work),
similar to a chat sidebar. It always edits whichever `.ntr` file was most recently focused in
the main area — type there, and the dendrogram in the main pane updates live. Click "New Tree"
in the sidebar at any time to create and open another one.

## Renaming the root node

The root node's label defaults to the file's H1 (markdown notes) or filename (`.ntr` files), but
you can override it explicitly:

- Right-click a `.ntr` file in the file explorer → **Rename tree**.
- Run the **"Rename tree"** command while a tree is open.
- Click the tree's name at the top of the ObsTree sidebar.

Clearing the name (or setting it back to the filename) removes the override.

## Fit mode

The dendrogram starts in "fit" mode — zoomed to show the whole tree — and stays there as you
type, so newly added nodes are automatically kept in view. Manually panning/zooming, or
navigating into a specific node (click, or Enter/Space on a focused node), switches out of fit
mode so your view isn't yanked around. Press **Escape**, click the root node, or hit **"Zoom to
fit"** to snap back to fit mode.

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
"Toggle ObsTree sidebar" can be rebound from there too (pan/zoom/arrow-key navigation inside the
canvas itself are not separately rebindable — they're always on while the canvas has focus).

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
