import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";

export interface SidebarEditorOptions {
	onChange: (text: string) => void;
}

/**
 * A real CodeMirror 6 editor (the same engine Obsidian's own note editor uses) rather than a
 * plain <textarea> — gets undo/redo, selection, and Ctrl+F search for free. @codemirror/* is
 * marked external in esbuild.config.mjs, so this resolves against Obsidian's own bundled CM6 at
 * runtime rather than shipping a second copy.
 */
export class SidebarEditor {
	readonly view: EditorView;

	constructor(parent: HTMLElement, initialText: string, private options: SidebarEditorOptions) {
		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				this.options.onChange(update.state.doc.toString());
			}
		});

		const extensions: Extension[] = [
			lineNumbers(),
			highlightActiveLine(),
			highlightActiveLineGutter(),
			history(),
			search({ top: true }),
			keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
			EditorView.lineWrapping,
			updateListener,
		];

		this.view = new EditorView({
			state: EditorState.create({ doc: initialText, extensions }),
			parent,
		});
	}

	getText(): string {
		return this.view.state.doc.toString();
	}

	/** Replaces the whole document. No-ops if the text already matches, so it never clobbers an in-flight edit or resets the cursor while the user is typing. */
	setText(text: string): void {
		if (this.getText() === text) return;
		this.view.dispatch({
			changes: { from: 0, to: this.view.state.doc.length, insert: text },
		});
	}

	hasFocus(): boolean {
		return this.view.hasFocus;
	}

	focus(): void {
		this.view.focus();
	}

	destroy(): void {
		this.view.destroy();
	}
}
