import type { HierarchyPointNode } from "d3-hierarchy";
import type { TreeNode } from "../../parser";
import type { TreeRenderer } from "../types";
import { layoutTree } from "./layout";
import { renderLinks, renderNodes } from "./render";
import { PanZoomController } from "./panzoom";
import { KeyboardNav } from "./keyboardNav";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
	return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

/** Path of labels from the root down to this node — used to re-find a node across re-parses, since node ids aren't stable between parses. */
function nodePath(node: HierarchyPointNode<TreeNode>): string[] {
	return node.ancestors().reverse().map((n) => n.data.label);
}

function pathsEqual(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

export class DendrogramRenderer implements TreeRenderer {
	readonly id = "dendrogram";
	readonly label = "Dendrogram";

	private container!: HTMLElement;
	private svg!: SVGSVGElement;
	private linksGroup!: SVGGElement;
	private nodesGroup!: SVGGElement;
	private panZoom!: PanZoomController;
	private keyboardNav = new KeyboardNav();
	private nodesById = new Map<string, SVGGElement>();
	private currentNodes: HierarchyPointNode<TreeNode>[] = [];
	private lastFocusedPath: string[] | null = null;
	/**
	 * "Fit mode": on by default, and stays on across re-renders (new/removed nodes keep
	 * getting auto-fitted) until the user manually pans/zooms or navigates to a specific
	 * node/subtree. Re-enabled by zooming to the whole tree again (Escape, clicking the
	 * root node, or the "Zoom to fit" button).
	 */
	private autoFit = true;
	private tooltipEl: HTMLElement | null = null;

	mount(container: HTMLElement, tree: TreeNode): void {
		this.container = container;
		container.classList.add("obs-tree-dendrogram");

		this.svg = svgEl("svg");
		this.svg.setAttribute("class", "obs-tree-svg");
		this.svg.setAttribute("tabindex", "0");
		container.appendChild(this.svg);

		const zoomGroup = svgEl("g");
		zoomGroup.setAttribute("class", "obs-tree-zoom-group");
		this.svg.appendChild(zoomGroup);

		this.linksGroup = svgEl("g");
		this.linksGroup.setAttribute("class", "obs-tree-links");
		zoomGroup.appendChild(this.linksGroup);

		this.nodesGroup = svgEl("g");
		this.nodesGroup.setAttribute("class", "obs-tree-nodes");
		zoomGroup.appendChild(this.nodesGroup);

		this.panZoom = new PanZoomController(this.svg, zoomGroup, {
			onUserInteraction: () => {
				this.autoFit = false;
			},
		});
		this.svg.addEventListener("keydown", this.onKeyDown);

		this.renderTree(tree, true);
	}

	update(tree: TreeNode): void {
		this.renderTree(tree, false);
	}

	focusNode(nodeId: string): void {
		const node = this.currentNodes.find((n) => n.data.id === nodeId);
		if (node) this.focusAndZoom(node);
	}

	destroy(): void {
		this.closeTooltip();
		this.svg.removeEventListener("keydown", this.onKeyDown);
		this.panZoom.destroy();
		while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
	}

	private renderTree(tree: TreeNode, isInitial: boolean): void {
		this.closeTooltip();
		const { nodes, links } = layoutTree(tree);
		this.currentNodes = nodes;
		this.keyboardNav.setNodes(nodes);

		renderLinks(this.linksGroup, links);
		this.nodesById = renderNodes(
			this.nodesGroup,
			nodes,
			(nodeId) => {
				const target = nodes.find((n) => n.data.id === nodeId);
				if (target) this.focusAndZoom(target);
			},
			(fullText, clientX, clientY) => this.showTooltip(fullText, clientX, clientY)
		);

		let toFocus = nodes[0];
		if (this.lastFocusedPath) {
			const match = nodes.find((n) => pathsEqual(nodePath(n), this.lastFocusedPath!));
			if (match) toFocus = match;
		}
		if (toFocus) {
			this.keyboardNav.focusId(toFocus.data.id);
			this.applyFocusStyles(toFocus.data.id);
		}

		if (isInitial || this.autoFit) {
			this.zoomToNodes(nodes, true);
		}
	}

	private onKeyDown = (event: KeyboardEvent): void => {
		let target: HierarchyPointNode<TreeNode> | undefined;
		switch (event.key) {
			case "ArrowDown":
				target = this.keyboardNav.moveDown();
				break;
			case "ArrowUp":
				target = this.keyboardNav.moveUp();
				break;
			case "ArrowLeft":
				target = this.keyboardNav.moveToParent();
				break;
			case "ArrowRight":
				target = this.keyboardNav.moveToFirstChild();
				break;
			case "Enter":
			case " ": {
				const focused = this.keyboardNav.getFocused();
				if (focused) this.zoomToNodes(focused.descendants(), focused.data.id === "root");
				event.preventDefault();
				return;
			}
			case "Escape":
				this.zoomToNodes(this.currentNodes, true);
				event.preventDefault();
				return;
			default:
				return;
		}
		if (target) {
			event.preventDefault();
			this.applyFocusStyles(target.data.id);
		}
	};

	private focusAndZoom(node: HierarchyPointNode<TreeNode>): void {
		this.keyboardNav.focusId(node.data.id);
		this.applyFocusStyles(node.data.id);
		this.zoomToNodes(node.descendants(), node.data.id === "root");
	}

	private applyFocusStyles(id: string): void {
		for (const [nodeId, el] of this.nodesById) {
			el.classList.toggle("obs-tree-node-focused", nodeId === id);
		}
		const node = this.currentNodes.find((n) => n.data.id === id);
		this.lastFocusedPath = node ? nodePath(node) : null;
	}

	/** Full-text popover for a truncated (ellipsis-wrapped) node label — dismissed on outside click or Escape. */
	private showTooltip(text: string, clientX: number, clientY: number): void {
		this.closeTooltip();

		const rect = this.container.getBoundingClientRect();
		const el = document.createElement("div");
		el.className = "obs-tree-tooltip";
		el.textContent = text;
		this.container.appendChild(el);
		this.tooltipEl = el;

		const left = Math.min(clientX - rect.left + 12, Math.max(0, rect.width - el.offsetWidth - 8));
		const top = Math.min(clientY - rect.top + 12, Math.max(0, rect.height - el.offsetHeight - 8));
		el.style.left = `${Math.max(0, left)}px`;
		el.style.top = `${Math.max(0, top)}px`;

		window.setTimeout(() => document.addEventListener("mousedown", this.onOutsideClick), 0);
		document.addEventListener("keydown", this.onTooltipKeyDown);
	}

	private closeTooltip(): void {
		if (!this.tooltipEl) return;
		this.tooltipEl.remove();
		this.tooltipEl = null;
		document.removeEventListener("mousedown", this.onOutsideClick);
		document.removeEventListener("keydown", this.onTooltipKeyDown);
	}

	private onOutsideClick = (event: MouseEvent): void => {
		if (this.tooltipEl && !this.tooltipEl.contains(event.target as Node)) {
			this.closeTooltip();
		}
	};

	private onTooltipKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") this.closeTooltip();
	};

	/** isFullFit=true both fits `nodes` now and (re-)enables auto-fit for future updates. */
	private zoomToNodes(nodes: HierarchyPointNode<TreeNode>[], isFullFit: boolean): void {
		this.autoFit = isFullFit;
		this.zoomTo(nodes);
	}

	private zoomTo(nodes: HierarchyPointNode<TreeNode>[]): void {
		if (nodes.length === 0) return;
		const rect = this.container.getBoundingClientRect();
		const width = rect.width || 600;
		const height = rect.height || 400;

		const xs = nodes.map((n) => n.y);
		const ys = nodes.map((n) => n.x);
		const minX = Math.min(...xs) - 40;
		const maxX = Math.max(...xs) + 200; // room for a node's own wrapped label (MAX_LABEL_WIDTH) plus padding
		const minY = Math.min(...ys) - 30;
		const maxY = Math.max(...ys) + 30;

		const boxW = Math.max(maxX - minX, 1);
		const boxH = Math.max(maxY - minY, 1);
		const scale = Math.min(4, Math.max(0.1, Math.min(width / boxW, height / boxH)));

		const cx = (minX + maxX) / 2;
		const cy = (minY + maxY) / 2;
		const translateX = width / 2 - cx * scale;
		const translateY = height / 2 - cy * scale;

		this.panZoom.transformTo(translateX, translateY, scale);
	}
}
