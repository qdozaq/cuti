#!/usr/bin/env node

import { Command } from 'commander';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { logger } from './lib/logger';
import { loadCommands } from './lib/utils';
import type { CLICommand } from './types/command';

// Import commands directly for bundling
import helloCommand from './commands/hello';
import configCommand from './commands/config';
import worktreeCommand from './commands/worktree/index';

const program = new Command();

program
  .name('cuti')
  .description('A modular CLI tool built with Commander.js')
  .version('1.0.0')
  .option('-d, --debug', 'enable debug mode')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().debug) {
      logger.setDebugMode(true);
      logger.debug('Debug mode enabled');
    }
  });

async function loadAndRegisterCommands() {
  // For development: try dynamic loading first
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const commandsPath = join(__dirname, 'commands');

  if (existsSync(commandsPath)) {
    const commandFiles = await loadCommands(commandsPath);

    for (const commandFile of commandFiles) {
      try {
        // Try .ts first (development), then .js (built)
        let commandPath = join(commandsPath, `${commandFile}.ts`);
        if (!existsSync(commandPath)) {
          commandPath = join(commandsPath, `${commandFile}.js`);
          if (!existsSync(commandPath)) {
            continue;
          }
        }

        logger.debug(`Loading command: ${commandFile}`);
        const module = await import(commandPath);
        const command: CLICommand = module.default;

        if (command && typeof command.register === 'function') {
          command.register(program);
          logger.debug(`Registered command: ${command.name}`);
        } else {
          logger.warning(`Invalid command module: ${commandFile}`);
        }
      } catch (error) {
        logger.error(`Failed to load command ${commandFile}: ${error}`);
      }
    }
  } else {
    // For bundled version: register commands directly
    logger.debug('Loading bundled commands');
    const commands = [helloCommand, configCommand, worktreeCommand];

    for (const command of commands) {
      try {
        if (command && typeof command.register === 'function') {
          command.register(program);
          logger.debug(`Registered command: ${command.name}`);
        }
      } catch (error) {
        logger.error(`Failed to register command: ${error}`);
      }
    }
  }
}

async function main() {
  try {
    await loadAndRegisterCommands();

    if (process.argv.length === 2) {
      program.outputHelp();
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (error) {
    logger.error(error as Error);
    process.exit(1);
  }
}

main();
