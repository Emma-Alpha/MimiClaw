use clap::{Parser, Subcommand};
use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
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

fn search_files(root: &str, query: &str, limit: usize) -> Vec<FileEntry> {
    let entries = index_files(root, 5000);

    if query.is_empty() {
        return entries.into_iter().take(limit).collect();
    }

    let matcher = SkimMatcherV2::default();
    let normalized_query = query.to_lowercase().replace('\\', "/");
    // Split on '/' so users can narrow into a folder by typing "src/App".
    // The last segment is matched against the entry name; earlier segments
    // should be present in the relative path.
    let query_segments: Vec<&str> = normalized_query
        .split('/')
        .filter(|s| !s.is_empty())
        .collect();
    let tail_query = query_segments.last().copied().unwrap_or("");
    let has_path_hint = query_segments.len() > 1;

    let mut results: Vec<SearchResult> = entries
        .into_iter()
        .filter_map(|entry| {
            let relative = entry.relative_path.to_lowercase();
            let name = entry.name.to_lowercase();

            // When the query contains path separators (e.g. "src/App"), require
            // that every leading segment appears in the relative path. This
            // lets users drill into a specific folder rather than matching
            // unrelated files that happen to fuzzy-match globally.
            if has_path_hint {
                for segment in &query_segments[..query_segments.len() - 1] {
                    if !relative.contains(segment) {
                        return None;
                    }
                }
            }

            let score_relative = matcher.fuzzy_match(&relative, &normalized_query);
            let score_name = matcher.fuzzy_match(&name, tail_query);

            let mut total: i64 = 0;
            let mut matched = false;

            // Exact and prefix matches on the entry name are the strongest
            // signal. Give them a hard bonus so they float to the top.
            if name == tail_query {
                total += 10_000;
                matched = true;
            } else if name.starts_with(tail_query) {
                total += 3_000;
                matched = true;
            }

            if let Some(s) = score_name {
                // Name matches are usually more meaningful than deep path
                // matches, so weight them more heavily.
                total += s * 3;
                matched = true;
            }
            if let Some(s) = score_relative {
                total += s;
                matched = true;
            }

            if matched {
                Some(SearchResult { entry, score: total })
            } else {
                None
            }
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
