import type { HierarchyPointNode } from "d3-hierarchy";
import type { TreeNode } from "../../parser";

/**
 * Flat pre-order traversal + focus state for arrow-key navigation.
 * `nodes` must already be in pre-order (this is what HierarchyNode.descendants() returns).
 */
export class KeyboardNav {
	private order: HierarchyPointNode<TreeNode>[] = [];
	private focusedId: string | null = null;

	setNodes(nodes: HierarchyPointNode<TreeNode>[]): void {
		this.order = nodes;
		if (!this.focusedId || !nodes.some((n) => n.data.id === this.focusedId)) {
			this.focusedId = nodes[0]?.data.id ?? null;
		}
	}

	getFocused(): HierarchyPointNode<TreeNode> | undefined {
		return this.order.find((n) => n.data.id === this.focusedId);
	}

	focusId(id: string): void {
		if (this.order.some((n) => n.data.id === id)) this.focusedId = id;
	}

	moveDown(): HierarchyPointNode<TreeNode> | undefined {
		return this.stepBy(1);
	}

	moveUp(): HierarchyPointNode<TreeNode> | undefined {
		return this.stepBy(-1);
	}

	moveToParent(): HierarchyPointNode<TreeNode> | undefined {
		const current = this.getFocused();
		const parent = current?.parent ?? undefined;
		if (parent) this.focusedId = parent.data.id;
		return parent;
	}

	moveToFirstChild(): HierarchyPointNode<TreeNode> | undefined {
		const current = this.getFocused();
		const child = current?.children?.[0];
		if (child) this.focusedId = child.data.id;
		return child;
	}

	private stepBy(delta: number): HierarchyPointNode<TreeNode> | undefined {
		if (this.order.length === 0) return undefined;
		const idx = this.order.findIndex((n) => n.data.id === this.focusedId);
		const nextIdx = Math.min(Math.max(idx + delta, 0), this.order.length - 1);
		const next = this.order[nextIdx];
		this.focusedId = next.data.id;
		return next;
	}
}
