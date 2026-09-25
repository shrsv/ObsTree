import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, highlightActiveLine, highlightActiveLineGutter, lineNumbers, type Command } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";

export interface SidebarEditorOptions {
	onChange: (text: string) => void;
}

function forEachSelectedLine(view: EditorView, fn: (line: ReturnType<EditorView["state"]["doc"]["line"]>) => void): void {
	const seen = new Set<number>();
	for (const range of view.state.selection.ranges) {
		const startLine = view.state.doc.lineAt(range.from).number;
		const endLine = view.state.doc.lineAt(range.to).number;
		for (let ln = startLine; ln <= endLine; ln++) {
			if (seen.has(ln)) continue;
			seen.add(ln);
			fn(view.state.doc.line(ln));
		}
	}
}

/** Tab: prepend "-" to every selected line, i.e. push it one level deeper. Blank lines are skipped. */
const indentDash: Command = (view) => {
	const changes: { from: number; insert: string }[] = [];
	forEachSelectedLine(view, (line) => {
		if (line.text.trim().length === 0) return;
		changes.push({ from: line.from, insert: "-" });
	});
	if (changes.length === 0) return false;
	view.dispatch({ changes, scrollIntoView: true });
	return true;
};

/** Shift-Tab: remove one leading "-" from every selected line, i.e. pull it one level shallower. */
const outdentDash: Command = (view) => {
	const changes: { from: number; to: number }[] = [];
	forEachSelectedLine(view, (line) => {
		if (line.text.startsWith("-")) {
			changes.push({ from: line.from, to: line.from + 1 });
		}
	});
	if (changes.length === 0) return false;
	view.dispatch({ changes, scrollIntoView: true });
	return true;
};

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
			keymap.of([{ key: "Tab", run: indentDash, shift: outdentDash }, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
			EditorView.lineWrapping,
			updateListener,
		];

		this.view = new EditorView({
			state: EditorState.create({ doc: initialText, extensions }),
			parent,
		});

		// Obsidian's own global hotkeys (Ctrl+F search, Ctrl+Z undo, etc.) listen on
		// document and would otherwise steal these keys before CM6's bubble-phase
		// handling on its own DOM gets a chance — once CM6 has handled a key (and thus
		// called preventDefault on it), stop it from bubbling any further.
		this.view.dom.addEventListener("keydown", (event) => {
			if (event.defaultPrevented) event.stopPropagation();
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
