import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../../lib/logger';
import type { CLICommand } from '../../types/command';
import { createWorktree } from './add';
import { removeWorktree } from './remove';
import { listWorktrees } from './list';
import { preprocessJiraIssue } from './add-jira';

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
      .option(
        '-f, --force',
        'force creation even if branch exists or has uncommitted changes'
      )
      .option(
        '-j, --jira',
        'treat the branch parameter as a Jira issue key or URL'
      )
      .option(
        '--no-assign',
        "Don't assign the Jira issue to yourself (only with --jira)"
      )
      .option(
        '--no-transition',
        "Don't transition the Jira issue to In Progress (only with --jira)"
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

  private async executeCreate(
    branch: string,
    options: {
      path?: string;
      force?: boolean;
      jira?: boolean;
      assign?: boolean;
      transition?: boolean;
    }
  ): Promise<void> {
    if (!branch) {
      logger.error('Branch name is required');
      process.exit(1);
    }

    try {
      let actualBranch = branch;

      // If --jira flag is set, preprocess the Jira issue
      if (options.jira) {
        const jiraResult = await preprocessJiraIssue(branch, {
          noAssign: !options.assign,
          noTransition: !options.transition,
        });
        actualBranch = jiraResult.branchName;
      }

      const result = createWorktree({
        branch: actualBranch,
        path: options.path,
        force: options.force,
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
