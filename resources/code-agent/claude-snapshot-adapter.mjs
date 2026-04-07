import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const STOP_WORDS = new Set([
  'the',
  'this',
  'that',
  'with',
  'from',
  'into',
  'have',
  'what',
  'when',
  'where',
  'which',
  'while',
  'would',
  'could',
  'should',
  'about',
  'there',
  'their',
  'them',
  'then',
  'than',
  'just',
  'your',
  'ours',
  'using',
  'used',
  'make',
  'does',
  'dont',
  'need',
  'like',
  'want',
  'code',
  'agent',
  'project',
  'continue',
  'please',
]);
const CODE_AGENT_PERMISSION_MODES = new Set([
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
  'auto',
]);

function safeReadText(filePath, maxBytes = 256 * 1024) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.length > maxBytes ? content.slice(0, maxBytes) : content;
  } catch {
    return '';
  }
}

function walkFiles(rootDir, maxFiles = 4000) {
  if (!existsSync(rootDir)) return [];
  const queue = [rootDir];
  const files = [];

  while (queue.length > 0 && files.length < maxFiles) {
    const current = queue.shift();
    if (!current) continue;

    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        queue.push(fullPath);
        continue;
      }
      files.push(fullPath);
      if (files.length >= maxFiles) break;
    }
  }

  return files;
}

function findFilesByName(rootDir, allowedNames, maxResults = 100) {
  const matches = [];
  for (const filePath of walkFiles(rootDir)) {
    const baseName = filePath.split('/').pop() || '';
    if (!allowedNames.has(baseName)) continue;
    matches.push(filePath);
    if (matches.length >= maxResults) break;
  }
  return matches;
}

function collectImportSpecifiers(rootDir) {
  const sourceFiles = walkFiles(rootDir).filter((filePath) => {
    const dotIndex = filePath.lastIndexOf('.');
    const ext = dotIndex === -1 ? '' : filePath.slice(dotIndex);
    return SOURCE_EXTENSIONS.has(ext);
  });

  const externalImports = new Set();
  let bunFeatureUsed = false;
  let absoluteSrcImportsUsed = false;

  for (const filePath of sourceFiles) {
    const text = safeReadText(filePath);
    if (!text) continue;

    if (text.includes('bun:bundle') || text.includes('feature(') || text.includes('typeof Bun')) {
      bunFeatureUsed = true;
    }

    const regex =
      /^\s*(?:import|export)\b[\s\S]*?\bfrom\s+['"]([^'"]+)['"]|(?:^|[^\w])require\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/gm;
    for (const match of text.matchAll(regex)) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier) continue;
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
      if (specifier.startsWith('src/')) {
        absoluteSrcImportsUsed = true;
        continue;
      }
      if (specifier.startsWith('node:')) continue;
      externalImports.add(specifier);
    }
  }

  return {
    sourceFileCount: sourceFiles.length,
    externalImports: [...externalImports].sort(),
    bunFeatureUsed,
    absoluteSrcImportsUsed,
  };
}

function inspectVendorSnapshot(vendorPath, bunAvailable) {
  const manifestPaths = findFilesByName(
    vendorPath,
    new Set(['package.json', 'bun.lock', 'bun.lockb'])
  );
  const tsconfigPaths = findFilesByName(
    vendorPath,
    new Set(['tsconfig.json', 'tsconfig.node.json', 'bunfig.toml'])
  );
  const candidateEntryPoints = [
    join(vendorPath, 'src', 'main.tsx'),
    join(vendorPath, 'src', 'commands.ts'),
    join(vendorPath, 'src', 'tools.ts'),
    join(vendorPath, 'src', 'QueryEngine.ts'),
  ];
  const entryPoints = candidateEntryPoints.filter((filePath) => existsSync(filePath));
  const imports = collectImportSpecifiers(vendorPath);
  const diagnostics = [];

  if (!existsSync(vendorPath)) {
    diagnostics.push(`Vendor snapshot directory does not exist: ${vendorPath}`);
  }
  if (manifestPaths.length === 0) {
    diagnostics.push(
      'No package manifest or lockfile was found in the snapshot, so dependency installation cannot be reproduced directly.'
    );
  }
  if (imports.externalImports.length > 0) {
    diagnostics.push(
      `Snapshot references ${imports.externalImports.length} bare external imports; sample: ${imports.externalImports.slice(0, 8).join(', ')}`
    );
  }
  if (imports.absoluteSrcImportsUsed) {
    diagnostics.push(
      'Snapshot uses absolute "src/*" imports that normally rely on a bundler or tsconfig path alias.'
    );
  }
  if (imports.bunFeatureUsed && !bunAvailable) {
    diagnostics.push(
      'Snapshot contains Bun-specific feature flags/imports, but Bun is not available in this environment.'
    );
  }
  if (entryPoints.length === 0) {
    diagnostics.push('No known entrypoints were found in vendor/claude-code/src.');
  }
  if (tsconfigPaths.length === 0) {
    diagnostics.push('No tsconfig or bunfig file was found alongside the snapshot.');
  }

  const runnable = diagnostics.length === 0;

  return {
    runnable,
    diagnostics,
    manifestPaths: manifestPaths.map((filePath) => relative(vendorPath, filePath) || filePath),
    tsconfigPaths: tsconfigPaths.map((filePath) => relative(vendorPath, filePath) || filePath),
    entryPoints: entryPoints.map((filePath) => relative(vendorPath, filePath) || filePath),
    externalImportsSample: imports.externalImports.slice(0, 20),
    sourceFileCount: imports.sourceFileCount,
  };
}

