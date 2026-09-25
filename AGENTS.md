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

- `main.ts` — plugin entry: settings wiring, ribbon icon (toggles the sidebar), commands,
  view/extension/code-block registration, `active-leaf-change` tracking of the most-recently-
  focused `TreeView` (`activeTreeView`), and the folder `file-menu` "New tree" item.
- `src/parser.ts` — `TreeNode`, `parseOutlineToForest`, `buildTree` (dash-depth stack parser).
- `src/rootLabel.ts` — `getMarkdownRootLabel` (H1-else-filename, markdown code-block path only).
- `src/debounce.ts` — generic debounce utility, used by `TreeView.applyText`'s re-render.
- `src/createTree.ts` — `ensureFolder`/`createUniqueTreeFile`, the shared file-creation helper
  used by the folder context-menu item, `NewTreeModal`, and the `new-tree-note` command.
- `src/newTreeModal.ts` — `NewTreeModal`, a folder+name prompt used whenever there's no implicit
  location for a new tree (ribbon/sidebar/command paths — a folder right-click already has one).
- `src/nameModal.ts` — `NameModal`, a single-field name prompt; reused by the folder-right-click
  "New tree" (location already known, only the name is asked) and by "Rename tree".
- `src/renameTree.ts` — `promptRenameTree(plugin, file)`: opens `NameModal`, writes/clears
  `settings.rootLabelOverrides[file.path]`, and refreshes any open views of that file.
