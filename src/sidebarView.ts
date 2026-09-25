import { ItemView, Scope, WorkspaceLeaf, setIcon } from "obsidian";
import type ObsTreePlugin from "../main";
import type { TreeView } from "./ntrView";
import { NewTreeModal } from "./newTreeModal";
import { promptRenameTree } from "./renameTree";
import { SidebarEditor } from "./sidebarEditor";

export const VIEW_TYPE_TREE_SIDEBAR = "obs-tree-sidebar";

/**
 * Right-sidebar editor panel. Binds to whichever TreeView was most recently the active
 * leaf (see main.ts's active-leaf-change handler) and edits it live — no separate
 * edit/preview mode in the main pane, this sidebar *is* the editor.
 */
export class TreeSidebarView extends ItemView {
	private boundView: TreeView | null = null;
	private titleEl!: HTMLElement;
	private titleTextEl!: HTMLElement;
	private revealButton!: HTMLElement;
	private emptyEl!: HTMLElement;
	private editorContainer!: HTMLElement;
	private editor: SidebarEditor | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: ObsTreePlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_TREE_SIDEBAR;
	}

	getDisplayText(): string {
		return "ObsTree";
	}

	getIcon(): string {
		return "network";
	}

	async onOpen(): Promise<void> {
		this.plugin.sidebarView = this;

		// Obsidian's global hotkeys (Ctrl+F for its own search, Ctrl+Z/Y for undo/redo)
		// otherwise win over CM6's own handling of the same keys while this view has
		// focus, since an unclaimed key in a view's scope falls through to the global
		// scope. Claiming them here (Obsidian's documented mechanism for this exact
		// situation) makes them run the CM6 editor's own commands instead.
		this.scope = new Scope(this.app.scope);
		this.scope.register(["Mod"], "f", () => {
			if (!this.editor) return;
			this.editor.openSearch();
			return false;
		});
		this.scope.register(["Mod"], "z", () => {
			if (!this.editor) return;
			this.editor.undo();
			return false;
		});
		this.scope.register(["Mod", "Shift"], "z", () => {
			if (!this.editor) return;
			this.editor.redo();
			return false;
		});
		this.scope.register(["Mod"], "y", () => {
			if (!this.editor) return;
			this.editor.redo();
			return false;
		});

		const container = this.contentEl;
		container.empty();
		container.addClass("obs-tree-sidebar");

		const header = container.createDiv({ cls: "obs-tree-sidebar-header" });

		this.titleEl = header.createDiv({ cls: "obs-tree-sidebar-title" });
		this.titleEl.setAttribute("aria-label", "Click to rename this tree");
		this.titleTextEl = this.titleEl.createSpan({ cls: "obs-tree-sidebar-title-text", text: "No tree open" });
		const pencil = this.titleEl.createSpan({ cls: "obs-tree-sidebar-title-pencil" });
		setIcon(pencil, "pencil");
		this.titleEl.addEventListener("click", () => {
			if (this.boundView?.file) promptRenameTree(this.plugin, this.boundView.file);
		});

		const actions = header.createDiv({ cls: "obs-tree-sidebar-actions" });

		const outdentButton = actions.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Outdent selected lines (Shift-Tab)" },
		});
		setIcon(outdentButton, "outdent");
		outdentButton.addEventListener("click", () => {
			this.editor?.outdentSelection();
			this.editor?.focus();
		});

		const indentButton = actions.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Indent selected lines (Tab)" },
		});
		setIcon(indentButton, "indent");
		indentButton.addEventListener("click", () => {
			this.editor?.indentSelection();
			this.editor?.focus();
		});

		this.revealButton = actions.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Open this tree's tab" },
		});
		setIcon(this.revealButton, "arrow-up-right");
		this.revealButton.addEventListener("click", () => {
			if (this.boundView) this.plugin.app.workspace.revealLeaf(this.boundView.leaf);
		});

		const newButton = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "New tree" } });
		setIcon(newButton, "plus");
		newButton.addEventListener("click", () => {
			new NewTreeModal(this.plugin, this.plugin.settings.ntrDefaultFolder).open();
		});

		this.emptyEl = container.createDiv({
			cls: "obs-tree-sidebar-empty",
			text: 'Open a .ntr tree file (or click "New tree") to edit it here.',
		});

		this.editorContainer = container.createDiv({ cls: "obs-tree-sidebar-editor" });

		this.bindTo(this.plugin.activeTreeView);
	}

	async onClose(): Promise<void> {
		this.editor?.destroy();
		this.editor = null;
		if (this.plugin.sidebarView === this) this.plugin.sidebarView = null;
	}

	isBoundTo(view: TreeView): boolean {
		return this.boundView === view;
	}

	/** Re-pulls text from the currently bound view (e.g. after it loads/reloads from disk). */
	syncTextFromBoundView(): void {
		if (!this.boundView || !this.editor || this.editor.hasFocus()) return; // don't clobber what the user is typing
		this.editor.setText(this.boundView.getRawText());
	}

	bindTo(view: TreeView | null): void {
		this.boundView = view;
		if (!this.titleEl) return; // view not yet mounted

		if (view) {
			this.titleTextEl.setText(view.getDisplayText());
			this.revealButton.toggleClass("obs-tree-hidden", false);
			this.editorContainer.toggleClass("obs-tree-hidden", false);
			this.emptyEl.toggleClass("obs-tree-hidden", true);

			if (!this.editor) {
				this.editor = new SidebarEditor(this.editorContainer, view.getRawText(), {
					onChange: (text) => this.boundView?.applyText(text),
				});
			} else {
				this.editor.setText(view.getRawText());
			}
		} else {
			this.titleTextEl.setText("No tree open");
			this.revealButton.toggleClass("obs-tree-hidden", true);
			this.editorContainer.toggleClass("obs-tree-hidden", true);
			this.emptyEl.toggleClass("obs-tree-hidden", false);
		}
	}
}
