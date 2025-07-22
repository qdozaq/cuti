import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../../lib/logger';
import type { CLICommand } from '../../types/command';
import { createWorktree } from './add';
import { removeWorktree } from './remove';
import { listWorktrees } from './list';
import { preprocessJiraIssue } from './add-jira';
import { stderrContext } from '../../lib/prompts';

class WorktreeCommand implements CLICommand {
  name = 'worktree';
  description = 'Manage git worktrees';

  register(program: Command): void {
    const worktreeCmd = program
      .command(this.name)
      .alias('wt')
      .description(this.description)
      .action(this.executeInteractiveSelect.bind(this));

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
      .option(
        '--name-only',
        'Only generate and output the branch name without creating worktree (only with --jira)'
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
      nameOnly?: boolean;
    }
  ): Promise<void> {
    if (!branch) {
      logger.error('Branch name is required');
      process.exit(1);
    }

    // Validate that --name-only is only used with --jira
    if (options.nameOnly && !options.jira) {
      logger.error('--name-only can only be used with --jira flag');
      process.exit(1);
    }

    try {
      let actualBranch = branch;

      // If --jira flag is set, preprocess the Jira issue
      if (options.jira) {
        const jiraResult = await preprocessJiraIssue(branch, {
          noAssign: options.nameOnly || !options.assign,
          noTransition: options.nameOnly || !options.transition,
        });
        actualBranch = jiraResult.branchName;

        // If --name-only flag is set, just output the branch name and exit
        if (options.nameOnly) {
          console.log(actualBranch);
          return;
        }
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

  private async executeInteractiveSelect(): Promise<void> {
    // Check if running in shell integration mode
    if (process.env.CUTI_SHELL_CD === '1') {
      try {
        const worktrees = listWorktrees();

        if (worktrees.length === 0) {
          logger.error('No worktrees found');
          process.exit(1);
        }

        // If only one worktree (main), just output its path
        if (worktrees.length === 1 && worktrees[0]) {
          console.log(worktrees[0].path);
          return;
        }

        // Lazy load inquirer only when needed
        const { select } = await import('@inquirer/prompts');

        // Prepare choices for inquirer
        const choices = worktrees.map((wt) => ({
          name: `${(wt.branch || 'main').padEnd(30)} ${wt.path}`,
          value: wt.path,
        }));

        try {
          const selectedPath = await select(
            {
              message: 'Select a worktree to navigate to:',
              choices,
            },
            stderrContext
          );

          // Output ONLY the path to stdout for shell integration
          // Use write instead of console.log to avoid extra newline
          process.stdout.write(selectedPath);
        } catch (innerError) {
          // User cancelled selection
          logger.error('Selection cancelled');
          process.exit(1);
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error('Selection cancelled');
        }
        process.exit(1);
      }
    } else {
      // Normal mode - just list worktrees
      this.executeList();
    }
  }
}

export default new WorktreeCommand();
