import { Command } from 'commander';
import { logger } from '../lib/logger';
import { configManager } from '../lib/config';
import type { CLICommand } from '../types/command';
import chalk from 'chalk';

class ConfigCommand implements CLICommand {
  name = 'config';
  description = 'Manage configuration settings';

  register(program: Command): void {
    const configCmd = program.command(this.name).description(this.description);

    configCmd
      .command('get <key>')
      .description('Display configuration value')
      .action(this.get.bind(this));

    configCmd
      .command('set <key> <value>')
      .description('Set configuration value')
      .option('--global', 'Set value in global config (~/.cuti/config.json)')
      .action(this.set.bind(this));

    configCmd
      .command('list')
      .description('List all configuration values')
      .option('--global', 'Show only global config')
      .option('--local', 'Show only local config')
      .action(this.list.bind(this));

    configCmd
      .command('reset')
      .description('Reset configuration to defaults')
      .option('--global', 'Reset only global config')
      .option('--local', 'Reset only local config')
      .option('-f, --force', 'Skip confirmation')
      .action(this.reset.bind(this));

    configCmd
      .command('init')
      .description('Initialize local config file (.cuti/config.json)')
      .action(this.init.bind(this));

    // Keep the delete command for backward compatibility
    configCmd
      .command('delete <key>')
      .description('Delete a configuration value')
      .option('--global', 'Delete from global config')
      .action(this.delete.bind(this));
  }

  private get(key: string): void {
    const value = configManager.get(key);

    if (value !== undefined) {
      console.log(
        chalk.bold(key) + ':',
        chalk.green(
          typeof value === 'object' ? JSON.stringify(value, null, 2) : value
        )
      );
    } else {
      logger.warning(`Key '${key}' not found`);
      process.exit(1);
    }
  }

  private async set(
    key: string,
    value: string,
    options: { global?: boolean }
  ): Promise<void> {
    try {
      // Try to parse value as JSON for complex values
      let parsedValue: any = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // If not valid JSON, treat as string
        parsedValue = value;
      }

      await configManager.set(key, parsedValue, options.global || false);

      const location = options.global ? 'global' : 'local';
      logger.success(
        `Set ${chalk.bold(key)} = ${chalk.green(typeof parsedValue === 'object' ? JSON.stringify(parsedValue) : parsedValue)} in ${location} config`
      );
    } catch (error) {
      logger.error(`Failed to set configuration: ${error}`);
      process.exit(1);
    }
  }

  private async delete(
    key: string,
    options: { global?: boolean }
  ): Promise<void> {
    try {
      await configManager.delete(key, options.global || false);

      const location = options.global ? 'global' : 'local';
      logger.success(`Deleted key '${key}' from ${location} config`);
    } catch (error) {
      logger.error(`Failed to delete key: ${error}`);
      process.exit(1);
    }
  }

  private list(options: { global?: boolean; local?: boolean }): void {
    if (options.global && options.local) {
      logger.error('Cannot use both --global and --local flags');
      process.exit(1);
    }

    const config = configManager.getConfig();

    if (options.global) {
      // Show global config
      const configs = configManager.listConfigs('global');
      if (configs.global && Object.keys(configs.global).length > 0) {
        this.displayConfig(
          `Global Configuration (${configManager.getGlobalConfigPath()})`,
          configs.global
        );
      } else {
        logger.info('No global configuration found');
      }
    } else if (options.local) {
      // Show local config
      const configs = configManager.listConfigs('local');
      if (configs.local && Object.keys(configs.local).length > 0) {
        this.displayConfig(
          `Local Configuration (${configManager.getLocalConfigPath()})`,
          configs.local
        );
      } else {
        logger.info('No local configuration found');
      }
    } else {
      // Show merged configuration
      const hasGlobal = configManager.hasGlobalConfig();
      const hasLocal = configManager.hasLocalConfig();

      if (hasGlobal || hasLocal) {
        let title = 'Configuration';
        if (hasGlobal && hasLocal) {
          title += ' (Local overrides Global)';
        } else if (hasGlobal) {
          title += ' (Global only)';
        } else {
          title += ' (Local only)';
        }

        this.displayConfig(title, config);

        if (hasGlobal) {
          console.log();
          logger.info(`Global config: ${configManager.getGlobalConfigPath()}`);
        }
        if (hasLocal) {
          logger.info(`Local config: ${configManager.getLocalConfigPath()}`);
        }
      } else {
        logger.info('No configuration found');
        logger.info('Use "config init" to create a local config file');
        logger.info(
          'Use "config set <key> <value> --global" to create a global config'
        );
      }
    }
  }

  private async reset(options: {
    global?: boolean;
    local?: boolean;
    force?: boolean;
  }): Promise<void> {
    if (options.global && options.local) {
      logger.error('Cannot use both --global and --local flags');
      process.exit(1);
    }

    const scope = options.global ? 'global' : options.local ? 'local' : 'all';

    if (!options.force) {
      const message =
        scope === 'all'
          ? 'This will reset both global and local configurations to defaults.'
          : `This will reset ${scope} configuration to defaults.`;
      logger.warning(message);
      logger.info('Use --force to skip this confirmation.');
      process.exit(1);
    }

    try {
      if (scope === 'global' || scope === 'all') {
        await configManager.clearGlobal();
      }
      if (scope === 'local' || scope === 'all') {
        await configManager.clearLocal();
      }

      const message =
        scope === 'all'
          ? 'Reset both global and local configurations to defaults'
          : `Reset ${scope} configuration to defaults`;
      logger.success(message);
    } catch (error) {
      logger.error(`Failed to reset configuration: ${error}`);
      process.exit(1);
    }
  }

  private async init(): Promise<void> {
    try {
      const localPath = configManager.getLocalConfigPath();

      if (configManager.hasLocalConfig()) {
        logger.info(`Local config file already exists at ${localPath}`);
        return;
      }

      // Create an empty local config with just the version
      await configManager.set('version', '1.0.0', false);
      logger.success(`Initialized local config file at ${localPath}`);
    } catch (error) {
      logger.error(`Failed to initialize local config: ${error}`);
      process.exit(1);
    }
  }

  private displayConfig(title: string, config: any): void {
    logger.highlight(title);
    const formatted = this.formatObject(config, '  ');
    console.log(formatted);
  }

  private formatObject(obj: any, indent: string = ''): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`${indent}${chalk.bold(key)}:`);
        lines.push(this.formatObject(value, indent + '  '));
      } else {
        const displayValue =
          typeof value === 'string'
            ? chalk.green(value)
            : chalk.yellow(String(value));
        lines.push(`${indent}${chalk.bold(key)}: ${displayValue}`);
      }
    }

    return lines.join('\n');
  }
}

export default new ConfigCommand();
