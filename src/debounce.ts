export function debounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	ms: number
): (...args: Args) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Args) => {
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}
