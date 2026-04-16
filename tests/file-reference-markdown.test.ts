import { describe, expect, it } from "vitest";
import { __INTERNAL__ } from "@/features/quickChat/components/file-reference-markdown";

describe("file-reference-markdown", () => {
	it("linkifies file:line references in plain text", () => {
		const nodes = __INTERNAL__.linkifyTextNode(
			"请查看 electron/utils/token-usage.ts:92 并修复。",
		);

		expect(nodes).not.toBeNull();
		const linkNode = nodes?.find((node) => node.type === "link");
		expect(linkNode).toBeDefined();
		expect(linkNode?.url).toContain("path=electron%2Futils%2Ftoken-usage.ts");
		expect(linkNode?.url).toContain("line=92");
	});

	it("linkifies file:line references wrapped by full-width quotes", () => {
		const nodes = __INTERNAL__.linkifyTextNode(
			"建议看“electron/utils/token-usage.ts:92”这个位置。",
		);

		const linkNode = nodes?.find((node) => node.type === "link");
		expect(linkNode).toBeDefined();
		expect(linkNode?.url).toContain("line=92");
	});

	it("does not linkify file-like text inside urls", () => {
		const nodes = __INTERNAL__.linkifyTextNode(
			"https://example.com/electron/utils/token-usage.ts:92",
		);

		expect(nodes).toBeNull();
	});

	it("builds and parses custom file-reference href", () => {
		const href = __INTERNAL__.buildFileReferenceHref({
			filePath: "electron/utils/token-usage.ts",
			line: 92,
			column: 3,
		});

		expect(__INTERNAL__.parseFileReferenceHref(href)).toEqual({
			filePath: "electron/utils/token-usage.ts",
			line: 92,
			column: 3,
		});
	});

	it("parses exact inline-code style file references", () => {
		expect(
			__INTERNAL__.parseExactFileReference("electron/utils/token-usage.ts:92"),
		).toEqual({
			filePath: "electron/utils/token-usage.ts",
			line: 92,
			column: undefined,
		});
	});

	it("resolves relative paths against workspace root", () => {
		expect(
			__INTERNAL__.resolveReferencePath(
				"electron/utils/token-usage.ts",
				"/Users/dev/workspace",
			),
		).toBe("/Users/dev/workspace/electron/utils/token-usage.ts");
	});

	it("normalizes absolute windows-style path separators", () => {
		expect(__INTERNAL__.resolveReferencePath("C:\\repo\\src\\index.ts")).toBe(
			"C:/repo/src/index.ts",
		);
	});
});
