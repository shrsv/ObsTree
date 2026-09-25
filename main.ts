import { Plugin, normalizePath } from "obsidian";
import { DEFAULT_SETTINGS, ObsTreeSettings, ObsTreeSettingTab, openHotkeySettings } from "./src/settings";
import { registerTreeCodeBlockProcessor } from "./src/codeBlockProcessor";
import { TreeView, VIEW_TYPE_TREE } from "./src/ntrView";

export default class ObsTreePlugin extends Plugin {
	settings!: ObsTreeSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new ObsTreeSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_TREE, (leaf) => new TreeView(leaf, this));
		this.registerExtensions(["ntr"], VIEW_TYPE_TREE);

		registerTreeCodeBlockProcessor(this);

		this.addRibbonIcon("network", "New tree note", () => {
			void this.createTreeNote();
		});

		this.addCommand({
			id: "new-tree-note",
			name: "New tree note",
			hotkeys: [{ modifiers: ["Ctrl", "Alt", "Shift"], key: "t" }],
			callback: () => void this.createTreeNote(),
		});

		this.addCommand({
			id: "toggle-tree-preview",
			name: "Toggle tree edit/preview",
			hotkeys: [{ modifiers: ["Ctrl", "Alt", "Shift"], key: "p" }],
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(TreeView);
				if (!view) return false;
				if (!checking) view.toggleMode();
				return true;
			},
		});

		this.addCommand({
			id: "customize-hotkeys",
			name: "Customize hotkeys...",
			callback: () => openHotkeySettings(this.app),
		});
	}

	private async createTreeNote(): Promise<void> {
		const folder = this.settings.ntrDefaultFolder.trim();
		if (folder.length > 0 && !this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder).catch(() => undefined);
		}

		let name = "Untitled tree";
		let suffix = 0;
		let path = normalizePath(`${folder ? `${folder}/` : ""}${name}.ntr`);
		while (this.app.vault.getAbstractFileByPath(path)) {
			suffix += 1;
			path = normalizePath(`${folder ? `${folder}/` : ""}${name} ${suffix}.ntr`);
		}

		const file = await this.app.vault.create(path, "");
		await this.app.workspace.getLeaf(true).openFile(file);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