function listWorkspacePreview(workspaceRoot) {
  try {
    return readdirSync(workspaceRoot, { withFileTypes: true })
      .slice(0, 12)
      .map((entry) => `${entry.isDirectory() ? 'dir' : 'file'}:${entry.name}`);
  } catch (error) {
    return [`workspace preview failed: ${String(error)}`];
  }
}

function extractPromptKeywords(prompt) {
  const tokens = prompt
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return [...new Set(tokens)].slice(0, 6);
}

function searchTree(rootDir, keywords, limit = 12, extraGlobs = []) {
  if (!existsSync(rootDir) || keywords.length === 0) return [];
  const rg = spawnSync(
    'rg',
    [
      '-n',
      '-S',
      '--max-count',
      String(limit),
      '--glob',
      '!node_modules/**',
      '--glob',
      '!dist/**',
      ...extraGlobs.flatMap((glob) => ['--glob', glob]),
      ...keywords.flatMap((keyword) => ['-e', keyword]),
      rootDir,
    ],
    { encoding: 'utf8' }
  );

  if (rg.status !== 0 && !rg.stdout) {
    return [];
  }

  return rg.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function inspectWorkspaceRoot(workspaceRoot) {
  const packageJsonPath = join(workspaceRoot, 'package.json');
  let packageInfo = null;
  if (existsSync(packageJsonPath)) {
    try {
      const raw = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      packageInfo = {
        name: raw.name,
        packageManager: raw.packageManager,
      };
    } catch {
      packageInfo = null;
    }
  }

  return {
    exists: existsSync(workspaceRoot),
    topLevelEntries: listWorkspacePreview(workspaceRoot),
    packageInfo,
    isDirectory: existsSync(workspaceRoot) ? statSync(workspaceRoot).isDirectory() : false,
  };
}

export function buildSnapshotDescriptor(vendorPath, bunAvailable) {
  return inspectVendorSnapshot(vendorPath, bunAvailable);
}

export function normalizeRuntimeConfig(input) {
  const allowedTools = Array.isArray(input?.allowedTools)
    ? input.allowedTools
    : typeof input?.allowedTools === 'string'
      ? input.allowedTools.split(/[\n,]+/)
      : [];

  const executionMode = input?.executionMode === 'snapshot' ? 'snapshot' : 'cli';
  const permissionMode = CODE_AGENT_PERMISSION_MODES.has(input?.permissionMode)
    ? input.permissionMode
    : 'default';

  return {
    executionMode,
    cliPath:
      typeof input?.cliPath === 'string' && input.cliPath.trim() ? input.cliPath.trim() : 'claude',
    model: typeof input?.model === 'string' ? input.model.trim() : '',
    fallbackModel: typeof input?.fallbackModel === 'string' ? input.fallbackModel.trim() : '',
    baseUrl: typeof input?.baseUrl === 'string' ? input.baseUrl.trim() : '',
    apiKey: typeof input?.apiKey === 'string' ? input.apiKey.trim() : '',
    permissionMode,
    allowedTools: [
      ...new Set(
        allowedTools.map((tool) => (typeof tool === 'string' ? tool.trim() : '')).filter(Boolean)
      ),
    ],
    appendSystemPrompt:
      typeof input?.appendSystemPrompt === 'string' ? input.appendSystemPrompt.trim() : '',
  };
}

function probeClaudeCli(cliPath) {
  try {
    const versionResult = spawnSync(cliPath, ['--version'], {
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });

    if (versionResult.error) {
      return {
        cliFound: false,
        cliVersion: '',
        diagnostics: [`Claude CLI probe failed: ${String(versionResult.error)}`],
      };
    }

    const cliVersion =
      [versionResult.stdout, versionResult.stderr]
        .join('\n')
        .trim()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) || '';

    if (versionResult.status !== 0) {
      return {
        cliFound: false,
        cliVersion,
        diagnostics: [
          `Claude CLI version probe exited with code ${versionResult.status}.`,
          ...(cliVersion ? [`Version probe output: ${cliVersion}`] : []),
        ],
      };
    }

    return {
      cliFound: true,
      cliVersion,
      diagnostics: [],
    };
  } catch (error) {
    return {
      cliFound: false,
      cliVersion: '',
      diagnostics: [`Claude CLI probe failed: ${String(error)}`],
    };
  }
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseClaudeCliOutput(stdout) {
  const direct = tryParseJson(stdout);
  if (direct !== null) {
    return direct;
  }

  const jsonLines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => tryParseJson(line))
    .filter((value) => value !== null);

  if (jsonLines.length === 0) {
    return null;
  }

  if (jsonLines.length === 1) {
    return jsonLines[0];
  }

  return {
    messages: jsonLines,
    final: jsonLines[jsonLines.length - 1],
  };
}

