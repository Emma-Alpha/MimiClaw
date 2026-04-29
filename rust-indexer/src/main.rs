use clap::{Parser, Subcommand};
use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Parser)]
#[command(name = "file-indexer")]
#[command(about = "High-performance file indexer with fuzzy search", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Index files in a directory
    Index {
        /// Root directory to index
        #[arg(short, long)]
        root: String,

        /// Maximum number of entries to return
        #[arg(short, long, default_value = "500")]
        max: usize,
    },

    /// Search indexed files with fuzzy matching
    Search {
        /// Root directory to search
        #[arg(short, long)]
        root: String,

        /// Search query
        #[arg(short, long)]
        query: String,

        /// Maximum number of results
        #[arg(short, long, default_value = "80")]
        limit: usize,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct FileEntry {
    #[serde(rename = "absolutePath")]
    absolute_path: String,
    #[serde(rename = "relativePath")]
    relative_path: String,
    name: String,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
}

#[derive(Debug, Serialize)]
struct SearchResult {
    entry: FileEntry,
    score: i64,
}

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | "dist"
            | "dist-electron"
            | "build"
            | "out"
            | "coverage"
            | ".next"
            | ".nuxt"
            | ".turbo"
            | ".cache"
            | "tmp"
            | "temp"
            | "target"
            | ".git"
    )
}

fn index_files(root: &str, max_entries: usize) -> Vec<FileEntry> {
    let root_path = Path::new(root);
    if !root_path.exists() || !root_path.is_dir() {
        return Vec::new();
    }

    let mut entries = Vec::new();
    let walker = WalkBuilder::new(root_path)
        .hidden(true) // Skip hidden files
        .git_ignore(true) // Respect .gitignore
        .git_exclude(true) // Respect .git/info/exclude
        .filter_entry(|entry| {
            let file_name = entry.file_name().to_string_lossy();
            // Skip hidden files and specific directories
            if file_name.starts_with('.') {
                return false;
            }
            if entry.file_type().map_or(false, |ft| ft.is_dir()) {
                return !should_skip_dir(&file_name);
            }
            true
        })
        .build();

    for result in walker {
        if entries.len() >= max_entries {
            break;
        }

        if let Ok(entry) = result {
            let path = entry.path();
            if path == root_path {
                continue; // Skip root itself
            }

            let is_directory = entry.file_type().map_or(false, |ft| ft.is_dir());
            let absolute_path = path.to_string_lossy().to_string();
            let relative_path = path
                .strip_prefix(root_path)
                .unwrap_or(path)
                .to_string_lossy()
                .replace('\\', "/");
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            entries.push(FileEntry {
                absolute_path,
                relative_path,
                name,
                is_directory,
            });
        }
    }

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.relative_path.cmp(&b.relative_path),
        }
    });

    entries
}

/// Check whether byte at `pos` in `text` sits at a word boundary.
fn is_word_boundary(text: &[u8], pos: usize) -> bool {
    if pos == 0 {
        return true;
    }
    let prev = text[pos - 1];
    matches!(prev, b'.' | b'-' | b'_' | b' ' | b'/')
}

/// Cursor/VS Code–style fuzzy scoring for filenames.
///
/// Characters from `query` must appear **in order** inside `text`. The score
/// reflects how "good" the alignment is:
///   - consecutive characters  → large bonus (grows the longer the run)
///   - match at a word boundary (after `.` `-` `_` `/` or start of string) → bonus
///   - match at the very first character → extra bonus
///   - gap between matched characters → small penalty (capped)
///
/// Returns `None` when the query cannot be matched at all, or when the
/// resulting score is ≤ 0 (too noisy to be useful).
fn fuzzy_score_name(text: &[u8], query: &[u8]) -> Option<i64> {
    if query.is_empty() {
        return Some(0);
    }
    if query.len() > text.len() {
        return None;
    }

    let mut score: i64 = 0;
    let mut text_idx: usize = 0;
    let mut consecutive: i64 = 0;
    let mut prev_matched_idx: Option<usize> = None;

    for (qi, &qc) in query.iter().enumerate() {
        let mut found = false;
        while text_idx < text.len() {
            if text[text_idx] == qc {
                // Base score for each matched character.
                score += 1;

                // First-character bonus.
                if qi == 0 && text_idx == 0 {
                    score += 10;
                }

                // Consecutive run bonus (grows quadratically).
                if let Some(prev) = prev_matched_idx {
                    if text_idx == prev + 1 {
                        consecutive += 1;
                        score += 3 + consecutive * 2;
                    } else {
                        let gap = (text_idx - prev - 1) as i64;
                        score -= gap.min(5);
                        consecutive = 0;
                    }
                }

                // Word-boundary bonus.
                if is_word_boundary(text, text_idx) {
                    score += 8;
                }

                prev_matched_idx = Some(text_idx);
                text_idx += 1;
                found = true;
                break;
            }
            text_idx += 1;
        }
        if !found {
            return None;
        }
    }

    if score > 0 {
        Some(score)
    } else {
        None
    }
}

