import { execSync } from 'child_process';

export function formatList(items: string[]): string {
  return items.map((item) => `  • ${item}`).join('\n');
}

export function parseKeyValue(value: string): [string, string] | null {
  const [key, ...rest] = value.split('=');
  if (!key || rest.length === 0) {
    return null;
  }
  return [key.trim(), rest.join('=').trim()];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function validateGitRepository(): void {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch {
    throw new Error('Not in a git repository');
  }
}
