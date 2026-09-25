import { hierarchy, tree, type HierarchyPointNode, type HierarchyPointLink } from "d3-hierarchy";
import type { TreeNode } from "../../parser";
import { wrapLabel, MAX_LABEL_WIDTH, MAX_LABEL_LINES } from "./textMeasure";

export interface LayoutResult {
	nodes: HierarchyPointNode<TreeNode>[];
	links: HierarchyPointLink<TreeNode>[];
}

// First value = base spacing between sibling nodes (rendered as the vertical axis) for a
// single-line label; second value = spacing between depth levels (rendered as the
// horizontal axis) — wide enough to fit MAX_LABEL_WIDTH's wrapped text plus a gap before
// the next depth level's nodes. Swapping x/y at render time turns d3's default top-down
// tree into the left-to-right dendrogram layout matched to the notes2tree reference.
const SIBLING_SPACING = 28;
const LEVEL_SPACING = 220;

function countLabelLines(node: TreeNode): number {
	return wrapLabel(node.label, MAX_LABEL_WIDTH, MAX_LABEL_LINES).lines.length || 1;
}

export function layoutTree(data: TreeNode): LayoutResult {
	// Wrapped multi-line labels need proportionally more vertical room than a one-line
	// label, or adjacent branches' text collides (this is what squished the original
	// layout). d3's separation() lets each pair of adjacent nodes scale the base sibling
	// spacing by a multiplier — here, the average line count of the two.
	const lineCounts = new Map<string, number>();
	const collectLineCounts = (node: TreeNode): void => {
		lineCounts.set(node.id, countLabelLines(node));
		node.children.forEach(collectLineCounts);
	};
	collectLineCounts(data);

	const root = hierarchy(data, (d) => d.children);
	const layout = tree<TreeNode>()
		.nodeSize([SIBLING_SPACING, LEVEL_SPACING])
		.separation((a, b) => {
			const heightFactor = ((lineCounts.get(a.data.id) ?? 1) + (lineCounts.get(b.data.id) ?? 1)) / 2;
			return (a.parent === b.parent ? 1 : 1.5) * heightFactor;
		});
	const laidOut = layout(root);
	return {
		nodes: laidOut.descendants(),
		links: laidOut.links(),
	};
}
