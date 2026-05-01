/**
 * after-pack.cjs
 *
 * electron-builder afterPack hook.
 *
 * Responsibilities:
 *   1. Verify the packaged macOS .app contains an intact Electron Framework
 *      binary, recovering it from the local electron download cache when
 *      electron-builder produces a partial bundle.
 *   2. Copy bundled Snipaste resources (preserving framework symlinks on macOS).
 *   3. Re-sign bundled macOS native binaries / .app bundles under bin/ and cli/.
 */

const { cpSync, existsSync, readdirSync, rmSync, mkdirSync } = require('node:fs');
const { join, dirname, basename } = require('node:path');
const { execFileSync } = require('node:child_process');

// ── Arch helpers ─────────────────────────────────────────────────────────────
// electron-builder Arch enum: 0=ia32, 1=x64, 2=armv7l, 3=arm64, 4=universal
const ARCH_MAP = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64', 4: 'universal' };

function resolveArch(archEnum) {
  return ARCH_MAP[archEnum] || 'x64';
}

function copyDirPreservingBundles(src, dest, platform) {
  if (!existsSync(src)) return false;

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });

  if (platform === 'darwin') {
    // macOS app bundles contain signed frameworks with symlinks. Node's fs.cpSync
    // expands those links and breaks the nested signature; ditto preserves them.
    execFileSync('ditto', [src, dest]);
    return true;
  }

  cpSync(src, dest, { recursive: true });
  return true;
}

function copyBundledSnipaste(resourcesDir, platform, arch) {
  const src = join(__dirname, '..', 'resources', 'snipaste');
  const dest = join(resourcesDir, 'snipaste');

  if (!existsSync(src)) {
    return;
  }

  if (platform === 'darwin') {
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });

    const readmePath = join(src, 'README.md');
    if (existsSync(readmePath)) {
      cpSync(readmePath, join(dest, 'README.md'));
    }

    const sourceDirCandidates = [
      join(src, `darwin-${arch}`),
      join(src, 'darwin'),
    ];
    const sourceDir = sourceDirCandidates.find((candidate) => existsSync(candidate));
    if (!sourceDir) {
      console.warn('[after-pack] ⚠️  No bundled macOS Snipaste directory found.');
      return;
    }

    const sourceApp = join(sourceDir, 'Snipaste.app');
    if (!existsSync(sourceApp)) {
      console.warn(`[after-pack] ⚠️  Missing Snipaste.app at ${sourceApp}`);
      return;
    }

    const targetDir = join(dest, basename(sourceDir));
    mkdirSync(targetDir, { recursive: true });
    const archivePath = join(targetDir, 'Snipaste.app.zip');
    execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', sourceApp, archivePath]);
    console.log(`[after-pack] ✅ Archived bundled Snipaste app to ${archivePath}`);
    return;
  }

  copyDirPreservingBundles(src, dest, platform);
  console.log(`[after-pack] ✅ Copied bundled Snipaste resources to ${dest}`);
}

function isExecutableFile(mode) {
  return (mode & 0o111) !== 0;
}

function isMachOFile(file) {
  try {
    const output = execFileSync('file', ['-b', file], { encoding: 'utf8' });
    return output.includes('Mach-O');
  } catch {
    return false;
  }
}

function signMacCode(target, deep = false) {
  const args = ['--force', '--sign', '-'];
  if (deep) {
    args.push('--deep');
  }
  args.push('--preserve-metadata=identifier,requirements,flags,runtime');
  args.push(target);
  execFileSync('codesign', args, { stdio: 'pipe' });
}

function verifyMacCode(target, deep = false) {
  const args = ['--verify'];
  if (deep) {
    args.push('--deep');
  }
  args.push('--strict', '--verbose=2', target);
  execFileSync('codesign', args, { stdio: 'pipe' });
}

// ── macOS framework integrity guard ──────────────────────────────────────────
// electron-builder occasionally produces a packaged .app whose
// `Frameworks/Electron Framework.framework/Versions/A/Electron Framework`
// binary is missing. This silently passes electron-builder's own validation,
// then ships to users where macOS rejects the bundle as "damaged".
//
// Suspected triggers (cross-arch builds on arm64 CI runners):
//   - Partial / corrupted entry in the electron download cache
//   - File system / disk pressure during `ditto` of the framework
//
// Strategy: verify the binary exists and has a sensible size after pack. If it
// is missing, attempt to recover from the local electron download cache; if
// recovery is impossible, abort the build so we never ship a broken artifact.
function verifyMacAppBundle(appOutDir, productFilename, arch) {
  const { statSync } = require('node:fs');
  const appPath = join(appOutDir, `${productFilename}.app`);
  const frameworkDir = join(
    appPath,
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
  );
  const binaryPath = join(frameworkDir, 'Versions', 'A', 'Electron Framework');

  const MIN_BINARY_SIZE = 50 * 1024 * 1024; // sanity floor; real binary is ~150–250MB

  function describe() {
    try {
      return readdirSync(join(frameworkDir, 'Versions', 'A')).join(', ');
    } catch {
      return '<unreadable>';
    }
  }

  let needsRecover = false;
  if (!existsSync(binaryPath)) {
    console.error(
      `[after-pack] ❌ FATAL: Electron Framework binary missing at ${binaryPath}. Versions/A contents: [${describe()}]`,
    );
    needsRecover = true;
  } else {
    const stat = statSync(binaryPath);
    if (stat.size < MIN_BINARY_SIZE) {
      console.error(
        `[after-pack] ❌ FATAL: Electron Framework binary size ${stat.size} < ${MIN_BINARY_SIZE} (likely truncated).`,
      );
      needsRecover = true;
    }
  }

  if (needsRecover) {
    const recovered = tryRecoverFrameworkBinary(binaryPath, arch);
    if (!recovered) {
      throw new Error(
        `[after-pack] Could not recover Electron Framework binary for ${arch}. ` +
        `Refusing to ship a broken .app. Clear ~/Library/Caches/electron and retry the build.`,
      );
    }
    console.log(`[after-pack] 🩹 Recovered Electron Framework binary from electron download cache.`);
    // Re-sign the recovered binary so codesign --verify passes on the framework.
    try {
      signMacCode(binaryPath, false);
      verifyMacCode(binaryPath, false);
    } catch (err) {
      throw new Error(
        `[after-pack] Recovered framework binary failed re-sign/verify: ${err.message}`,
      );
    }
  }

  const finalStat = statSync(binaryPath);
  console.log(
    `[after-pack] ✅ Electron Framework binary OK (${arch}, ${(finalStat.size / 1024 / 1024).toFixed(1)}MB)`,
  );
}

