import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type Platform = 'darwin' | 'win32' | 'linux';

export interface RequirementInput {
  name: string;
  minVersion?: string;
  label?: string;
  installCommand?: Partial<Record<Platform, string>>;
}

export interface CheckResult {
  name: string;
  ok: boolean;
  version?: string;
  reason?: 'missing' | 'version-too-old';
  label?: string;
  installCommand?: Partial<Record<Platform, string>>;
}

export interface PreflightResult {
  ok: boolean;
  platform: Platform;
  results: CheckResult[];
}

const DEFAULT_INSTALL_COMMANDS: Record<string, Partial<Record<Platform, string>>> = {
  node: {
    darwin: 'brew install node',
    win32: 'winget install OpenJS.NodeJS',
    linux: 'sudo apt-get install -y nodejs',
  },
  ffmpeg: {
    darwin: 'brew install ffmpeg',
    win32: 'winget install Gyan.FFmpeg',
    linux: 'sudo apt-get install -y ffmpeg',
  },
  python3: {
    darwin: 'brew install python@3.11',
    win32: 'winget install Python.Python.3.11',
    linux: 'sudo apt-get install -y python3',
  },
  git: {
    darwin: 'brew install git',
    win32: 'winget install Git.Git',
    linux: 'sudo apt-get install -y git',
  },
};

function currentPlatform(): Platform {
  const p = process.platform;
  if (p === 'darwin' || p === 'win32' || p === 'linux') return p;
  return 'linux';
}

async function whichBinary(name: string): Promise<boolean> {
  const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    await execFileAsync(cmd, [name], { timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function readVersion(name: string): Promise<string | undefined> {
  const args = name === 'ffmpeg' ? ['-version'] : ['--version'];
  try {
    const { stdout, stderr } = await execFileAsync(name, args, {
      timeout: 5000,
      windowsHide: true,
    });
    const text = `${stdout || ''}\n${stderr || ''}`;
    const match = text.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    return match ? `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ''}` : undefined;
  } catch {
    return undefined;
  }
}

function parseMajor(version: string | undefined): number | undefined {
  if (!version) return undefined;
  const m = version.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

function meetsMinVersion(version: string | undefined, minVersion: string): boolean {
  const have = parseMajor(version);
  const need = parseMajor(minVersion);
  if (have == null || need == null) return true;
  return have >= need;
}

export async function checkRequirement(req: RequirementInput): Promise<CheckResult> {
  const installCommand = req.installCommand ?? DEFAULT_INSTALL_COMMANDS[req.name];
  const onPath = await whichBinary(req.name);
  if (!onPath) {
    return {
      name: req.name,
      ok: false,
      reason: 'missing',
      label: req.label,
      installCommand,
    };
  }
  const version = await readVersion(req.name);
  if (req.minVersion && version && !meetsMinVersion(version, req.minVersion)) {
    return {
      name: req.name,
      ok: false,
      version,
      reason: 'version-too-old',
      label: req.label,
      installCommand,
    };
  }
  return {
    name: req.name,
    ok: true,
    version,
    label: req.label,
    installCommand,
  };
}

export async function runPreflight(requirements: RequirementInput[]): Promise<PreflightResult> {
  const results = await Promise.all(requirements.map(checkRequirement));
  return {
    ok: results.every((r) => r.ok),
    platform: currentPlatform(),
    results,
  };
}
