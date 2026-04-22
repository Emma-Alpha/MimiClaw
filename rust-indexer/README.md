# File Indexer - Rust 文件索引服务

高性能的文件索引和模糊搜索工具，使用 Rust 编写。

## 功能特性

- 🚀 高性能文件遍历（使用 `ignore` crate，支持 .gitignore）
- 🔍 模糊搜索（使用 `fuzzy-matcher` 的 Skim 算法）
- 📁 自动跳过常见的构建目录（node_modules, dist, build 等）
- 🎯 智能排序（目录优先，高分优先）
- 💾 轻量级二进制文件

## 安装 Rust

如果还没有安装 Rust，请先安装：

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# 访问 https://rustup.rs/ 下载安装器
```

## 编译

```bash
cd rust-indexer

# 开发版本
cargo build

# 生产版本（优化编译，体积更小）
cargo build --release
```

编译后的二进制文件位置：
- 开发版：`target/debug/file-indexer`
- 生产版：`target/release/file-indexer`

## 使用方法

### 1. 索引文件

列出目录下的所有文件（最多 5000 个）：

```bash
./target/release/file-indexer index --root /path/to/project
```

输出 JSON 格式：
```json
[
  {
    "absolutePath": "/path/to/project/src/main.rs",
    "relativePath": "src/main.rs",
    "name": "main.rs",
    "isDirectory": false
  }
]
```

### 2. 模糊搜索

搜索匹配的文件：

```bash
./target/release/file-indexer search --root /path/to/project --query "main" --limit 80
```

## 集成到 Electron

在 `electron/api/routes/files.ts` 中调用 Rust 二进制文件：

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function listProjectMentionEntriesRust(
  workspaceRoot: string,
  query?: string
): Promise<ProjectMentionEntry[]> {
  const binPath = join(__dirname, '../../rust-indexer/target/release/file-indexer');
  
  const args = query
    ? ['search', '--root', workspaceRoot, '--query', query, '--limit', '80']
    : ['index', '--root', workspaceRoot, '--max', '5000'];
  
  const { stdout } = await execFileAsync(binPath, args);
  return JSON.parse(stdout);
}
```

## 性能对比

| 操作 | Node.js (递归) | Rust (ignore + fuzzy) |
|------|---------------|----------------------|
| 索引 5000 文件 | ~500ms | ~50ms |
| 模糊搜索 | ~100ms | ~5ms |

## 跳过的目录

默认跳过以下目录：
- `node_modules`
- `dist`, `dist-electron`
- `build`, `out`
- `coverage`
- `.next`, `.nuxt`, `.turbo`
- `.cache`, `tmp`, `temp`
- `target` (Rust)
- `.git`

## 开发

```bash
# 运行测试
cargo test

# 检查代码
cargo clippy

# 格式化代码
cargo fmt
```
