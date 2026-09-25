# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this is

ObsTree is an Obsidian desktop plugin that turns a dash-indented text outline (see README for
the exact syntax) into an interactive dendrogram — pan, zoom, zoom-to-node, arrow-key node
navigation — matching the core capability of notes2tree.com. There is no AI/LLM involvement
anywhere in this plugin; it's a pure text-to-visualization tool.

## Architecture: parser/renderer split

This is the one architectural rule that matters most. Two things are deliberately decoupled:

- `src/parser.ts` — turns dash-outline text into a plain `TreeNode` tree (`{id, label, depth,
  children}`). It knows nothing about rendering, SVG, D3, or the DOM.
- `src/renderers/` — turns a `TreeNode` tree into an interactive view, via the `TreeRenderer`
  interface (`src/renderers/types.ts`): `mount(container, tree)`, `update(tree)`,
  `focusNode?(id)`, `destroy()`. `src/renderers/registry.ts` is the single factory/lookup point.

Only one renderer ships today — `src/renderers/dendrogram/`. The contract exists specifically so
Outline/Mind Map/Treemap/Sunburst views (all non-AI, all derivable from the same parsed tree —
see notes2tree's "Tree"-tagged views) can be added later as new `src/renderers/<name>/` folders
implementing `TreeRenderer`, registered in `registry.ts`, without ever touching `parser.ts`.
**Never let a renderer reach back into parsing, and never let the parser know a renderer
exists.**

Never add AI/LLM-derived view types (Timeline, Process, Flowchart, Causal Graph, Argument Map,
Matrix, etc. from notes2tree's picker) — those are explicitly out of scope for this plugin.

## Layout

- `main.ts` — plugin entry: settings wiring, ribbon icon, commands, view/extension/code-block
  registration.
- `src/parser.ts` — `TreeNode`, `parseOutlineToForest`, `buildTree` (dash-depth stack parser).
- `src/rootLabel.ts` — `getMarkdownRootLabel` (H1-else-filename, markdown code-block path only).
- `src/debounce.ts` — generic debounce utility, used by the `.ntr` edit-mode textarea.
- `src/settings.ts` — `ObsTreeSettings`, defaults, settings tab, `openHotkeySettings` helper.
- `src/codeBlockProcessor.ts` — registers the ` ```tree ` fenced-code-block processor for
  regular `.md` notes.
- `src/ntrView.ts` — `TreeView extends TextFileView`, the dedicated `.ntr` file view
  (edit/preview toggle).
- `src/renderers/types.ts`, `src/renderers/registry.ts` — the renderer contract + factory.
- `src/renderers/dendrogram/` — the only renderer: `DendrogramRenderer.ts` (lifecycle/orchestration),
  `layout.ts` (`d3-hierarchy` tree layout), `render.ts` (SVG DOM building, `d3-shape` link paths),
  `panzoom.ts` (`d3-zoom`/`d3-selection`/`d3-transition` pan/zoom + animated transitions),
  `keyboardNav.ts` (arrow-key traversal state — fully custom, no library covers this).

## Conventions

- Desktop-only plugin (`isDesktopOnly: true` in manifest) — no mobile touch/pinch handling; if
  mobile support is ever added, that's a deliberate scope change to `panzoom.ts`, not an
  incidental one.
- Dash-depth syntax: depth = count of leading `-` characters on a line (`^(-+)\s*(.*)$`), not
  indentation/whitespace. A line with zero leading dashes starts a new top-level block. Blank
  lines are pure separators — never structural. See `src/parser.ts` for the exact stack-based
  algorithm, including how it handles depth-skips (`-` then `---`).
- Node `id`s from the parser are only unique *within one parse* (a module-level counter) — they
  are **not** stable across re-parses of edited text. Renderers that need to preserve UI state
  (like the dendrogram's focused node) across an `update()` call must match nodes by their label
  path from root, not by `id`. See `nodePath`/`pathsEqual` in `DendrogramRenderer.ts`.
- Pan/zoom/arrow-key-navigation are **local DOM listeners scoped to the renderer's own
  container**, never registered as Obsidian commands/hotkeys — they only make sense while a tree
  canvas has focus.
- New settings go in `ObsTreeSettings` (`src/settings.ts`) with a sensible default in
  `DEFAULT_SETTINGS`, plus a corresponding `Setting` in `ObsTreeSettingTab.display()`.
- `.ntr` files are plain text — their entire content is the raw dash-outline, no JSON wrapper.
  Don't put view state (pan/zoom, collapsed nodes) inside the file; if that's ever needed, use
  plugin `loadData()`/`saveData()` keyed by file path instead.

## Build & release

- `make build` — production build (`main.js`).
- `make dev` — esbuild watch mode.
- `make check` — typecheck only, no emit.
- `make release VERSION=x.y.z` — bumps `manifest.json`/`versions.json`/`package.json`, commits,
  tags, and pushes; GitHub Actions (`.github/workflows/release.yml`) builds and publishes the
  release assets (`main.js`, `manifest.json`, `styles.css`).

Always run `make check` before committing.

## Testing

There's no automated test suite yet. Verify manually against a real Obsidian vault: load the
plugin unpacked, paste a sample outline into both a ` ```tree ` code block and a new `.ntr` file,
and confirm rendering, live update, pan/zoom, zoom-to-node, and arrow-key navigation all work.
