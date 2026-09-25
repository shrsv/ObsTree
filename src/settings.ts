import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsTreePlugin from "../main";

export interface ObsTreeSettings {
	ntrDefaultFolder: string;
	rootLabelStrategy: "auto" | "filename";
	nodeTheme: "auto" | "dark" | "light";
	debounceMs: number;
}

export const DEFAULT_SETTINGS: ObsTreeSettings = {
	ntrDefaultFolder: "",
	rootLabelStrategy: "auto",
	nodeTheme: "auto",
	debounceMs: 200,
};

// Obsidian doesn't expose a public API for a plugin to jump straight into its own
// hotkey binding, so this reaches into the internal (undocumented) Setting tab
// APIs most plugins already rely on for this. Best-effort: degrades to just
// opening the Hotkeys tab if the internal shape ever changes.
export function openHotkeySettings(app: App): void {
	try {
		const setting = (app as any).setting;
		setting.open();
		setting.openTabById("hotkeys");
		const tab = setting.activeTab;
		if (tab?.searchComponent) {
			tab.searchComponent.setValue("ObsTree");
			tab.searchComponent.onChanged?.();
			tab.searchComponent.inputEl?.dispatchEvent(new Event("input"));
		}
	} catch (err) {
		console.error("ObsTree: failed to open hotkey settings", err);
	}
}

export class ObsTreeSettingTab extends PluginSettingTab {
	plugin: ObsTreePlugin;

	constructor(app: App, plugin: ObsTreePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "ObsTree settings" });

		new Setting(containerEl)
			.setName("Default folder for new tree notes")
			.setDesc("Vault-relative folder where 'New tree note' creates .ntr files. Leave blank for the vault root.")
			.addText((text) =>
				text
					.setPlaceholder("Trees")
					.setValue(this.plugin.settings.ntrDefaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.ntrDefaultFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Root label")
			.setDesc(
				"For ```tree code blocks in markdown notes: use the note's first H1 heading when present, else the filename. .ntr files always use the filename."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "H1, else filename")
					.addOption("filename", "Always filename")
					.setValue(this.plugin.settings.rootLabelStrategy)
					.onChange(async (value) => {
						this.plugin.settings.rootLabelStrategy = value as "auto" | "filename";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Node theme")
			.setDesc(
				"'Auto' reads Obsidian's current theme colors. 'Dark'/'Light' force a fixed palette regardless of Obsidian's theme."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "Auto (match Obsidian theme)")
					.addOption("dark", "Always dark")
					.addOption("light", "Always light")
					.setValue(this.plugin.settings.nodeTheme)
					.onChange(async (value) => {
						this.plugin.settings.nodeTheme = value as "auto" | "dark" | "light";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Live update delay")
			.setDesc("Milliseconds to wait after you stop typing before the preview re-renders.")
			.addText((text) =>
				text
					.setPlaceholder("200")
					.setValue(String(this.plugin.settings.debounceMs))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						this.plugin.settings.debounceMs = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SETTINGS.debounceMs;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Keyboard shortcuts")
			.setDesc("Customize the 'New tree note' and 'Toggle ObsTree sidebar' shortcuts.")
			.addButton((btn) =>
				btn.setButtonText("Customize hotkeys").onClick(() => {
					openHotkeySettings(this.app);
				})
			);

		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Pan, zoom, and arrow-key node navigation are handled inside the tree canvas itself and aren't rebindable here.",
		});
	}
}
