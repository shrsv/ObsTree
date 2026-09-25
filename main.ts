import { Plugin, TFile, TFolder } from "obsidian";
import { DEFAULT_SETTINGS, ObsTreeSettings, ObsTreeSettingTab, openHotkeySettings } from "./src/settings";
import { registerTreeCodeBlockProcessor } from "./src/codeBlockProcessor";
import { TreeView, VIEW_TYPE_TREE } from "./src/ntrView";
import { TreeSidebarView, VIEW_TYPE_TREE_SIDEBAR } from "./src/sidebarView";
import { NewTreeModal } from "./src/newTreeModal";
import { NameModal } from "./src/nameModal";
import { promptRenameTree } from "./src/renameTree";
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
		// clicks into its own editor.
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				const view = leaf?.view;
				if (view instanceof TreeView) {
					this.activeTreeView = view;
					this.sidebarView?.bindTo(view);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					// Location is already known (the clicked folder), so just ask for a name —
					// mirrors how Excalidraw/Canvas add "New drawing"/"New canvas" here.
					menu.addItem((item) =>
						item
							.setTitle("New tree")
							.setIcon("network")
							.onClick(() => {
								new NameModal(this.app, "New tree", "Untitled tree", async (name) => {
									const created = await createUniqueTreeFile(this.app, file.path, name || "Untitled tree");
									await this.app.workspace.getLeaf("tab").openFile(created);
								}).open();
							})
					);
				} else if (file instanceof TFile && file.extension === "ntr") {
					menu.addItem((item) =>
						item
							.setTitle("Rename tree")
							.setIcon("pencil")
							.onClick(() => promptRenameTree(this, file))
					);
				}
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
			id: "rename-tree",
			name: "Rename tree",
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(TreeView);
				if (!view?.file) return false;
				if (!checking) promptRenameTree(this, view.file);
				return true;
			},
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

	/** Called after a root-label override changes, to refresh any open views of that file. */
	refreshTreeViewsForFile(file: TFile): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TREE)) {
			const view = leaf.view;
			if (view instanceof TreeView && view.file === file) {
				view.refreshRootLabel();
				if (this.sidebarView?.isBoundTo(view)) {
					this.sidebarView.bindTo(view);
				}
			}
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