fn search_files(root: &str, query: &str, limit: usize) -> Vec<FileEntry> {
    let entries = index_files(root, 5000);

    if query.is_empty() {
        return entries.into_iter().take(limit).collect();
    }

    let normalized_query = query.to_lowercase().replace('\\', "/");
    // Split on '/' so users can narrow into a folder by typing "src/App".
    let query_segments: Vec<&str> = normalized_query
        .split('/')
        .filter(|s| !s.is_empty())
        .collect();
    let tail_query = query_segments.last().copied().unwrap_or("");
    let has_path_hint = query_segments.len() > 1;

    if tail_query.is_empty() {
        return entries.into_iter().take(limit).collect();
    }

    let tail_bytes = tail_query.as_bytes();

    let mut results: Vec<SearchResult> = entries
        .into_iter()
        .filter_map(|entry| {
            let name_lower = entry.name.to_lowercase();
            let relative_lower = entry.relative_path.to_lowercase();

            // When the query contains '/' (e.g. "src/App"), require that
            // every leading segment appears as a substring in the path.
            if has_path_hint {
                for segment in &query_segments[..query_segments.len() - 1] {
                    if !relative_lower.contains(segment) {
                        return None;
                    }
                }
            }

            // ---- Score against the FILENAME only (not the full path) ----
            let name_bytes = name_lower.as_bytes();

            let score: i64;

            if name_lower == tail_query {
                // Tier 1 – exact name match
                score = 100_000;
            } else if name_lower.starts_with(tail_query) {
                // Tier 2 – name prefix match (shorter names rank higher)
                score = 50_000 + (1000_i64 - (name_lower.len().min(1000) as i64));
            } else if let Some(pos) = name_lower.find(tail_query) {
                // Tier 3 – contiguous substring in name
                let boundary = is_word_boundary(name_bytes, pos);
                let base = if boundary { 20_000 } else { 10_000 };
                score = base + (1000_i64 - (name_lower.len().min(1000) as i64));
            } else if tail_bytes.len() >= 2 {
                // Tier 4 – fuzzy match on filename (characters in order
                // with gap/boundary scoring). Capped to keep them below
                // contiguous-substring results.
                if let Some(fs) = fuzzy_score_name(name_bytes, tail_bytes) {
                    score = fs.min(5_000);
                } else {
                    return None;
                }
            } else {
                return None;
            }

            // Small directory tie-break bonus.
            let dir_bonus: i64 = if entry.is_directory { 50 } else { 0 };

            Some(SearchResult {
                entry,
                score: score + dir_bonus,
            })
        })
        .collect();

    // Sort by score desc; tie-break by shorter relative path (shallower
    // entries win) then lexicographically.
    results.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then_with(|| a.entry.relative_path.len().cmp(&b.entry.relative_path.len()))
            .then_with(|| a.entry.relative_path.cmp(&b.entry.relative_path))
    });

    // Cap the number of rows sharing the same name. Without this a monorepo
    // with many `src` folders would flood the dropdown with indistinguishable
    // "@src" entries and push real matches off-screen.
    const MAX_SAME_NAME: usize = 3;
    let mut name_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut deduped: Vec<FileEntry> = Vec::with_capacity(limit);
    for r in results.into_iter() {
        let count = name_counts.entry(r.entry.name.to_lowercase()).or_insert(0);
        if *count >= MAX_SAME_NAME {
            continue;
        }
        *count += 1;
        deduped.push(r.entry);
        if deduped.len() >= limit {
            break;
        }
    }

    deduped
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Index { root, max } => {
            let entries = index_files(&root, max);
            let json = serde_json::to_string(&entries).unwrap_or_else(|_| "[]".to_string());
            println!("{}", json);
        }
        Commands::Search { root, query, limit } => {
            let results = search_files(&root, &query, limit);
            let json = serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string());
            println!("{}", json);
        }
    }
}
