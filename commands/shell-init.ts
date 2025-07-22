import { Command } from 'commander';
import { logger } from '../lib/logger.js';
import type { CLICommand } from '../types/command.js';
import {
  getBashIntegration,
  getZshIntegration,
  getFishIntegration,
} from '../lib/shell-integration.js';

class ShellInitCommand implements CLICommand {
  name = 'shell-init';
  description = 'Output shell integration script';

  register(program: Command): void {
    program
      .command(this.name)
      .description(this.description)
      .argument('[shell]', 'shell type (bash, zsh, fish)', 'bash')
      .action(this.execute.bind(this));
  }

  private execute(shell: string): void {
    const supportedShells = ['bash', 'zsh', 'fish'];

    if (!supportedShells.includes(shell)) {
      logger.error(`Unsupported shell: ${shell}`);
      logger.info(`Supported shells: ${supportedShells.join(', ')}`);
      process.exit(1);
    }

    switch (shell) {
      case 'bash':
        console.log(getBashIntegration());
        break;
      case 'zsh':
        console.log(getZshIntegration());
        break;
      case 'fish':
        console.log(getFishIntegration());
        break;
    }
  }
}

export default new ShellInitCommand();
