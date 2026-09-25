import type { App, TFile } from "obsidian";

/** Root label for the ```tree code-block path: first H1 in the note, else the filename. */
export function getMarkdownRootLabel(app: App, file: TFile): string {
	const headings = app.metadataCache.getFileCache(file)?.headings;
	const h1 = headings?.find((h) => h.level === 1);
	return h1 ? h1.heading : file.basename;
}
