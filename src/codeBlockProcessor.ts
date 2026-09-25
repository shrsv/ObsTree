import { MarkdownRenderChild, TFile } from "obsidian";
import type ObsTreePlugin from "../main";
import { buildTree } from "./parser";
import { getMarkdownRootLabel } from "./rootLabel";
import { createRenderer } from "./renderers/registry";
import type { TreeRenderer } from "./renderers/types";

class TreeRenderChild extends MarkdownRenderChild {
	constructor(container: HTMLElement, private renderer: TreeRenderer) {
		super(container);
	}

	onunload(): void {
		this.renderer.destroy();
	}
}

export function registerTreeCodeBlockProcessor(plugin: ObsTreePlugin): void {
	plugin.registerMarkdownCodeBlockProcessor("tree", (source, el, ctx) => {
		const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
		const rootLabel =
			file instanceof TFile && plugin.settings.rootLabelStrategy === "auto"
				? getMarkdownRootLabel(plugin.app, file)
				: file instanceof TFile
					? file.basename
					: "Tree";

		const tree = buildTree(source, rootLabel);

		const container = el.createDiv({ cls: "obs-tree-codeblock" });
		if (plugin.settings.nodeTheme !== "auto") {
			container.classList.add(`obs-tree-theme-${plugin.settings.nodeTheme}`);
		}

		const renderer = createRenderer("dendrogram");
		renderer.mount(container, tree);

		ctx.addChild(new TreeRenderChild(container, renderer));
	});
}
