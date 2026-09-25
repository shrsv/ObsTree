import { linkHorizontal } from "d3-shape";
import type { HierarchyPointNode, HierarchyPointLink } from "d3-hierarchy";
import type { TreeNode } from "../../parser";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
	return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

function clear(el: Element): void {
	while (el.firstChild) el.removeChild(el.firstChild);
}

// x/y swapped relative to d3's default (see layout.ts) to draw left-to-right.
const linkGenerator = linkHorizontal<unknown, HierarchyPointNode<TreeNode>>()
	.x((d) => d.y)
	.y((d) => d.x);

export function renderLinks(container: SVGGElement, links: HierarchyPointLink<TreeNode>[]): void {
	clear(container);
	for (const link of links) {
		const path = svgEl("path");
		path.setAttribute("class", "obs-tree-link");
		path.setAttribute("d", linkGenerator({ source: link.source, target: link.target }) ?? "");
		container.appendChild(path);
	}
}

export function renderNodes(
	container: SVGGElement,
	nodes: HierarchyPointNode<TreeNode>[],
	onActivate: (nodeId: string) => void
): Map<string, SVGGElement> {
	clear(container);
	const byId = new Map<string, SVGGElement>();

	for (const node of nodes) {
		const g = svgEl("g");
		g.setAttribute("class", "obs-tree-node");
		g.setAttribute("transform", `translate(${node.y},${node.x})`);
		g.dataset.nodeId = node.data.id;

		const circle = svgEl("circle");
		circle.setAttribute("class", "obs-tree-node-circle");
		circle.setAttribute("r", "4");
		g.appendChild(circle);

		const text = svgEl("text");
		text.setAttribute("class", "obs-tree-node-label");
		text.setAttribute("x", "8");
		text.setAttribute("dy", "0.32em");
		text.textContent = node.data.label;
		g.appendChild(text);

		g.addEventListener("click", () => onActivate(node.data.id));

		container.appendChild(g);
		byId.set(node.data.id, g);
	}

	return byId;
}
