import { hierarchy, tree, type HierarchyPointNode, type HierarchyPointLink } from "d3-hierarchy";
import type { TreeNode } from "../../parser";

export interface LayoutResult {
	nodes: HierarchyPointNode<TreeNode>[];
	links: HierarchyPointLink<TreeNode>[];
}

// First value = spacing between sibling nodes (rendered as the vertical axis);
// second value = spacing between depth levels (rendered as the horizontal axis).
// Swapping x/y at render time turns d3's default top-down tree into the
// left-to-right dendrogram layout matched to the notes2tree reference.
const SIBLING_SPACING = 28;
const LEVEL_SPACING = 180;

export function layoutTree(data: TreeNode): LayoutResult {
	const root = hierarchy(data, (d) => d.children);
	const layout = tree<TreeNode>().nodeSize([SIBLING_SPACING, LEVEL_SPACING]);
	const laidOut = layout(root);
	return {
		nodes: laidOut.descendants(),
		links: laidOut.links(),
	};
}
