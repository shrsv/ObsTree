import { Plugin, TFolder } from "obsidian";
import { DEFAULT_SETTINGS, ObsTreeSettings, ObsTreeSettingTab, openHotkeySettings } from "./src/settings";
import { registerTreeCodeBlockProcessor } from "./src/codeBlockProcessor";
import { TreeView, VIEW_TYPE_TREE } from "./src/ntrView";
import { TreeSidebarView, VIEW_TYPE_TREE_SIDEBAR } from "./src/sidebarView";
import { NewTreeModal } from "./src/newTreeModal";
import { createUniqueTreeFile } from "./src/createTree";

export default class ObsTreePlugin extends Plugin {
	settings!: ObsTreeSettings;
	activeTreeView: TreeView | null = null;
	sidebarView: TreeSidebarView | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new ObsTreeSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_TREE, (leaf) => new TreeView(leaf, this));
		this.registerView(VIEW_TYPE_TREE_SIDEBAR, (leaf) => new TreeSidebarView(leaf, this));
		this.registerExtensions(["ntr"], VIEW_TYPE_TREE);

		registerTreeCodeBlockProcessor(this);

		// Track whichever .ntr file was most recently the active/focused leaf, so the
		// sidebar (which lives in its own leaf) knows what to edit even after the user
		// clicks into its own textarea.
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				const view = leaf?.view;
				if (view instanceof TreeView) {
					this.activeTreeView = view;
					this.sidebarView?.bindTo(view);
				}
			})
		);

		// Mirrors how Excalidraw/Canvas add "New drawing"/"New canvas" to a folder's
		// right-click menu: location is already known (the folder), so create+open
		// immediately with an auto-incremented name, no modal.
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFolder)) return;
				menu.addItem((item) =>
					item
						.setTitle("New tree")
						.setIcon("network")
						.onClick(async () => {
							const created = await createUniqueTreeFile(this.app, file.path, "Untitled tree");
							await this.app.workspace.getLeaf("tab").openFile(created);
						})
				);
			})
		);

		this.addRibbonIcon("network", "Toggle ObsTree sidebar", () => {
			void this.toggleSidebar();
		});

		this.addCommand({
			id: "new-tree-note",
			name: "New tree note",
			callback: () => new NewTreeModal(this, this.settings.ntrDefaultFolder).open(),
		});

		this.addCommand({
			id: "toggle-tree-sidebar",
			name: "Toggle ObsTree sidebar",
			hotkeys: [{ modifiers: ["Ctrl", "Alt", "Shift"], key: "t" }],
			callback: () => void this.toggleSidebar(),
		});

		this.addCommand({
			id: "customize-hotkeys",
			name: "Customize hotkeys...",
			callback: () => openHotkeySettings(this.app),
		});
	}

	handleTreeViewClosed(view: TreeView): void {
		if (this.activeTreeView === view) {
			this.activeTreeView = null;
			this.sidebarView?.bindTo(null);
		}
	}

	/**
	 * Toggles the sidebar open/closed. If it opens with no tree currently focused (no
	 * .ntr file has been active yet this session), prompts for where to create one —
	 * there's no implicit location the way a folder right-click has one.
	 */
	private async toggleSidebar(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TREE_SIDEBAR);
		if (existing.length > 0) {
			for (const leaf of existing) leaf.detach();
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: VIEW_TYPE_TREE_SIDEBAR, active: true });
		this.app.workspace.revealLeaf(leaf);

		if (!this.activeTreeView) {
			new NewTreeModal(this, this.settings.ntrDefaultFolder).open();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
