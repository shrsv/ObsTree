// Kept in one place so layout.ts (which needs line counts to size vertical spacing) and
// render.ts (which builds the actual <tspan> lines) always wrap identically.
export const MAX_LABEL_WIDTH = 180;
export const MAX_LABEL_LINES = 3;

const LABEL_FONT = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
	if (!measureCtx) {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("ObsTree: 2d canvas context unavailable for text measurement");
		measureCtx = ctx;
	}
	measureCtx.font = LABEL_FONT;
	return measureCtx;
}

export interface WrappedLabel {
	lines: string[];
	truncated: boolean;
}

/** Greedy word-wrap to `maxWidthPx`, capped at `maxLines` with the overflow ellipsis-truncated onto the last line. */
export function wrapLabel(text: string, maxWidthPx: number = MAX_LABEL_WIDTH, maxLines: number = MAX_LABEL_LINES): WrappedLabel {
	if (!text) return { lines: [""], truncated: false };

	const ctx = getMeasureContext();
	const words = text.split(/\s+/).filter(Boolean);

	const allLines: string[] = [];
	let current = "";
	for (const word of words) {
		const attempt = current ? `${current} ${word}` : word;
		if (current && ctx.measureText(attempt).width > maxWidthPx) {
			allLines.push(current);
			current = word;
		} else {
			current = attempt;
		}
	}
	if (current) allLines.push(current);
	if (allLines.length === 0) allLines.push("");

	if (allLines.length <= maxLines) {
		return { lines: allLines, truncated: false };
	}

	const visible = allLines.slice(0, maxLines);
	const remainder = allLines.slice(maxLines).join(" ");
	visible[maxLines - 1] = truncateToWidth(ctx, `${visible[maxLines - 1]} ${remainder}`.trim(), maxWidthPx);
	return { lines: visible, truncated: true };
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidthPx: number): string {
	const ellipsis = "…";
	if (ctx.measureText(text).width <= maxWidthPx) return text;

	let lo = 0;
	let hi = text.length;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		const candidate = `${text.slice(0, mid).trimEnd()}${ellipsis}`;
		if (ctx.measureText(candidate).width <= maxWidthPx) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}
	return `${text.slice(0, lo).trimEnd()}${ellipsis}`;
}
