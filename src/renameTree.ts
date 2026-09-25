import type { TFile } from "obsidian";
import type ObsTreePlugin from "../main";
import { NameModal } from "./nameModal";

/** Opens a name prompt and stores/clears a root-label override for `file`, then refreshes any open views. */
export function promptRenameTree(plugin: ObsTreePlugin, file: TFile): void {
	const current = plugin.settings.rootLabelOverrides[file.path] ?? file.basename;
	new NameModal(plugin.app, "Rename tree", current, async (name) => {
		if (!name || name === file.basename) {
			delete plugin.settings.rootLabelOverrides[file.path];
		} else {
			plugin.settings.rootLabelOverrides[file.path] = name;
		}
		await plugin.saveSettings();
		plugin.refreshTreeViewsForFile(file);
	}).open();
}
