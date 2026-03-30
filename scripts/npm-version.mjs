#!/usr/bin/env node
/**
 * npm version wrapper:
 * - Clean working tree → full `npm version` (commit + tag + postversion).
 * - Dirty tree → only bump package.json (--no-git-tag-version --ignore-scripts).
 */
import { execSync } from "node:child_process";

const kind = process.argv[2];
if (!["patch", "minor", "major"].includes(kind)) {
	console.error("Usage: node scripts/npm-version.mjs <patch|minor|major>");
	process.exit(1);
}

function isGitClean() {
	try {
		const out = execSync("git status --porcelain", {
			encoding: "utf8",
			cwd: process.cwd(),
		});
		return out.trim() === "";
	} catch {
		return false;
	}
}

if (isGitClean()) {
	execSync(`npm version ${kind}`, { stdio: "inherit" });
} else {
	console.warn(
		"[version] Git working tree is not clean — bumping package.json only (no commit/tag, no postversion push).",
	);
	console.warn(
		"[version] Commit your changes, then commit the version bump or run: git add package.json && git commit -m \"chore: release v…\"",
	);
	execSync(`npm version ${kind} --no-git-tag-version --ignore-scripts`, {
		stdio: "inherit",
	});
}
