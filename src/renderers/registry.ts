import type { TreeRenderer } from "./types";
import { DendrogramRenderer } from "./dendrogram/DendrogramRenderer";

export type RendererId = "dendrogram";

const factories: Record<RendererId, () => TreeRenderer> = {
	dendrogram: () => new DendrogramRenderer(),
};

export function createRenderer(id: RendererId): TreeRenderer {
	return factories[id]();
}
