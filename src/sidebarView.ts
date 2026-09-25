import { ItemView, WorkspaceLeaf } from "obsidian";
import type ObsTreePlugin from "../main";
import type { TreeView } from "./ntrView";
import { NewTreeModal } from "./newTreeModal";

export const VIEW_TYPE_TREE_SIDEBAR = "obs-tree-sidebar";

/**
 * Right-sidebar editor panel. Binds to whichever TreeView was most recently the active
 * leaf (see main.ts's active-leaf-change handler) and edits it live — no separate
 * edit/preview mode in the main pane, this sidebar textarea *is* the editor.
 */
export class TreeSidebarView extends ItemView {
	private boundView: TreeView | null = null;
	private titleEl!: HTMLElement;
	private emptyEl!: HTMLElement;
	private textareaEl!: HTMLTextAreaElement;

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

		const container = this.contentEl;
		container.empty();
		container.addClass("obs-tree-sidebar");

		const header = container.createDiv({ cls: "obs-tree-sidebar-header" });
		this.titleEl = header.createEl("div", { cls: "obs-tree-sidebar-title", text: "No tree open" });
		const newButton = header.createEl("button", { text: "New Tree" });
		newButton.addEventListener("click", () => {
			new NewTreeModal(this.plugin, this.plugin.settings.ntrDefaultFolder).open();
		});

		this.emptyEl = container.createDiv({
			cls: "obs-tree-sidebar-empty",
			text: 'Open a .ntr tree file (or click "New Tree") to edit it here.',
		});

		this.textareaEl = container.createEl("textarea", { cls: "obs-tree-sidebar-textarea" });
		this.textareaEl.addEventListener("input", () => {
			this.boundView?.applyText(this.textareaEl.value);
		});

		this.bindTo(this.plugin.activeTreeView);
	}

	async onClose(): Promise<void> {
		if (this.plugin.sidebarView === this) this.plugin.sidebarView = null;
	}

	isBoundTo(view: TreeView): boolean {
		return this.boundView === view;
	}

	/** Re-pulls text from the currently bound view (e.g. after it loads/reloads from disk). */
	syncTextFromBoundView(): void {
		if (!this.boundView || !this.textareaEl) return;
		if (document.activeElement === this.textareaEl) return; // don't clobber what the user is typing
		this.textareaEl.value = this.boundView.getRawText();
	}

	bindTo(view: TreeView | null): void {
		this.boundView = view;
		if (!this.titleEl) return; // view not yet mounted

		if (view) {
			this.titleEl.setText(view.getDisplayText());
			this.textareaEl.value = view.getRawText();
			this.textareaEl.toggleClass("obs-tree-hidden", false);
			this.emptyEl.toggleClass("obs-tree-hidden", true);
		} else {
			this.titleEl.setText("No tree open");
			this.textareaEl.toggleClass("obs-tree-hidden", true);
			this.emptyEl.toggleClass("obs-tree-hidden", false);
		}
	}
}
