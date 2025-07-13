#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from './lib/logger';

// Import commands directly
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

function registerCommands() {
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

async function main() {
  try {
    registerCommands();

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
