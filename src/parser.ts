export interface TreeNode {
	id: string;
	label: string;
	depth: number;
	children: TreeNode[];
}

interface StackEntry {
	node: TreeNode;
	dashDepth: number;
}

let counter = 0;
function nextId(): string {
	counter += 1;
	return `n${counter}`;
}

const DASH_LINE = /^(-+)\s*(.*)$/;

/** Parses a dash-indented outline into a forest of top-level nodes (no synthetic root). */
export function parseOutlineToForest(source: string): TreeNode[] {
	const roots: TreeNode[] = [];
	const stack: StackEntry[] = [];

	const lines = source.split(/\r\n|\r|\n/);
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (line.length === 0) continue;

		const match = DASH_LINE.exec(line);
		const dashDepth = match ? match[1].length : 0;
		const label = match ? match[2].trim() : line;

		const node: TreeNode = { id: nextId(), label, depth: 0, children: [] };

		while (stack.length > 0 && stack[stack.length - 1].dashDepth >= dashDepth) {
			stack.pop();
		}

		if (stack.length === 0) {
			roots.push(node);
		} else {
			stack[stack.length - 1].node.children.push(node);
		}

		stack.push({ node, dashDepth });
	}

	assignDepths(roots, 0);
	return roots;
}

function assignDepths(nodes: TreeNode[], depth: number): void {
	for (const node of nodes) {
		node.depth = depth;
		assignDepths(node.children, depth + 1);
	}
}

/** Parses the outline and wraps it under a synthetic root node with the given label. */
export function buildTree(source: string, rootLabel: string): TreeNode {
	const children = parseOutlineToForest(source);
	const root: TreeNode = { id: "root", label: rootLabel, depth: 0, children };
	assignDepths(children, 1);
	return root;
}
