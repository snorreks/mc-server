#!/usr/bin/env bun
// scripts/src/lib/cli_utils.ts
// CLI utilities for setup scripts.

// ── ANSI Colours ─────────────────────────────────────────────────────────────

export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
};

export const fmt = {
  ok: (s: string) => `${c.green}✓${c.reset} ${s}`,
  warn: (s: string) => `${c.yellow}!${c.reset} ${s}`,
  err: (s: string) => `${c.red}✗${c.reset} ${s}`,
  fix: (s: string) => `${c.cyan}→${c.reset} ${s}`,
  head: (s: string) => `\n${c.bold}${c.white}${s}${c.reset}`,
  note: (s: string) => `     ${c.dim}${s}${c.reset}`,
  section: (s: string) => `\n${c.bold}${c.cyan}── ${s} ──${c.reset}`,
  cmd: (s: string) => `     ${c.dim}${s}${c.reset}`,
  url: (s: string) => `     ${c.magenta}${s}${c.reset}`,
  step: (n: number, s: string) => `  ${c.bold}${c.blue}${n}.${c.reset} ${s}`,
};

// ── Argument Parsing ─────────────────────────────────────────────────────────

export function getArg(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = args.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

// ── Interactive Prompts ──────────────────────────────────────────────────────

export function ask(question: string, fallback?: string): string {
  const text = `${c.cyan}?${c.reset} ${question}${fallback ? ` [${fallback}]` : ''}: `;
  const answer = prompt(text);
  return (answer?.trim() || fallback || '').trim();
}

export function confirm(question: string, defaultValue = false): boolean {
  const suffix = defaultValue ? ' [Y/n]' : ' [y/N]';
  const answer = prompt(`${c.cyan}?${c.reset} ${question}${suffix}: `);
  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

/**
 * Read multi-line input until a delimiter is entered on its own line.
 */
export async function readMultiLine(label: string, delimiter = 'EOF'): Promise<string> {
  console.log(`\n${c.cyan}→${c.reset} ${label}`);
  console.log(`${c.dim}(Type "${delimiter}" on a new line when done)${c.reset}`);
  const lines: string[] = [];
  while (true) {
    const line = prompt('');
    if (line === null || line.trim() === delimiter) break;
    lines.push(line);
  }
  return lines.join('\n');
}

// ── Command Execution ────────────────────────────────────────────────────────

export type RunResult = { out: string; err: string; code: number };

export async function run(cmd: string[]): Promise<RunResult> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { out: out.trim(), err: err.trim(), code };
}

/**
 * Run a gcloud command (prepends 'gcloud' and '--quiet').
 */
export const gcloud = async (...args: string[]): Promise<RunResult> =>
  run(['gcloud', ...args, '--format=json', '--quiet']);

/**
 * Print an ASCII banner.
 */
export const banner = (title: string): void => {
  const width = 51;
  const padded = title.padEnd(width - 2);
  console.log(`${c.bold}
╔${'═'.repeat(width)}╗
║  ${padded}║
╚${'═'.repeat(width)}╝${c.reset}\n`);
};
