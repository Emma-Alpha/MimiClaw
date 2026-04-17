import { describe, expect, it } from 'vitest';

/** Mirrors strip + line parse in electron/gateway/skills-cli.ts (no Electron imports). */
function stripAnsi(line: string): string {
  const esc = String.fromCharCode(27);
  const csi = String.fromCharCode(155);
  const pattern = `(?:${esc}|${csi})[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`;
  return line.replace(new RegExp(pattern, 'g'), '').trim();
}

function parseFindOutput(raw: string): Array<{ slug: string; name: string; description: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => stripAnsi(l))
    .map((l) => l.trim())
    .filter(Boolean);
  const results: Array<{ slug: string; name: string; description: string }> = [];
  let pending: Partial<{ slug: string; name: string; description: string }> | null = null;
  for (const line of lines) {
    if (line.includes('Install with') || line.startsWith('████')) continue;
    const idMatch = line.match(/^([^\s]+\/[^\s]+@[^\s]+)\s*(.*)$/);
    if (idMatch) {
      if (pending?.slug) {
        results.push(pending as { slug: string; name: string; description: string });
      }
      const slug = idMatch[1];
      const rest = idMatch[2]?.trim() ?? '';
      pending = {
        slug,
        name: slug.split('@').pop() ?? slug,
        description: rest,
      };
      continue;
    }
  }
  if (pending?.slug) {
    results.push(pending as { slug: string; name: string; description: string });
  }
  return results;
}

describe('parseFindOutput', () => {
  it('parses owner/repo@skill lines', () => {
    const raw = `
foo/bar@baz 12 installs
└ https://skills.sh/foo/bar/baz
`.trim();
    const r = parseFindOutput(raw);
    expect(r).toHaveLength(1);
    expect(r[0].slug).toBe('foo/bar@baz');
  });
});
