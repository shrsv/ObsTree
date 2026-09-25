import { App, Modal, Setting } from "obsidian";

/** Single-field name prompt, reused for both "New tree" (name only, folder already known) and "Rename tree". */
export class NameModal extends Modal {
	private value: string;

	constructor(app: App, private heading: string, initialValue: string, private onSubmit: (value: string) => void) {
		super(app);
		this.value = initialValue;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: this.heading });

		let inputEl: HTMLInputElement | undefined;

		new Setting(contentEl).setName("Name").addText((text) => {
			inputEl = text.inputEl;
			text.setValue(this.value).onChange((value) => (this.value = value));
			text.inputEl.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter") {
					evt.preventDefault();
					this.submit();
				}
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("OK")
				.setCta()
				.onClick(() => this.submit())
		);

		window.setTimeout(() => {
			inputEl?.focus();
			inputEl?.select();
		}, 0);
	}

	private submit(): void {
		this.close();
		this.onSubmit(this.value.trim());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
