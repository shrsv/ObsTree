import type { TreeNode } from "../parser";

export interface TreeRenderer {
	readonly id: string;
	readonly label: string;
	mount(container: HTMLElement, tree: TreeNode): void;
	update(tree: TreeNode): void;
	focusNode?(nodeId: string): void;
	destroy(): void;
}
