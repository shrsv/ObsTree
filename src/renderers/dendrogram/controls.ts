import { Menu, setIcon } from "obsidian";

export interface DendrogramControlsCallbacks {
	onZoomIn(): void;
	onZoomOut(): void;
	onFit(): void;
	onNavigate(direction: "up" | "down" | "left" | "right"): void;
	onExport(format: "png" | "jpeg" | "html"): void;
}

function iconButton(parent: HTMLElement, icon: string, label: string, onClick: (event: MouseEvent) => void): HTMLElement {
	const btn = parent.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
	setIcon(btn, icon);
	btn.addEventListener("click", onClick);
	return btn;
}

/**
 * Floating bottom-right control cluster: a D-pad for keyboard-equivalent navigation + fit,
 * a zoom in/out widget with a live percentage readout, and an export menu. Owned by
 * DendrogramRenderer itself (mounted into its own container) so it's available identically
 * in the main .ntr pane and in ```tree code-block embeds, with no extra wiring needed there.
 */
export class DendrogramControls {
	private root: HTMLElement;
	private zoomLabelEl: HTMLElement;

	constructor(container: HTMLElement, callbacks: DendrogramControlsCallbacks) {
		this.root = container.createDiv({ cls: "obs-tree-controls" });

		const navRow = this.root.createDiv({ cls: "obs-tree-controls-nav" });
		navRow.createDiv({ cls: "obs-tree-controls-spacer" });
		iconButton(navRow, "chevron-up", "Move up", () => callbacks.onNavigate("up"));
		navRow.createDiv({ cls: "obs-tree-controls-spacer" });

		iconButton(navRow, "chevron-left", "Move to parent", () => callbacks.onNavigate("left"));
		iconButton(navRow, "crosshair", "Zoom to fit", () => callbacks.onFit());
		iconButton(navRow, "chevron-right", "Move to first child", () => callbacks.onNavigate("right"));

		navRow.createDiv({ cls: "obs-tree-controls-spacer" });
		iconButton(navRow, "chevron-down", "Move down", () => callbacks.onNavigate("down"));
		navRow.createDiv({ cls: "obs-tree-controls-spacer" });

		const zoomRow = this.root.createDiv({ cls: "obs-tree-controls-row" });
		iconButton(zoomRow, "minus", "Zoom out", () => callbacks.onZoomOut());
		this.zoomLabelEl = zoomRow.createSpan({ cls: "obs-tree-zoom-percent", text: "100%" });
		iconButton(zoomRow, "plus", "Zoom in", () => callbacks.onZoomIn());
		iconButton(zoomRow, "download", "Export tree...", (event) => {
			const menu = new Menu();
			menu.addItem((item) => item.setTitle("Export as PNG").setIcon("image").onClick(() => callbacks.onExport("png")));
			menu.addItem((item) => item.setTitle("Export as JPEG").setIcon("image").onClick(() => callbacks.onExport("jpeg")));
			menu.addItem((item) => item.setTitle("Export as HTML").setIcon("code-2").onClick(() => callbacks.onExport("html")));
			menu.showAtMouseEvent(event);
		});
	}

	setZoomPercent(k: number): void {
		this.zoomLabelEl.setText(`${Math.round(k * 100)}%`);
	}

	destroy(): void {
		this.root.remove();
	}
}
