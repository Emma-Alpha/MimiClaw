#!/usr/bin/env node
/**
 * tag-push.mjs
 *
 * 从 package.json 读取当前版本号，打 git tag，并推送 main + tag 到 origin。
 *
 * 用法：
 *   pnpm run tag:push           # 正常模式：tag 不存在才创建
 *   pnpm run tag:push:force     # 强制模式：覆盖已存在的 tag（-f）
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const force = process.argv.includes("--force");

// ── 读版本号 ──────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;

// ── 检查工作区 ────────────────────────────────────────────────────
const dirty = execSync("git status --porcelain", {
  encoding: "utf8",
  cwd: root,
}).trim();

if (dirty) {
  console.error(
    `[tag-push] ❌ 工作区不干净，请先 commit 所有改动后再发布 tag。\n\n${dirty}`,
  );
  process.exit(1);
}

// ── 获取当前分支 ──────────────────────────────────────────────────
const branch = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
  cwd: root,
}).trim();

console.log(`[tag-push] 当前分支: ${branch}`);
console.log(`[tag-push] 准备打 tag: ${tag}${force ? " (--force)" : ""}`);

// ── 打 tag ────────────────────────────────────────────────────────
try {
  const tagFlags = force ? "-f" : "";
  execSync(`git tag ${tagFlags} ${tag}`, { stdio: "inherit", cwd: root });
  console.log(`[tag-push] ✅ tag ${tag} 创建成功`);
} catch {
  console.error(
    `[tag-push] ❌ 打 tag 失败。若 tag 已存在，使用 pnpm run tag:push:force 覆盖。`,
  );
  process.exit(1);
}

// ── 推送 branch + tag ────────────────────────────────────────────
console.log(`[tag-push] 推送分支 ${branch} → origin ...`);
execSync(`git push origin ${branch}`, { stdio: "inherit", cwd: root });

console.log(`[tag-push] 推送 tag ${tag} → origin ...`);
const pushTagFlags = force ? "--force" : "";
execSync(`git push origin ${tag} ${pushTagFlags}`, {
  stdio: "inherit",
  cwd: root,
});

console.log(`\n[tag-push] 🎉 完成！tag ${tag} 已推送到 GitHub。`);
console.log(
  `[tag-push] GitHub Actions release 流水线应已触发（若已配置 on: push: tags: ['v*']）。`,
);
