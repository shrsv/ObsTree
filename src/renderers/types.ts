import type { TreeNode } from "../parser";

export interface RendererMountOptions {
	/** Whether the renderer's own control cluster (nav/zoom/export) starts visible. Defaults to true. */
	controlsDefaultVisible?: boolean;
}

export interface TreeRenderer {
	readonly id: string;
	readonly label: string;
	mount(container: HTMLElement, tree: TreeNode, options?: RendererMountOptions): void;
	update(tree: TreeNode): void;
	focusNode?(nodeId: string): void;
	exportImage?(format: "png" | "jpeg" | "html"): Promise<void>;
	destroy(): void;
}