function extractTextContent(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.text === 'string') return item.text;
        if (item && typeof item.content === 'string') return item.content;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
  }
  return '';
}

function extractCliOutput(parsed, fallbackText) {
  const root = parsed && typeof parsed === 'object' && parsed.final ? parsed.final : parsed;
  const candidates = [
    root?.result,
    root?.content,
    root?.assistant_response,
    root?.message?.content,
    root?.message,
    root?.final_message,
  ];

  for (const candidate of candidates) {
    const text = extractTextContent(candidate).trim();
    if (text) {
      return text;
    }
  }

  return fallbackText.trim();
}

function buildCliSummary(outputText, parsed, exitCode) {
  if (outputText) {
    const firstParagraph = outputText.split(/\n\s*\n/)[0]?.trim() || outputText.trim();
    return firstParagraph.length > 240 ? `${firstParagraph.slice(0, 237)}...` : firstParagraph;
  }

  if (parsed?.subtype) {
    return `Claude CLI completed with subtype: ${parsed.subtype}`;
  }

  return exitCode === 0 ? 'Claude CLI task completed.' : `Claude CLI exited with code ${exitCode}.`;
}

function buildEphemeralRunId() {
  return resolve(`${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function normalizeTraceText(text) {
  return typeof text === 'string' ? text.replace(/\r\n/g, '\n') : '';
}

function buildToolInputSummary(toolName, input) {
  if (!input || typeof input !== 'object') return '';
  const name = toolName.toLowerCase();
  const truncate = (s, max = 80) =>
    typeof s === 'string' && s.length > max ? s.slice(0, max) + '…' : String(s || '');

  if (
    name === 'read' ||
    name === 'write' ||
    name === 'edit' ||
    name === 'multiedit' ||
    name === 'notebookedit'
  ) {
    return truncate(input.file_path || input.path || '');
  }
  if (name === 'bash') {
    return truncate(input.command || '', 72);
  }
  if (name === 'grep') {
    const pattern = input.pattern || '';
    const path = input.path || '';
    return pattern ? truncate(path ? `"${pattern}" in ${path}` : `"${pattern}"`) : '';
  }
  if (name === 'glob') {
    const glob = input.pattern || input.glob_pattern || '';
    const dir = input.path || input.target_directory || '';
    return truncate(dir ? `${glob} in ${dir}` : glob);
  }
  if (name === 'ls' || name === 'listfiles') {
    return truncate(input.path || '');
  }
  if (name === 'websearch') {
    return truncate(input.query || '');
  }
  if (name === 'webfetch') {
    return truncate(input.url || '');
  }
  if (name === 'todowrite') {
    const todos = Array.isArray(input.todos) ? input.todos : [];
    return todos.length > 0 ? `${todos.length} item${todos.length > 1 ? 's' : ''}` : '';
  }
  // Fallback: first short string value
  const first = Object.values(input).find((v) => typeof v === 'string' && v.length > 0);
  return first ? truncate(first) : '';
}

/**
 * Build a human-readable result summary from a tool_result content block.
 * Returns an empty string when no useful summary can be derived.
 */
function buildToolResultSummary(toolName, content) {
  // content can be string, null, or array of content blocks
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }

  if (!text) return '';

  const name = (toolName || '').toLowerCase();
  const lines = text.split('\n').filter(Boolean);
  const lineCount = lines.length;

  // Grep / search results
  if (name === 'grep') {
    if (lineCount === 0 || text.trim() === '' || /no matches/i.test(text))
      return 'No matches found';
    return `${lineCount} line${lineCount !== 1 ? 's' : ''} of output`;
  }
  // Glob file list
  if (name === 'glob') {
    if (lineCount === 0 || /no files/i.test(text)) return 'No files found';
    return `Found ${lineCount} file${lineCount !== 1 ? 's' : ''}`;
  }
  // Read file
  if (name === 'read') {
    if (lineCount === 0) return 'Empty file';
    return `${lineCount} line${lineCount !== 1 ? 's' : ''}`;
  }
  // Write / Edit
  if (
    name === 'write' ||
    name === 'edit' ||
    name === 'multiedit' ||
    name === 'strreplacebasededitattempt'
  ) {
    if (/error|failed/i.test(text)) return 'Error';
    return 'Done';
  }
  // Bash
  if (name === 'bash') {
    if (lineCount === 0) return '(no output)';
    return `${lineCount} line${lineCount !== 1 ? 's' : ''}`;
  }
  // Default: show trimmed first line if short
  const firstLine = lines[0]?.trim() || '';
  if (firstLine.length <= 60) return firstLine;
  return '';
}

function emitTrace(onEvent, step, payload = {}) {
  if (typeof onEvent !== 'function') return;
  onEvent({
    step,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

function readImageAsBase64(filePath) {
  try {
    const buffer = readFileSync(filePath);
    return buffer.toString('base64');
  } catch {
    return null;
  }
}

function buildUserContentBlocks(prompt, images) {
  const content = [];

  if (Array.isArray(images)) {
    for (const img of images) {
      if (!img || typeof img.filePath !== 'string') continue;
      const base64 = readImageAsBase64(img.filePath);
      if (!base64) continue;
      const mediaType = typeof img.mimeType === 'string' && img.mimeType
        ? img.mimeType
        : 'image/png';
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      });
    }
  }

  if (prompt) {
    content.push({ type: 'text', text: prompt });
  }

  return content.length > 0 ? content : [{ type: 'text', text: prompt || '' }];
}

async function runClaudeCliTask({
  cliConfig,
  vendorPath,
  workspaceRoot,
  prompt,
  images,
  sessionId,
  allowedTools,
  timeoutMs,
  onEvent,
  onPermissionRequest,
}) {
  const cliProbe = probeClaudeCli(cliConfig.cliPath);
  if (!cliProbe.cliFound) {
    return {
      runId: buildEphemeralRunId(),
      status: 'failed',
      output: cliProbe.diagnostics.join('\n'),
      summary: 'Claude CLI is not available.',
      diagnostics: cliProbe.diagnostics,
      metadata: {
        executionMode: 'cli',
        cliPath: cliConfig.cliPath,
        cliFound: false,
      },
    };
  }

  const mergedAllowedTools = [
    ...new Set([
      ...cliConfig.allowedTools,
      ...(Array.isArray(allowedTools)
        ? allowedTools
            .filter((tool) => typeof tool === 'string' && tool.trim())
            .map((tool) => tool.trim())
        : []),
    ]),
  ];

  const args = [
    '--output-format', 'stream-json',
    '--input-format', 'stream-json',
    '--verbose',
    '--permission-prompt-tool', 'stdio',
  ];
  if (sessionId) {
    args.push('--resume', sessionId);
  }
  if (cliConfig.model) {
    args.push('--model', cliConfig.model);
  }
  if (cliConfig.fallbackModel) {
    args.push('--fallback-model', cliConfig.fallbackModel);
  }
  if (cliConfig.permissionMode) {
    args.push('--permission-mode', cliConfig.permissionMode);
  }
  if (mergedAllowedTools.length > 0) {
    args.push('--allowedTools', mergedAllowedTools.join(','));
  }
  if (cliConfig.appendSystemPrompt) {
    args.push('--append-system-prompt', cliConfig.appendSystemPrompt);
  }
  if (existsSync(vendorPath) && vendorPath !== workspaceRoot) {
    args.push('--add-dir', vendorPath);
  }

  const env = {
    ...process.env,
  };
  if (cliConfig.baseUrl) {
    env.ANTHROPIC_BASE_URL = cliConfig.baseUrl;
  }
  if (cliConfig.apiKey) {
    env.ANTHROPIC_API_KEY = cliConfig.apiKey;
  }

  emitTrace(onEvent, 'request:start', {
    executionMode: 'cli',
    workspaceRoot,
    vendorPath: existsSync(vendorPath) ? vendorPath : null,
    cliPath: cliConfig.cliPath,
    prompt,
    args,
    timeoutMs: timeoutMs > 0 ? timeoutMs : 120_000,
    sessionId: sessionId || null,
    model: cliConfig.model || null,
    fallbackModel: cliConfig.fallbackModel || null,
    baseUrl: cliConfig.baseUrl || null,
    permissionMode: cliConfig.permissionMode,
    allowedTools: mergedAllowedTools,
    appendSystemPrompt: cliConfig.appendSystemPrompt || null,
    apiKeyConfigured: Boolean(cliConfig.apiKey),
  });

  const startedAt = Date.now();
  let child;

  // Tracks whether we're currently awaiting a user permission decision.
  // While true, the stdout stream is paused so we don't process subsequent
  // CLI output before we've written the permission response to stdin.
  let awaitingPermission = false;

  function normalizePermissionRequest(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // New SDK control envelope, nested variant:
    // { type: "control_request", request_id, request: { subtype: "can_use_tool", tool_name, input, ... } }
    if (
      parsed.type === 'control_request' &&
      parsed.request &&
      typeof parsed.request === 'object' &&
      parsed.request.subtype === 'can_use_tool'
    ) {
      const inner = parsed.request;
      return {
        protocol: 'control',
        requestId: String(parsed.request_id || parsed.requestId || Date.now()),
        toolName: String(inner.tool_name || inner.display_name || inner.title || 'Unknown'),
        rawInput: inner.input && typeof inner.input === 'object' ? inner.input : {},
      };
    }

    // New SDK control envelope, flat variant:
    // { type: "control_request", subtype: "can_use_tool", tool_name, input, ... }
    if (parsed.type === 'control_request' && parsed.subtype === 'can_use_tool') {
      return {
        protocol: 'control',
        requestId: String(parsed.request_id || parsed.requestId || Date.now()),
        toolName: String(parsed.tool_name || parsed.display_name || parsed.title || 'Unknown'),
        rawInput: parsed.input && typeof parsed.input === 'object' ? parsed.input : {},
      };
    }

    // Catch-all for any other control_request shape – treat as a file/tool request.
    if (parsed.type === 'control_request') {
      return {
        protocol: 'control',
        requestId: String(parsed.request_id || parsed.requestId || Date.now()),
        toolName: String(
          parsed.tool_name ||
          (parsed.request && parsed.request.tool_name) ||
          parsed.name ||
          'Unknown',
        ),
        rawInput: parsed.input && typeof parsed.input === 'object'
          ? parsed.input
          : parsed.request && typeof parsed.request === 'object' && parsed.request.input
            ? parsed.request.input
            : {},
      };
    }

    // Legacy permission envelopes.
    return {
      protocol: 'legacy',
      requestId: String(parsed.request_id || parsed.requestId || Date.now()),
      toolName: String(parsed.tool || parsed.toolName || parsed.name || 'Unknown'),
      rawInput:
        parsed.input && typeof parsed.input === 'object'
          ? parsed.input
          : parsed.tool_input && typeof parsed.tool_input === 'object'
            ? parsed.tool_input
            : {},
    };
  }

  function buildPermissionResponseLine(protocol, requestId, decision, rawInput) {
    const normalizedDecision = decision === 'allow' ? 'allow' : 'deny';
    if (protocol === 'control') {
      const innerResponse = normalizedDecision === 'allow'
        ? { behavior: 'allow', updatedInput: rawInput || {} }
        : { behavior: 'deny', message: 'User denied this action' };
      return (
        JSON.stringify({
          type: 'control_response',
          response: {
            subtype: 'success',
            request_id: requestId,
            response: innerResponse,
          },
        }) + '\n'
      );
    }

    // Legacy stream-json permission response shape.
    return (
      JSON.stringify({
        type: 'permission_response',
        request_id: requestId,
        decision: normalizedDecision,
      }) + '\n'
    );
  }

  async function handlePermissionEvent(parsed) {
    const normalized = normalizePermissionRequest(parsed);
    if (!normalized) return;

    if (typeof onPermissionRequest !== 'function') {
      // No handler: auto-allow so the task can proceed
      const response = buildPermissionResponseLine(
        normalized.protocol,
        normalized.requestId,
        'allow',
        normalized.rawInput,
      );
      child?.stdin.write(response);
      return;
    }
    awaitingPermission = true;
    child?.stdout.pause();
    try {
      const { requestId, toolName, rawInput, protocol } = normalized;
      const inputSummary =
        buildToolInputSummary(toolName, rawInput) ||
        String(rawInput.command || rawInput.path || '');
      const decision = await onPermissionRequest({ requestId, toolName, inputSummary, rawInput });
      const response = buildPermissionResponseLine(protocol, requestId, decision || 'deny', rawInput);
      child?.stdin.write(response);
    } finally {
      awaitingPermission = false;
      child?.stdout.resume();
    }
  }

  try {
    child = spawn(cliConfig.cliPath, args, {
      cwd: workspaceRoot,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitTrace(onEvent, 'process:error', { message });
    return {
      runId: buildEphemeralRunId(),
      status: 'failed',
      output: message,
      summary: 'Claude CLI failed to start.',
      diagnostics: [message],
      metadata: {
        executionMode: 'cli',
        cliPath: cliConfig.cliPath,
        cliVersion: cliProbe.cliVersion,
        permissionMode: cliConfig.permissionMode,
        allowedTools: mergedAllowedTools,
      },
    };
  }

  emitTrace(onEvent, 'process:spawn', {
    pid: child.pid ?? null,
    cwd: workspaceRoot,
  });

  // Send the user prompt via stdin as NDJSON (required with --input-format stream-json).
  // When image attachments are present, include them as image content blocks
  // so the model can actually "see" the images via the vision API.
  const userMessage = JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: buildUserContentBlocks(prompt, images),
    },
  }) + '\n';
  child.stdin.write(userMessage);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let spawnError = null;
  let stdoutLineBuffer = '';

  child.stdout.on('data', (chunk) => {
    const text = normalizeTraceText(chunk);
    stdout += text;
    stdoutLineBuffer += text;

    // Parse complete newline-delimited JSON lines for stream-json format.
    // Each line is one event; extract text deltas from assistant turns in real time.
    while (true) {
      const nlIdx = stdoutLineBuffer.indexOf('\n');
      if (nlIdx === -1) break;
      const line = stdoutLineBuffer.slice(0, nlIdx).trim();
      stdoutLineBuffer = stdoutLineBuffer.slice(nlIdx + 1);
      if (!line) continue;

      const parsed = tryParseJson(line);

      if (parsed && parsed.type === 'assistant' && parsed.message) {
        const content = parsed.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block && block.type === 'text' && typeof block.text === 'string' && block.text) {
              // text-delta fires BEFORE sdk-message so the renderer's store
              // can accumulate the streaming text before the assistant flush.
              emitTrace(onEvent, 'run:text-delta', { text: block.text });
            }
            if (block && block.type === 'tool_use' && typeof block.name === 'string') {
              emitTrace(onEvent, 'run:tool-activity', {
                toolId: block.id || '',
                toolName: block.name,
                inputSummary: buildToolInputSummary(block.name, block.input || {}),
              });
            }
          }
        }
      }

      // sdk-message fires AFTER text-delta/tool-activity so the store's
      // streaming buffers are already populated when the assistant handler
      // decides whether to flush or fall back to direct content parse.
      if (parsed && typeof parsed.type === 'string') {
        emitTrace(onEvent, 'run:sdk-message', { raw: parsed });
      }

      // When we receive the final `result` message, close stdin so the CLI
      // process can exit (we don't use -p, so the CLI waits for more input).
      if (parsed && parsed.type === 'result') {
        try { child?.stdin.end(); } catch { /* ignore */ }
      }

      // Parse tool_result blocks from user turns so the renderer can show
      // per-tool result summaries (e.g. "66 lines of output").
      if (parsed && parsed.type === 'user' && parsed.message) {
        const content = parsed.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block && block.type === 'tool_result' && block.tool_use_id) {
              // We can't look up the tool name here without a map; pass
              // tool_use_id + raw content so manager can emit the event.
              const resultSummary = buildToolResultSummary('', block.content);
              if (resultSummary) {
                emitTrace(onEvent, 'run:tool-result', {
                  toolId: block.tool_use_id,
                  resultSummary,
                });
              }
            }
          }
        }
      }

      // Detect permission request events emitted by Claude CLI in stream-json mode.
      // The CLI may use various shapes depending on version; we match broadly.
      if (parsed && typeof parsed === 'object') {
        const isPermissionRequest =
          // New SDK control envelope – subtype nested inside request object
          (parsed.type === 'control_request' &&
            parsed.request &&
            typeof parsed.request === 'object' &&
            parsed.request.subtype === 'can_use_tool') ||
          // New SDK control envelope – subtype at top level (some CLI versions)
          (parsed.type === 'control_request' &&
            parsed.subtype === 'can_use_tool') ||
          // Any control_request is treated as a permission request as a catch-all
          // so we don't silently auto-continue when the CLI pauses for user input.
          parsed.type === 'control_request' ||
          // Legacy stream-json shapes
          parsed.type === 'permission' ||
          parsed.type === 'permission_request' ||
          (parsed.type === 'system' &&
            (parsed.subtype === 'permission_request' || parsed.subtype === 'permission')) ||
          parsed.request_type === 'permission';
        if (isPermissionRequest) {
          emitTrace(onEvent, 'run:permission-request', { raw: parsed });
          // handlePermissionEvent is async; we call it fire-and-forget but stdout
          // is paused inside it so subsequent data events won't race.
          void handlePermissionEvent(parsed);
        }
      }

      emitTrace(onEvent, 'stdout:chunk', { text: line + '\n' });
    }
  });

  child.stderr.on('data', (chunk) => {
    const text = normalizeTraceText(chunk);
    stderr += text;
    emitTrace(onEvent, 'stderr:chunk', { text });
  });

  const effectiveTimeoutMs = timeoutMs > 0 ? timeoutMs : 120_000;
  const result = await new Promise((resolvePromise) => {
    let settled = false;
    let killTimer = null;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (killTimer) {
        clearTimeout(killTimer);
      }
      resolvePromise(value);
    };

    killTimer = setTimeout(() => {
      timedOut = true;
      emitTrace(onEvent, 'process:timeout', {
        timeoutMs: effectiveTimeoutMs,
      });
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore termination failures
      }
      setTimeout(() => {
        if (!child.killed) {
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore forced kill failures
          }
        }
      }, 2_000);
    }, effectiveTimeoutMs);

    child.once('error', (error) => {
      spawnError = error;
      emitTrace(onEvent, 'process:error', {
        message: error instanceof Error ? error.message : String(error),
      });
      settle({
        code: null,
        signal: null,
      });
    });

    child.once('close', (code, signal) => {
      settle({ code, signal });
    });
  });
  const durationMs = Date.now() - startedAt;
  const normalizedStdout = stdout.trim();
  const normalizedStderr = stderr.trim();
  const parsed = parseClaudeCliOutput(normalizedStdout);
  const output = extractCliOutput(parsed, stdout || stderr);
  const isError = Boolean(spawnError) || timedOut || result.code !== 0 || parsed?.is_error === true;
  const diagnostics = [];

  if (spawnError) {
    diagnostics.push(String(spawnError));
  }
  if (result.signal) {
    diagnostics.push(`Claude CLI exited via signal ${result.signal}.`);
  }
  if (timedOut) {
    diagnostics.push(`Claude CLI timed out after ${effectiveTimeoutMs}ms.`);
  }
  if (normalizedStderr) {
    diagnostics.push(normalizedStderr);
  }
  if (result.code !== 0) {
    diagnostics.push(`Claude CLI exited with code ${result.code}.`);
  }

  const root = parsed && typeof parsed === 'object' && parsed.final ? parsed.final : parsed;
  const runId = root?.session_id || root?.sessionId || buildEphemeralRunId();

  emitTrace(onEvent, 'process:close', {
    pid: child.pid ?? null,
    exitCode: result.code,
    signal: result.signal,
    durationMs,
    stdoutBytes: Buffer.byteLength(stdout, 'utf8'),
    stderrBytes: Buffer.byteLength(stderr, 'utf8'),
    timedOut,
  });

  emitTrace(onEvent, 'result:final', {
    runId,
    status: isError ? 'failed' : 'completed',
    summary: buildCliSummary(output, root, result.code ?? 0),
    output,
    diagnostics,
  });

  return {
    runId,
    status: isError ? 'failed' : 'completed',
    output: output || normalizedStderr || 'Claude CLI completed without text output.',
    summary: buildCliSummary(output, root, result.code ?? 0),
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    metadata: {
      executionMode: 'cli',
      cliPath: cliConfig.cliPath,
      cliVersion: cliProbe.cliVersion,
      exitCode: result.code,
      durationMs,
      sessionId: root?.session_id || root?.sessionId || sessionId || null,
      model: root?.model || cliConfig.model || null,
      permissionMode: cliConfig.permissionMode,
      allowedTools: mergedAllowedTools,
      totalCostUsd: root?.total_cost_usd ?? root?.cost_usd ?? null,
      numTurns: root?.num_turns ?? root?.turns ?? null,
      raw: parsed,
    },
  };
}

export function buildExecutionHealth({ vendorPath, bunAvailable, config }) {
  const cliConfig = normalizeRuntimeConfig(config);
  if (cliConfig.executionMode === 'snapshot') {
    const snapshot = buildSnapshotDescriptor(vendorPath, bunAvailable);
    return {
      runnable: snapshot.runnable,
      diagnostics: snapshot.diagnostics,
      manifestPaths: snapshot.manifestPaths,
      entryPoints: snapshot.entryPoints,
      externalImportsSample: snapshot.externalImportsSample,
      cliFound: false,
      cliVersion: '',
      configuredModel: cliConfig.model || undefined,
      configuredBaseUrl: cliConfig.baseUrl || undefined,
      configuredPermissionMode: cliConfig.permissionMode,
      executionMode: cliConfig.executionMode,
      cliPath: cliConfig.cliPath,
    };
  }

  const cliProbe = probeClaudeCli(cliConfig.cliPath);
  const diagnostics = [...cliProbe.diagnostics];
  if (!cliConfig.apiKey) {
    diagnostics.push(
      'No code-agent API key is configured in app settings. Claude CLI may still work if the local CLI already has auth configured.'
    );
  }

  return {
    runnable: cliProbe.cliFound,
    diagnostics,
    manifestPaths: [],
    entryPoints: [],
    externalImportsSample: [],
    cliFound: cliProbe.cliFound,
    cliVersion: cliProbe.cliVersion,
    configuredModel: cliConfig.model || undefined,
    configuredBaseUrl: cliConfig.baseUrl || undefined,
    configuredPermissionMode: cliConfig.permissionMode,
    executionMode: cliConfig.executionMode,
    cliPath: cliConfig.cliPath,
  };
}

export async function runSnapshotAnalysis({
  vendorPath,
  workspaceRoot,
  prompt,
  images,
  bunAvailable,
  config,
  sessionId,
  allowedTools,
  timeoutMs,
  onEvent,
  onPermissionRequest,
}) {
  const cliConfig = normalizeRuntimeConfig(config);
  if (cliConfig.executionMode === 'cli') {
    return await runClaudeCliTask({
      cliConfig,
      vendorPath,
      workspaceRoot,
      prompt,
      images,
      sessionId,
      allowedTools,
      timeoutMs,
      onEvent,
      onPermissionRequest,
    });
  }

  const vendor = inspectVendorSnapshot(vendorPath, bunAvailable);
  const workspace = inspectWorkspaceRoot(workspaceRoot);
  const keywords = extractPromptKeywords(prompt);
  const workspaceMatches = searchTree(workspaceRoot, keywords, 12, ['!.git/**', '!vendor/**']);
  const vendorMatches = searchTree(vendorPath, keywords, 12);

  const diagnostics = [
    ...vendor.diagnostics,
    workspace.exists
      ? `Workspace root is available: ${workspaceRoot}`
      : `Workspace root does not exist: ${workspaceRoot}`,
    keywords.length > 0
      ? `Prompt search keywords: ${keywords.join(', ')}`
      : 'Prompt did not produce meaningful search keywords; falling back to directory inspection only.',
  ];

  const summary = vendor.runnable
    ? 'Vendor snapshot looks bootstrappable from static inspection, but the live runtime adapter is not implemented yet.'
    : 'Vendor snapshot is present, but static inspection found blockers that prevent direct runtime bootstrap.';

  const outputLines = [
    summary,
    `Workspace preview: ${workspace.topLevelEntries.join(', ') || '(empty)'}`,
    workspace.packageInfo?.name
      ? `Workspace package: ${workspace.packageInfo.name}${workspace.packageInfo.packageManager ? ` (${workspace.packageInfo.packageManager})` : ''}`
      : 'Workspace package.json metadata was not detected or could not be parsed.',
    vendor.entryPoints.length > 0
      ? `Snapshot entrypoints: ${vendor.entryPoints.join(', ')}`
      : 'No known snapshot entrypoints were detected.',
    workspaceMatches.length > 0
      ? `Workspace matches:\n${workspaceMatches.join('\n')}`
      : 'Workspace search produced no keyword matches.',
    vendorMatches.length > 0
      ? `Snapshot matches:\n${vendorMatches.join('\n')}`
      : 'Snapshot search produced no keyword matches.',
  ];

  return {
    runId: buildEphemeralRunId(),
    status: 'analysis_only',
    output: outputLines.join('\n\n'),
    summary,
    diagnostics,
    metadata: {
      keywords,
      workspaceMatches,
      vendorMatches,
      vendor,
      workspace,
    },
  };
}
