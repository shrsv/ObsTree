import { TextFileView, WorkspaceLeaf } from "obsidian";
import type ObsTreePlugin from "../main";
import { buildTree } from "./parser";
import { debounce } from "./debounce";
import { createRenderer } from "./renderers/registry";
import type { TreeRenderer } from "./renderers/types";

export const VIEW_TYPE_TREE = "obs-tree-view";

/**
 * Preview-only .ntr view: renders the dendrogram, nothing else. Editing happens in the
 * ObsTree sidebar (see src/sidebarView.ts), which binds to whichever TreeView was most
 * recently focused and calls applyText() on every keystroke.
 */
export class TreeView extends TextFileView {
	private rawText = "";
	private canvasEl!: HTMLElement;
	private renderer: TreeRenderer | null = null;
	private scheduleRender: () => void;

	constructor(leaf: WorkspaceLeaf, private plugin: ObsTreePlugin) {
		super(leaf);
		this.scheduleRender = debounce(() => this.renderPreview(), this.plugin.settings.debounceMs);
	}

	getViewType(): string {
		return VIEW_TYPE_TREE;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "Tree";
	}

	getIcon(): string {
		return "network";
	}

	getViewData(): string {
		return this.rawText;
	}

	setViewData(data: string, clear: boolean): void {
		this.rawText = data;
		if (clear) {
			this.renderer?.destroy();
			this.renderer = null;
		}
		this.scheduleRender();
		if (this.plugin.sidebarView?.isBoundTo(this)) {
			this.plugin.sidebarView.syncTextFromBoundView();
		}
	}

	clear(): void {
		this.rawText = "";
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("obs-tree-view-root");

		const toolbar = container.createDiv({ cls: "obs-tree-toolbar" });
		const fitButton = toolbar.createEl("button", { text: "Zoom to fit" });
		fitButton.addEventListener("click", () => this.renderer?.focusNode?.("root"));

		this.canvasEl = container.createDiv({ cls: "obs-tree-view-canvas" });
		if (this.plugin.settings.nodeTheme !== "auto") {
			this.canvasEl.addClass(`obs-tree-theme-${this.plugin.settings.nodeTheme}`);
		}

		this.renderPreview();
	}

	async onClose(): Promise<void> {
		this.renderer?.destroy();
		this.renderer = null;
		this.plugin.handleTreeViewClosed(this);
	}

	// --- sidebar integration ---

	getRawText(): string {
		return this.rawText;
	}

	/** Called by the sidebar textarea on every keystroke. */
	applyText(newText: string): void {
		if (newText === this.rawText) return;
		this.rawText = newText;
		this.requestSave();
		this.scheduleRender();
	}

	private renderPreview(): void {
		const rootLabel = this.file?.basename ?? "Tree";
		const tree = buildTree(this.rawText, rootLabel);

		if (!this.renderer) {
			this.renderer = createRenderer("dendrogram");
			this.renderer.mount(this.canvasEl, tree);
		} else {
			this.renderer.update(tree);
		}
	}
}
