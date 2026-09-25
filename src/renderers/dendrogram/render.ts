import { linkHorizontal } from "d3-shape";
import type { HierarchyPointNode, HierarchyPointLink } from "d3-hierarchy";
import type { TreeNode } from "../../parser";
import { wrapLabel, MAX_LABEL_WIDTH, MAX_LABEL_LINES } from "./textMeasure";

const SVG_NS = "http://www.w3.org/2000/svg";
const LINE_HEIGHT_EM = 1.15;
const BASELINE_OFFSET_EM = 0.32; // matches the single-line vertical-centering used before wrapping existed

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
	onActivate: (nodeId: string) => void,
	onExpand: (fullText: string, clientX: number, clientY: number) => void
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

		const { lines, truncated } = wrapLabel(node.data.label, MAX_LABEL_WIDTH, MAX_LABEL_LINES);

		const text = svgEl("text");
		text.setAttribute("class", "obs-tree-node-label");
		if (truncated) text.classList.add("obs-tree-node-label-truncated");

		const startDy = BASELINE_OFFSET_EM - ((lines.length - 1) / 2) * LINE_HEIGHT_EM;
		lines.forEach((line, i) => {
			const tspan = svgEl("tspan");
			tspan.setAttribute("x", "8");
			tspan.setAttribute("dy", `${i === 0 ? startDy : LINE_HEIGHT_EM}em`);
			tspan.textContent = line;
			text.appendChild(tspan);
		});

		if (truncated) {
			const titleEl = svgEl("title");
			titleEl.textContent = node.data.label;
			text.appendChild(titleEl);
			text.addEventListener("click", (event) => {
				event.stopPropagation();
				onExpand(node.data.label, event.clientX, event.clientY);
			});
		}

		g.appendChild(text);
		g.addEventListener("click", () => onActivate(node.data.id));

		container.appendChild(g);
		byId.set(node.data.id, g);
	}

	return byId;
}
