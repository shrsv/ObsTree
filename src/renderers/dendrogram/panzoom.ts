import { select, type Selection } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import "d3-transition";

export interface PanZoomOptions {
	onTransform?: (t: ZoomTransform) => void;
	/** Fired only for user-driven pan/zoom (wheel/drag), never for programmatic transformTo(). */
	onUserInteraction?: () => void;
}

export class PanZoomController {
	private readonly behavior: ZoomBehavior<SVGSVGElement, unknown>;
	private readonly selection: Selection<SVGSVGElement, unknown, null, undefined>;

	constructor(svg: SVGSVGElement, group: SVGGElement, options: PanZoomOptions = {}) {
		this.behavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on("zoom", (event) => {
				group.setAttribute("transform", event.transform.toString());
				options.onTransform?.(event.transform);
				if (event.sourceEvent) options.onUserInteraction?.();
			});
		this.selection = select(svg);
		this.selection.call(this.behavior);
	}

	transformTo(x: number, y: number, k: number, durationMs = 280): void {
		const target = zoomIdentity.translate(x, y).scale(k);
		this.selection.transition().duration(durationMs).call(this.behavior.transform, target);
	}

	destroy(): void {
		this.selection.on(".zoom", null);
	}
}