// Look for a cached electron-${VERSION}-darwin-${arch}.zip in the standard
// electron download cache and pull the framework binary out of it. We only do
// this in CI / dev recovery — production should never need this path.
function tryRecoverFrameworkBinary(targetBinaryPath, arch) {
  const { mkdtempSync, copyFileSync, chmodSync } = require('node:fs');
  const os = require('node:os');

  const cacheRoot = process.env.ELECTRON_CACHE
    || join(os.homedir(), 'Library', 'Caches', 'electron');
  if (!existsSync(cacheRoot)) {
    console.error(`[after-pack]   No electron cache at ${cacheRoot}; cannot recover.`);
    return false;
  }

  // Find newest matching zip: electron-vXX.Y.Z-darwin-${arch}.zip
  const candidates = [];
  function walkCache(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walkCache(full);
      else if (e.isFile() && e.name.endsWith(`-darwin-${arch}.zip`)) candidates.push(full);
    }
  }
  walkCache(cacheRoot);
  if (candidates.length === 0) {
    console.error(`[after-pack]   No electron zip found for darwin-${arch} in ${cacheRoot}.`);
    return false;
  }

  // Prefer the largest (most likely complete) zip.
  candidates.sort((a, b) => {
    try { return require('node:fs').statSync(b).size - require('node:fs').statSync(a).size; }
    catch { return 0; }
  });

  const tmpDir = mkdtempSync(join(os.tmpdir(), 'electron-fw-recover-'));
  try {
    execFileSync('unzip', ['-q', '-o', candidates[0], '-d', tmpDir]);
    const sourceBinary = join(
      tmpDir,
      'Electron.app',
      'Contents',
      'Frameworks',
      'Electron Framework.framework',
      'Versions',
      'A',
      'Electron Framework',
    );
    if (!existsSync(sourceBinary)) {
      console.error(`[after-pack]   Cached zip ${candidates[0]} also missing the binary.`);
      return false;
    }
    mkdirSync(dirname(targetBinaryPath), { recursive: true });
    copyFileSync(sourceBinary, targetBinaryPath);
    chmodSync(targetBinaryPath, 0o755);
    return true;
  } catch (err) {
    console.error(`[after-pack]   Recovery from ${candidates[0]} failed: ${err.message}`);
    return false;
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  }
}

function resignBundledMacCode(resourcesDir) {
  const { statSync } = require('node:fs');
  const roots = [
    join(resourcesDir, 'bin'),
    join(resourcesDir, 'cli'),
  ];

  const visitedBundles = new Set();

  function walk(currentPath) {
    let entries;
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.endsWith('.app') || entry.name.endsWith('.framework')) {
          if (visitedBundles.has(fullPath)) continue;
          visitedBundles.add(fullPath);
          signMacCode(fullPath, true);
          verifyMacCode(fullPath, true);
          console.log(`[after-pack] ✅ Re-signed mac bundle ${fullPath}`);
          continue;
        }

        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (entry.name.endsWith('.dylib') || entry.name.endsWith('.node')) {
        signMacCode(fullPath, false);
        verifyMacCode(fullPath, false);
        console.log(`[after-pack] ✅ Re-signed mac library ${fullPath}`);
        continue;
      }

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (isExecutableFile(stat.mode) && isMachOFile(fullPath)) {
        signMacCode(fullPath, false);
        verifyMacCode(fullPath, false);
        console.log(`[after-pack] ✅ Re-signed mac executable ${fullPath}`);
      }
    }
  }

  for (const root of roots) {
    if (!existsSync(root)) continue;
    walk(root);
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const platform = context.electronPlatformName; // 'win32' | 'darwin' | 'linux'
  const arch = resolveArch(context.arch);

  console.log(`[after-pack] Target: ${platform}/${arch}`);

  let resourcesDir;
  if (platform === 'darwin') {
    const appName = context.packager.appInfo.productFilename;
    resourcesDir = join(appOutDir, `${appName}.app`, 'Contents', 'Resources');
  } else {
    resourcesDir = join(appOutDir, 'resources');
  }

  // Verify the .app bundle is structurally complete BEFORE we touch anything
  // else. If electron-builder produced a broken bundle, fail loud or recover
  // the missing framework binary now — never let a broken .app reach signing
  // or distribution.
  if (platform === 'darwin') {
    const productFilename = context.packager.appInfo.productFilename;
    verifyMacAppBundle(appOutDir, productFilename, arch);
  }

  copyBundledSnipaste(resourcesDir, platform, arch);

  if (platform === 'darwin') {
    resignBundledMacCode(resourcesDir);
  }
};