- `src/sidebarEditor.ts` — `SidebarEditor`, a thin CodeMirror 6 wrapper (`@codemirror/view` /
  `-state` / `-commands` / `-search`, all marked `external` in `esbuild.config.mjs` so they
  resolve against Obsidian's own bundled CM6 at runtime instead of shipping a second copy). This
  is what the sidebar actually edits in — not a `<textarea>` — so undo/redo, selection, and
  Ctrl+F search work like a normal editor.
- `src/settings.ts` — `ObsTreeSettings`, defaults, settings tab, `openHotkeySettings` helper.
- `src/codeBlockProcessor.ts` — registers the ` ```tree ` fenced-code-block processor for
  regular `.md` notes.
- `src/ntrView.ts` — `TreeView extends TextFileView`, the `.ntr` file view. **Preview-only** —
  it renders the dendrogram and nothing else; there is deliberately no in-pane edit mode. Exposes
  `getRawText()`/`applyText(text)` for the sidebar to drive it.
- `src/sidebarView.ts` — `TreeSidebarView extends ItemView`, the right-sidebar editor panel
  (`VIEW_TYPE_TREE_SIDEBAR`). This is where all `.ntr` editing actually happens — a `SidebarEditor`
  (real CM6 instance) bound to whichever `TreeView` was most recently active, updating it on
  every keystroke. Header has two icon buttons: "New tree" and "reveal" (jump to the bound
  view's tab — see "Sidebar ↔ main-pane tab switching" below). See "Sidebar binding" below for
  why the bound view isn't just "the active view".
- `src/renderers/types.ts`, `src/renderers/registry.ts` — the renderer contract + factory.
- `src/renderers/dendrogram/` — the only renderer: `DendrogramRenderer.ts` (lifecycle/orchestration),
  `layout.ts` (`d3-hierarchy` tree layout), `render.ts` (SVG DOM building, `d3-shape` link paths),
  `panzoom.ts` (`d3-zoom`/`d3-selection`/`d3-transition` pan/zoom + animated transitions),
  `keyboardNav.ts` (arrow-key traversal state — fully custom, no library covers this),
  `textMeasure.ts` (canvas-measured word-wrap + ellipsis truncation, shared by `layout.ts` and
  `render.ts` so they always wrap identically — see "Label wrapping" below), `controls.ts`
  (the floating bottom-right D-pad/zoom/export button cluster — see "Renderer-owned controls"
  below), `exportSvg.ts` (PNG/JPEG/HTML export — see "Export" below).

## UX shape: sidebar editor, not in-pane edit/preview toggle

Editing a `.ntr` file happens in the **ObsTree sidebar** (`src/sidebarView.ts`), not in the main
pane — the main pane (`TreeView`) is preview-only, always showing the dendrogram, never a
textarea. This was a deliberate revision away from an earlier "Edit"/"Preview" toggle button in
the main pane: that hid the live-updating canvas while typing, which defeated the point of a
live preview. The sidebar keeps both visible side by side, similar to a chat-panel UX (text
input on the right, result in the main area).

### Sidebar binding

The sidebar is its own `WorkspaceLeaf`. If it tracked "the currently active leaf" naively,
clicking into its own textarea would immediately un-focus the main-pane `TreeView` and break the
binding. Instead, `main.ts` listens for `active-leaf-change` and only updates
`plugin.activeTreeView` when the *newly* active view is a `TreeView` — it ignores the change
when the user focuses the sidebar itself, so the binding survives. `TreeView.onClose` calls
`plugin.handleTreeViewClosed(this)` to clear the binding (and tell the sidebar to show its empty
state) if the bound file's leaf gets closed.

### Creating a tree file: two paths, deliberately different

- **Folder right-click → "New tree"** (registered via the `file-menu` workspace event, mirroring
  how Excalidraw adds "New drawing" to the same menu): the location is already known from the
  click target, so this only asks for a name (`NameModal`), then creates + opens immediately.
- **Ribbon icon / "New tree note" command / sidebar's "New Tree" button**: no implicit location,
  so these open `NewTreeModal` to ask for a folder *and* name first. The ribbon specifically only
  prompts when there's no `activeTreeView` yet — if you already have a tree focused, toggling the
  sidebar just reveals/hides it against that tree, it doesn't ask again.

### Sidebar cursor color

CM6 without the `drawSelection()` extension uses the browser's native contenteditable caret
(we don't include `drawSelection()` — no need for its cross-browser selection rendering here),
which is controlled by the CSS `caret-color` property, not a `.cm-cursor` DOM element. If you
ever add `drawSelection()`, the caret becomes a real `.cm-cursorLayer .cm-cursor` element instead
and this rule (`.obs-tree-sidebar-editor .cm-content { caret-color: ... }`) stops being what
controls it — you'd need a `.cm-cursor` rule instead. Don't add both defensively; check which one
is actually active.

### Sidebar title = renamable, shown persistently

The sidebar title (`titleTextEl`) always renders with a dotted underline plus a small pencil
icon (`titleEl`'s second child) — not just on hover — specifically because the click-to-rename
affordance wasn't discoverable without it. `bindTo()` must update `titleTextEl.setText(...)`,
never `titleEl.setText(...)` — the latter would wipe out the pencil icon span alongside the text.

### Sidebar ↔ main-pane tab switching

The sidebar can end up bound to a `.ntr` file whose tab isn't the active one anymore (user
clicked elsewhere, closed/reordered tabs, etc.) — since editing happens in the sidebar, there
was no way back to that tab short of hunting for it. The sidebar header's "reveal" button
(`arrow-up-right` icon) calls `plugin.app.workspace.revealLeaf(this.boundView.leaf)`, which is
why `TreeView`'s `leaf` (inherited from `View`, public in Obsidian's API) matters — don't make it
private when refactoring.

### CodeMirror hotkeys vs. Obsidian's global hotkeys

`SidebarEditor` wires `defaultKeymap`/`historyKeymap`/`searchKeymap` (undo/redo, Ctrl+F search,
etc.), but a CM6 keymap binding alone isn't enough to make Ctrl+F/Ctrl+Z actually win inside an
Obsidian view: Obsidian's own hotkeys are resolved via its `Scope` stack (`app.keymap`), and an
`ItemView`'s `scope` is `null` by default — an unclaimed key with no scope simply falls through
to Obsidian's global scope (its own search, etc.) regardless of what CM6's DOM-level keymap
would have done with it. (An earlier attempt tried to fix this by guessing at DOM event
capture/bubble ordering with `stopPropagation()` — that doesn't work, because Obsidian's global
hotkey resolution isn't a plain DOM listener you can out-race that way.)

The actual fix, and Obsidian's documented mechanism for exactly this situation
(`View.scope`'s doc comment): `TreeSidebarView.onOpen()` sets `this.scope = new Scope(this.app.scope)`
and explicitly registers the keys that must belong to the editor — `Mod-f`, `Mod-z`,
`Mod-Shift-z`, `Mod-y` — each calling the matching `SidebarEditor` method (`openSearch()`,
`undo()`, `redo()`) and returning `false` (Obsidian's documented signal to `preventDefault` and
stop further resolution, i.e. claim the key). Obsidian pushes a view's `scope` onto the stack
while that view is active, so this only intercepts these keys while the sidebar is focused. If a
key isn't explicitly registered here, it still falls through to Obsidian's global hotkeys as
normal — only claim what you actually need to override.

### Tab/Shift-Tab = indent/outdent, not literal indentation

The sidebar editor doesn't use `@codemirror/commands`' `indentWithTab` (which inserts a literal
tab character) — meaningless for this syntax, since depth is dash-count, not whitespace. Instead
`Tab`/`Shift-Tab` are bound to custom `indentDash`/`outdentDash` commands (`sidebarEditor.ts`)
that prepend/remove one leading `-` on every line touched by the current selection (skipping
blank lines on indent; a no-op on outdent for lines with no leading `-` to remove). This is the
direct implementation of "push selected lines one level deeper/shallower". `SidebarEditor`
exposes `indentSelection()`/`outdentSelection()` (thin wrappers calling the same command
functions directly) so the sidebar header's indent/outdent toolbar buttons trigger identical
behavior to the keyboard shortcut — don't reimplement the line-walking logic a second time for
the buttons.

### Renderer-owned controls

`DendrogramRenderer` mounts its own `DendrogramControls` (`controls.ts`) into its container —
not `TreeView`. This means the floating bottom-right D-pad/zoom/export cluster automatically
shows up identically in the main `.ntr` pane *and* inline ` ```tree ` code-block embeds, with
zero extra wiring in `ntrView.ts` or `codeBlockProcessor.ts`. `TreeView` used to render its own
top-left "Zoom to fit" button; that's gone — don't re-add page-level chrome for something the
renderer already owns. `controls.ts` imports `Menu`/`setIcon` directly from `"obsidian"` — that's
an accepted exception to "renderer doesn't know about Obsidian", since it's UI chrome, not
data/parsing logic; the parser (`src/parser.ts`) must still never import `"obsidian"`.

The nav D-pad deliberately has no background/border/shadow of its own (just `.clickable-icon`
buttons in a bare grid) — only the zoom row is a visible translucent panel
(`color-mix(in srgb, var(--background-secondary) 65%, transparent)` + `backdrop-filter: blur()`,
so it reads as a floating pill rather than an opaque box hiding the canvas underneath it). Keep
that asymmetry if you touch `styles.css`'s `.obs-tree-controls-*` rules — the D-pad getting a box
back was an earlier design that read as too heavy against the canvas.

### Export

`exportSvg.ts`'s `buildExportSvg()` clones the *current* `nodesGroup`/`linksGroup` SVG elements
(so it always matches what's rendered) into a **new, standalone SVG** sized to the full tree's
bounding box — not the current viewport/pan/zoom — with a fixed dark color palette inlined via a
`<style>` block (not Obsidian CSS variables, which don't exist outside Obsidian). PNG/JPEG export
loads that SVG into an `Image`, draws it to an offscreen `<canvas>` at 2x scale, and
`canvas.toBlob()`s it; HTML export just wraps the SVG markup in a minimal standalone page. Both
funnel through `downloadBlob()` (object-URL + synthetic `<a download>` click). If you add a new
renderer type later and want it exportable, implement `TreeRenderer.exportImage?` on it — don't
assume every renderer is SVG-based when writing shared export code.

### Root-label overrides

`settings.rootLabelOverrides` (`Record<file path, label>`) lets a user override the auto-derived
root label (H1-else-filename for markdown, filename for `.ntr`) via "Rename tree" — reachable
from a `.ntr` file's file-explorer context menu, the "Rename tree" command, or clicking the
sidebar's title. It's keyed by file path rather than stored in the file itself, per the
`.ntr`-is-plain-text rule below. One caveat: a markdown note with multiple `​```tree` blocks
shares one override across all of them (keyed by the note's path, not per-block) — an accepted
simplification since one tree per note is the common case. `TreeView.refreshRootLabel()` and
`ObsTreePlugin.refreshTreeViewsForFile()` push a changed override into any already-open views;
without that, only the next render (reopen/edit) would pick it up.

### Label wrapping

`textMeasure.ts`'s `wrapLabel()` greedily word-wraps a label to `MAX_LABEL_WIDTH` (180px),
capped at `MAX_LABEL_LINES` (3); anything past that is binary-search-truncated to an ellipsis on
the last line. It's called from two places that must never disagree:

- `layout.ts` calls it up front for every node to get each one's line count, which feeds
  `d3.tree().separation()` — the multiplier that gives multi-line nodes proportionally more
  sibling spacing than one-line nodes, so wrapped text doesn't collide with the row above/below
  (this was the original bug: fixed per-node spacing regardless of content height).
  `LEVEL_SPACING` (220px) is sized to clear `MAX_LABEL_WIDTH` plus a gap before the next depth
  level's nodes.
- `render.ts` calls it again per node to build the actual `<tspan>` lines. Truncated nodes get a
  `<title>` (native hover tooltip) and a click handler (`stopPropagation()`'d so it doesn't also
  trigger the node's own zoom-to-node click) that asks `DendrogramRenderer` to show a full-text
  popover (`showTooltip`/`closeTooltip`, dismissed on outside click or Escape).

Both call sites use the same exported constants, so if you change wrap width/line cap, change it
once in `textMeasure.ts` — never hardcode it in `layout.ts` or `render.ts`.

### Fit mode

`DendrogramRenderer.autoFit` starts `true` and stays `true` across `update()` calls (so it
re-fits automatically as nodes are added/removed while typing) until the user manually pans/
zooms (detected via `PanZoomController`'s `onUserInteraction`, which only fires for
`event.sourceEvent`-driven — i.e. real user — zoom events, never programmatic `transformTo()`
calls) or navigates to a specific node/subtree. Zooming to the *whole* tree again (Escape,
clicking the root node, or the controls cluster's "Zoom to fit" button) sets it back to `true`. See
`zoomToNodes(nodes, isFullFit)` in `DendrogramRenderer.ts` — this is the one method that both
performs a zoom and decides whether to re-arm auto-fit; every zoom call in the file goes through
it rather than touching `autoFit` directly.

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
