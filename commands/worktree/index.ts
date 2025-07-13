import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../../lib/logger';
import type { CLICommand } from '../../types/command';
import { createWorktree } from './add';
import { removeWorktree } from './remove';
import { listWorktrees } from './list';

class WorktreeCommand implements CLICommand {
  name = 'worktree';
  description = 'Manage git worktrees';

  register(program: Command): void {
    const worktreeCmd = program
      .command(this.name)
      .alias('wt')
      .description(this.description);

    // Add subcommand
    worktreeCmd
      .command('add <branch>')
      .description('Add a new worktree')
      .option(
        '-p, --path <path>',
        'custom path for the worktree (default: ../<repo-name>_worktrees/<branch-name>)'
      )
      .option('-c, --create', 'create a new branch')
      .option(
        '-f, --force',
        'force creation even if branch exists or has uncommitted changes'
      )
      .action(this.executeCreate.bind(this));

    // Remove subcommand
    worktreeCmd
      .command('remove [branch]')
      .alias('rm')
      .description('Remove an existing worktree')
      .option(
        '-f, --force',
        'force removal even if worktree has uncommitted changes'
      )
      .action(this.executeRemove.bind(this));

    // List subcommand
    worktreeCmd
      .command('list')
      .alias('ls')
      .description('List all worktrees')
      .action(this.executeList.bind(this));
  }

  private executeCreate(
    branch: string,
    options: {
      path?: string;
      create?: boolean;
      force?: boolean;
    }
  ): void {
    if (!branch) {
      logger.error('Branch name is required');
      process.exit(1);
    }

    try {
      const result = createWorktree({
        branch,
        ...options,
      });

      console.log(`\nTo navigate to your new worktree:`);
      console.log(chalk.cyan(`  cd "${result.path}"`));
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error('Operation failed');
      }
      process.exit(1);
    }
  }

  private async executeRemove(
    branch: string | undefined,
    options: {
      force?: boolean;
    }
  ): Promise<void> {
    try {
      await removeWorktree({
        branch,
        force: options.force,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error('Operation failed');
      }
      process.exit(1);
    }
  }

  private executeList(): void {
    try {
      const worktrees = listWorktrees();

      if (worktrees.length === 0) {
        logger.info('No worktrees found');
        return;
      }

      console.log('\nWorktrees:');
      for (const wt of worktrees) {
        const branch = wt.branch || '(detached HEAD)';
        console.log(
          `  ${chalk.cyan(branch.padEnd(30))} ${chalk.gray(wt.path)}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error('Failed to list worktrees');
      }
      process.exit(1);
    }
  }
}

export default new WorktreeCommand();
