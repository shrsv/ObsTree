import type { HierarchyPointNode } from "d3-hierarchy";
import type { TreeNode } from "../../parser";

const EXPORT_PADDING = 40;
// Fixed dark palette (matches the "Always dark" node-theme option) rather than the current
// Obsidian CSS-variable theme, so an exported file is self-contained and looks right when
// opened outside Obsidian, where those variables don't exist.
const EXPORT_STYLE = `
	.obs-tree-export-bg { fill: #0d0d0d; }
	.obs-tree-link { fill: none; stroke: #3a3a3a; stroke-width: 1.5px; }
	.obs-tree-node-circle { fill: #7cffb2; stroke: #0d0d0d; stroke-width: 1px; }
	.obs-tree-node-label { fill: #e8e8e8; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
`;

const SVG_NS = "http://www.w3.org/2000/svg";

/** Builds a standalone, fully self-contained SVG (fixed palette, full tree bounding box — not clipped to the current viewport/pan/zoom). */
export function buildExportSvg(
	nodesGroupEl: SVGGElement,
	linksGroupEl: SVGGElement,
	nodes: HierarchyPointNode<TreeNode>[]
): string {
	const xs = nodes.map((n) => n.y);
	const ys = nodes.map((n) => n.x);
	const minX = Math.min(...xs) - EXPORT_PADDING;
	const maxX = Math.max(...xs) + 200; // matches DendrogramRenderer's zoom-to-fit margin (room for a wrapped label)
	const minY = Math.min(...ys) - EXPORT_PADDING;
	const maxY = Math.max(...ys) + EXPORT_PADDING;
	const width = Math.max(maxX - minX, 1);
	const height = Math.max(maxY - minY, 1);

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("xmlns", SVG_NS);
	svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
	svg.setAttribute("width", String(Math.round(width)));
	svg.setAttribute("height", String(Math.round(height)));

	const style = document.createElementNS(SVG_NS, "style");
	style.textContent = EXPORT_STYLE;
	svg.appendChild(style);

	const bg = document.createElementNS(SVG_NS, "rect");
	bg.setAttribute("class", "obs-tree-export-bg");
	bg.setAttribute("x", String(minX));
	bg.setAttribute("y", String(minY));
	bg.setAttribute("width", String(width));
	bg.setAttribute("height", String(height));
	svg.appendChild(bg);

	svg.appendChild(linksGroupEl.cloneNode(true) as SVGGElement);
	svg.appendChild(nodesGroupEl.cloneNode(true) as SVGGElement);

	return new XMLSerializer().serializeToString(svg);
}

export function sanitizeFilename(label: string): string {
	const cleaned = label.trim().replace(/[\\/:*?"<>|]+/g, "-").trim();
	return cleaned.length > 0 ? cleaned : "tree";
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function downloadSvgAsHtml(svgMarkup: string, filenameBase: string): void {
	const html = `<!doctype html>\n<html><head><meta charset="utf-8"><title>${filenameBase}</title></head><body style="margin:0;background:#0d0d0d;">${svgMarkup}</body></html>\n`;
	downloadBlob(new Blob([html], { type: "text/html" }), `${filenameBase}.html`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("ObsTree: failed to load SVG for export"));
		img.src = src;
	});
}

export async function downloadSvgAsRaster(svgMarkup: string, filenameBase: string, format: "png" | "jpeg"): Promise<void> {
	const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
	const url = URL.createObjectURL(svgBlob);
	try {
		const img = await loadImage(url);
		const scale = 2; // retina-ish export
		const canvas = document.createElement("canvas");
		canvas.width = img.width * scale;
		canvas.height = img.height * scale;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("ObsTree: 2d canvas context unavailable for export");
		if (format === "jpeg") {
			ctx.fillStyle = "#0d0d0d";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		const mime = format === "png" ? "image/png" : "image/jpeg";
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.95));
		if (!blob) throw new Error("ObsTree: failed to encode exported image");
		downloadBlob(blob, `${filenameBase}.${format === "jpeg" ? "jpg" : "png"}`);
	} finally {
		URL.revokeObjectURL(url);
	}
}
