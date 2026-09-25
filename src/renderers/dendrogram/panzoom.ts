import { select, type Selection } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import "d3-transition";

export class PanZoomController {
	private readonly behavior: ZoomBehavior<SVGSVGElement, unknown>;
	private readonly selection: Selection<SVGSVGElement, unknown, null, undefined>;

	constructor(svg: SVGSVGElement, group: SVGGElement, onTransform?: (t: ZoomTransform) => void) {
		this.behavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on("zoom", (event) => {
				group.setAttribute("transform", event.transform.toString());
				onTransform?.(event.transform);
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
