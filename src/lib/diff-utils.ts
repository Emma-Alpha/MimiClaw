function splitDiffLines(content: string): string[] {
	const normalized = content.replace(/\r\n?/g, '\n');
	if (!normalized) return [];
	if (normalized.endsWith('\n')) {
		return normalized.slice(0, -1).split('\n');
	}
	return normalized.split('\n');
}

function formatUnifiedRange(lineCount: number): string {
	if (lineCount === 0) return '0,0';
	return `1,${lineCount}`;
}

export function buildUnifiedPatch(
	filePath: string,
	oldContent: string,
	newContent: string,
): { patch: string; additions: number; deletions: number } {
	const oldLines = splitDiffLines(oldContent);
	const newLines = splitDiffLines(newContent);
	let additions = 0;
	let deletions = 0;

	const lines: string[] = [
		`--- a/${filePath}`,
		`+++ b/${filePath}`,
		`@@ -${formatUnifiedRange(oldLines.length)} +${formatUnifiedRange(newLines.length)} @@`,
	];
	const maxLen = Math.max(oldLines.length, newLines.length);

	for (let i = 0; i < maxLen; i++) {
		const oldLine = oldLines[i];
		const newLine = newLines[i];

		if (oldLine !== undefined && newLine !== undefined) {
			if (oldLine !== newLine) {
				lines.push(`-${oldLine}`);
				lines.push(`+${newLine}`);
				deletions++;
				additions++;
			} else {
				lines.push(` ${oldLine}`);
			}
			continue;
		}

		if (newLine !== undefined) {
			lines.push(`+${newLine}`);
			additions++;
			continue;
		}

		if (oldLine !== undefined) {
			lines.push(`-${oldLine}`);
			deletions++;
		}
	}

	return { patch: lines.join('\n'), additions, deletions };
}
