import { Modal, Setting } from "obsidian";
import type ObsTreePlugin from "../main";
import { createUniqueTreeFile } from "./createTree";

/** Asks where (folder) and what (name) a new tree file should be, then creates and opens it. */
export class NewTreeModal extends Modal {
	private folder: string;
	private name = "Untitled tree";

	constructor(private plugin: ObsTreePlugin, defaultFolder: string) {
		super(plugin.app);
		this.folder = defaultFolder;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "New tree" });

		let nameInputEl: HTMLInputElement | undefined;

		new Setting(contentEl)
			.setName("Folder")
			.setDesc("Vault-relative folder. Leave blank for the vault root; missing folders are created.")
			.addText((text) => {
				text.setPlaceholder("Trees").setValue(this.folder).onChange((value) => (this.folder = value));
			});

		new Setting(contentEl).setName("Name").addText((text) => {
			nameInputEl = text.inputEl;
			text.setValue(this.name).onChange((value) => (this.name = value));
			text.inputEl.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter") {
					evt.preventDefault();
					void this.submit();
				}
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Create")
				.setCta()
				.onClick(() => void this.submit())
		);

		window.setTimeout(() => {
			nameInputEl?.focus();
			nameInputEl?.select();
		}, 0);
	}

	private async submit(): Promise<void> {
		const file = await createUniqueTreeFile(this.plugin.app, this.folder, this.name);
		this.close();
		await this.plugin.app.workspace.getLeaf("tab").openFile(file);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
