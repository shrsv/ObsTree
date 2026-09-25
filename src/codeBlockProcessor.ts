import { MarkdownRenderChild, TFile } from "obsidian";
import type ObsTreePlugin from "../main";
import { buildTree } from "./parser";
import { getMarkdownRootLabel } from "./rootLabel";
import { createRenderer } from "./renderers/registry";
import type { TreeRenderer } from "./renderers/types";

const DEFAULT_HEIGHT_PX = 420;
const MIN_HEIGHT_PX = 150;
const MAX_HEIGHT_PX = 2000;
const HEIGHT_DIRECTIVE = /^height:\s*(\d+)\s*$/i;

class TreeRenderChild extends MarkdownRenderChild {
	constructor(container: HTMLElement, private renderer: TreeRenderer) {
		super(container);
	}

	onunload(): void {
		this.renderer.destroy();
	}
}

/**
 * A `height: <px>` directive as the block's first non-blank line sets a custom embed height
 * (clamped, default 420px) and is stripped before the rest is parsed as the outline — this is a
 * code-block-embed-only concern, deliberately not something parser.ts knows about.
 */
function extractHeightDirective(source: string): { height: number; rest: string } {
	const lines = source.split(/\r\n|\r|\n/);
	const firstNonBlankIdx = lines.findIndex((line) => line.trim().length > 0);
	if (firstNonBlankIdx === -1) return { height: DEFAULT_HEIGHT_PX, rest: source };

	const match = HEIGHT_DIRECTIVE.exec(lines[firstNonBlankIdx].trim());
	if (!match) return { height: DEFAULT_HEIGHT_PX, rest: source };

	const height = Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, Number.parseInt(match[1], 10)));
	lines.splice(firstNonBlankIdx, 1);
	return { height, rest: lines.join("\n") };
}

export function registerTreeCodeBlockProcessor(plugin: ObsTreePlugin): void {
	plugin.registerMarkdownCodeBlockProcessor("tree", (source, el, ctx) => {
		const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
		const override = file instanceof TFile ? plugin.settings.rootLabelOverrides[file.path] : undefined;
		const rootLabel =
			override ??
			(file instanceof TFile && plugin.settings.rootLabelStrategy === "auto"
				? getMarkdownRootLabel(plugin.app, file)
				: file instanceof TFile
					? file.basename
					: "Tree");

		const { height, rest } = extractHeightDirective(source);
		const tree = buildTree(rest, rootLabel);

		const container = el.createDiv({ cls: "obs-tree-codeblock" });
		container.style.height = `${height}px`;
		if (plugin.settings.nodeTheme !== "auto") {
			container.classList.add(`obs-tree-theme-${plugin.settings.nodeTheme}`);
		}

		const renderer = createRenderer("dendrogram");
		renderer.mount(container, tree, { controlsDefaultVisible: false });

		ctx.addChild(new TreeRenderChild(container, renderer));
	});
}
