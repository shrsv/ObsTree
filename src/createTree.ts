import { normalizePath, type App, type TFile } from "obsidian";

/** Creates every missing segment of a vault-relative folder path (mkdir -p). */
export async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const clean = normalizePath(folderPath ?? "");
	if (!clean || clean === "/" || clean === ".") return;

	const parts = clean.split("/").filter(Boolean);
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current).catch(() => undefined);
		}
	}
}

/** Creates a new .ntr file in `folder`, disambiguating the name if it already exists. */
export async function createUniqueTreeFile(app: App, folder: string, baseName: string): Promise<TFile> {
	await ensureFolder(app, folder);

	const cleanFolder = normalizePath(folder ?? "");
	const prefix = cleanFolder && cleanFolder !== "/" && cleanFolder !== "." ? `${cleanFolder}/` : "";
	const name = baseName.trim() || "Untitled tree";

	let suffix = 0;
	let path = normalizePath(`${prefix}${name}.ntr`);
	while (app.vault.getAbstractFileByPath(path)) {
		suffix += 1;
		path = normalizePath(`${prefix}${name} ${suffix}.ntr`);
	}

	return app.vault.create(path, "");
}
