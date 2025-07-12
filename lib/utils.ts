import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { logger } from './logger';

export async function loadCommands(commandsPath: string): Promise<string[]> {
  try {
    if (!existsSync(commandsPath)) {
      logger.debug(`Commands directory not found: ${commandsPath}`);
      return [];
    }

    const files = await readdir(commandsPath);
    return files
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .map(file => file.replace(/\.(ts|js)$/, ''));
  } catch (error) {
    logger.error(`Failed to load commands: ${error}`);
    return [];
  }
}

export function formatList(items: string[]): string {
  return items.map(item => `  • ${item}`).join('\n');
}

export function parseKeyValue(value: string): [string, string] | null {
  const [key, ...rest] = value.split('=');
  if (!key || rest.length === 0) {
    return null;
  }
  return [key.trim(), rest.join('=').trim()];
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}