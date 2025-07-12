import { Command } from 'commander';
import { logger } from '../lib/logger';
import { parseKeyValue, formatList } from '../lib/utils';
import type { CLICommand } from '../types/command';
import chalk from 'chalk';

interface ConfigStore {
  [key: string]: string;
}

class ConfigCommand implements CLICommand {
  name = 'config';
  description = 'Manage configuration settings';
  private store: ConfigStore = {};

  register(program: Command): void {
    const configCmd = program.command(this.name).description(this.description);

    configCmd
      .command('set <key=value>')
      .description('Set a configuration value')
      .action(this.set.bind(this));

    configCmd
      .command('get <key>')
      .description('Get a configuration value')
      .action(this.get.bind(this));

    configCmd
      .command('delete <key>')
      .description('Delete a configuration value')
      .action(this.delete.bind(this));

    configCmd
      .command('list')
      .description('List all configuration values')
      .action(this.list.bind(this));

    configCmd
      .command('clear')
      .description('Clear all configuration values')
      .option('-f, --force', 'skip confirmation')
      .action(this.clear.bind(this));
  }

  private set(keyValue: string): void {
    const parsed = parseKeyValue(keyValue);

    if (!parsed) {
      logger.error('Invalid format. Use: config set key=value');
      process.exit(1);
    }

    const [key, value] = parsed;
    this.store[key] = value;

    logger.success(`Set ${chalk.bold(key)} = ${chalk.green(value)}`);
  }

  private get(key: string): void {
    if (key in this.store) {
      console.log(chalk.bold(key) + ':', chalk.green(this.store[key]));
    } else {
      logger.warning(`Key '${key}' not found`);
      process.exit(1);
    }
  }

  private delete(key: string): void {
    if (key in this.store) {
      delete this.store[key];
      logger.success(`Deleted key '${key}'`);
    } else {
      logger.warning(`Key '${key}' not found`);
      process.exit(1);
    }
  }

  private list(): void {
    const keys = Object.keys(this.store);

    if (keys.length === 0) {
      logger.info('No configuration values set');
      return;
    }

    logger.highlight('Configuration values:');
    for (const key of keys) {
      console.log(`  ${chalk.bold(key)}: ${chalk.green(this.store[key])}`);
    }
  }

  private async clear(options: { force: boolean }): Promise<void> {
    const count = Object.keys(this.store).length;

    if (count === 0) {
      logger.info('No configuration values to clear');
      return;
    }

    if (!options.force) {
      logger.warning(`This will delete ${count} configuration value(s).`);
      logger.info('Use --force to skip this confirmation.');
      process.exit(1);
    }

    this.store = {};
    logger.success(`Cleared ${count} configuration value(s)`);
  }
}

export default new ConfigCommand();
