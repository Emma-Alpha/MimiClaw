import { describe, expect, it } from "vitest";
import {
	extractSnippetReferencePathsFromClipboard,
	extractSnippetReferencePathsFromText,
} from "@/lib/unified-composer";

describe("extractSnippetReferencePathsFromText", () => {
	it("extracts a reference from parenthesized range wrapped in backticks", () => {
		const result = extractSnippetReferencePathsFromText(
			"`index.tsx (172-179)`\n```tsx\nconst value = 1;\n```",
		);

		expect(result).toEqual([
			{
				absolutePath: "index.tsx (172-179)",
				name: "index.tsx (172-179)",
				isDirectory: false,
			},
		]);
	});

	it("extracts a reference from plain parenthesized range", () => {
		const result = extractSnippetReferencePathsFromText(
			"index.tsx (172-179)\n```tsx\nconst value = 1;\n```",
		);

		expect(result).toEqual([
			{
				absolutePath: "index.tsx (172-179)",
				name: "index.tsx (172-179)",
				isDirectory: false,
			},
		]);
	});

	it("extracts a reference from path:line-range format", () => {
		const result = extractSnippetReferencePathsFromText(
			"src/pages/MiniChat.tsx:80-96",
		);

		expect(result).toEqual([
			{
				absolutePath: "src/pages/MiniChat.tsx (80-96)",
				name: "MiniChat.tsx (80-96)",
				isDirectory: false,
			},
		]);
	});

	it("extracts a reference from Windows absolute path with colon line-range format", () => {
		const result = extractSnippetReferencePathsFromText(
			"C:\\repo\\src\\MiniChat.tsx:80-96",
		);

		expect(result).toEqual([
			{
				absolutePath: "C:\\repo\\src\\MiniChat.tsx (80-96)",
				name: "MiniChat.tsx (80-96)",
				isDirectory: false,
			},
		]);
	});

	it("extracts a reference from #L anchor format", () => {
		const result = extractSnippetReferencePathsFromText(
			"`C:\\repo\\src\\app.tsx` #L12-L18",
		);

		expect(result).toEqual([
			{
				absolutePath: "C:\\repo\\src\\app.tsx (12-18)",
				name: "app.tsx (12-18)",
				isDirectory: false,
			},
		]);
	});

	it("normalizes ranges and deduplicates identical references", () => {
		const result = extractSnippetReferencePathsFromText(
			"- `index.tsx (19-12)`\nindex.tsx (12-19)\nindex.tsx #L12-L19",
		);

		expect(result).toEqual([
			{
				absolutePath: "index.tsx (12-19)",
				name: "index.tsx (12-19)",
				isDirectory: false,
			},
		]);
	});

	it("extracts references from full-width parentheses and single-line format", () => {
		const result = extractSnippetReferencePathsFromText(
			"src/index.tsx（57）",
		);

		expect(result).toEqual([
			{
				absolutePath: "src/index.tsx (57-57)",
				name: "index.tsx (57-57)",
				isDirectory: false,
			},
		]);
	});

	it("extracts references from markdown link format", () => {
		const result = extractSnippetReferencePathsFromText(
			"[index.tsx](src/index.tsx#L57-L68)",
		);

		expect(result).toEqual([
			{
				absolutePath: "src/index.tsx (57-68)",
				name: "index.tsx (57-68)",
				isDirectory: false,
			},
		]);
	});

	it("extracts references when line range has trailing explanatory text", () => {
		const result = extractSnippetReferencePathsFromText(
			"src/stores/code-agent.ts:717 里的 extractContextUsage",
		);

		expect(result).toEqual([
			{
				absolutePath: "src/stores/code-agent.ts (717-717)",
				name: "code-agent.ts (717-717)",
				isDirectory: false,
			},
		]);
	});

	it("ignores non-reference text", () => {
		const result = extractSnippetReferencePathsFromText(
			"hello world (1-2)\nconst test = true;",
		);
		expect(result).toEqual([]);
	});
});

describe("extractSnippetReferencePathsFromClipboard", () => {
	it("extracts a snippet reference from html file URI with hash line range", () => {
		const result = extractSnippetReferencePathsFromClipboard({
			htmlText:
				'<a href="file:///Users/liangpingbo/Desktop/4399/frontend/ai_tools/frontend/apps/nextvideo/src/pages/base/features/Quick/index.tsx#L56-L91">index.tsx (56-91)</a>',
		});

		expect(result).toEqual([
			{
				absolutePath:
					"/Users/liangpingbo/Desktop/4399/frontend/ai_tools/frontend/apps/nextvideo/src/pages/base/features/Quick/index.tsx (56-91)",
				name: "index.tsx (56-91)",
				isDirectory: false,
			},
		]);
	});

	it("extracts a snippet reference from vscode/cursor metadata payload", () => {
		const result = extractSnippetReferencePathsFromClipboard({
			plainText:
				"return (\n  <div className=\"relative flex w-full h-full flex-col overflow-hidden\">\n",
			extraTextPayloads: [
				JSON.stringify({
					resource:
						"file:///Users/liangpingbo/Desktop/4399/frontend/ai_tools/frontend/apps/nextvideo/src/pages/base/features/Quick/index.tsx",
					startLineNumber: 56,
					endLineNumber: 91,
				}),
			],
		});

		expect(result).toEqual([
			{
				absolutePath:
					"/Users/liangpingbo/Desktop/4399/frontend/ai_tools/frontend/apps/nextvideo/src/pages/base/features/Quick/index.tsx (56-91)",
				name: "index.tsx (56-91)",
				isDirectory: false,
			},
		]);
	});
});
