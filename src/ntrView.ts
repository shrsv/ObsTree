import { TextFileView, WorkspaceLeaf } from "obsidian";
import type ObsTreePlugin from "../main";
import { buildTree } from "./parser";
import { debounce } from "./debounce";
import { createRenderer } from "./renderers/registry";
import type { TreeRenderer } from "./renderers/types";

export const VIEW_TYPE_TREE = "obs-tree-view";

export class TreeView extends TextFileView {
	private rawText = "";
	private mode: "preview" | "edit" = "preview";
	private textareaEl!: HTMLTextAreaElement;
	private canvasEl!: HTMLElement;
	private modeButton!: HTMLButtonElement;
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
		this.textareaEl.value = data;
		this.scheduleRender();
	}

	clear(): void {
		this.rawText = "";
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("obs-tree-view-root");

		const toolbar = container.createDiv({ cls: "obs-tree-toolbar" });
		this.modeButton = toolbar.createEl("button", { text: "Edit" });
		this.modeButton.addEventListener("click", () => this.toggleMode());

		const fitButton = toolbar.createEl("button", { text: "Zoom to fit" });
		fitButton.addEventListener("click", () => {
			// Root node's id is always fixed ("root" — see parser.ts buildTree), so
			// focusing it zooms to its full subtree, i.e. the whole tree.
			this.renderer?.focusNode?.("root");
		});

		this.canvasEl = container.createDiv({ cls: "obs-tree-view-canvas" });
		this.textareaEl = container.createEl("textarea", { cls: "obs-tree-view-textarea" });
		this.textareaEl.addEventListener("input", () => {
			this.rawText = this.textareaEl.value;
			this.requestSave();
			this.scheduleRender();
		});

		this.setMode("preview");
	}

	async onClose(): Promise<void> {
		this.renderer?.destroy();
		this.renderer = null;
	}

	toggleMode(): void {
		this.setMode(this.mode === "preview" ? "edit" : "preview");
	}

	private setMode(mode: "preview" | "edit"): void {
		this.mode = mode;
		this.modeButton.setText(mode === "preview" ? "Edit" : "Preview");
		this.canvasEl.toggleClass("obs-tree-hidden", mode !== "preview");
		this.textareaEl.toggleClass("obs-tree-hidden", mode !== "edit");
		if (mode === "preview") this.renderPreview();
	}

	private renderPreview(): void {
		const rootLabel = this.file?.basename ?? "Tree";
		const tree = buildTree(this.rawText, rootLabel);

		this.canvasEl.toggleClass(
			`obs-tree-theme-${this.plugin.settings.nodeTheme}`,
			this.plugin.settings.nodeTheme !== "auto"
		);

		if (!this.renderer) {
			this.renderer = createRenderer("dendrogram");
			this.renderer.mount(this.canvasEl, tree);
		} else {
			this.renderer.update(tree);
		}
	}
}
