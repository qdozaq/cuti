import { Command } from 'commander';
import { logger } from '../lib/logger';
import type { CLICommand } from '../types/command';
import { execSync } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';
import nfzf from 'node-fzf';

export interface WorktreeOptions {
  branch: string;
  path?: string;
  create?: boolean;
  force?: boolean;
}

export interface WorktreeResult {
  path: string;
  branch: string;
  repoRoot: string;
  repoName: string;
}

export interface RemoveWorktreeOptions {
  branch?: string;
  force?: boolean;
}

interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
}

export function listWorktrees(): WorktreeInfo[] {
  try {
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf8',
    });

    const worktrees: WorktreeInfo[] = [];
    const lines = output.split('\n');

    let currentWorktree: Partial<WorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as WorktreeInfo);
        }
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.commit = line.substring(5);
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7).replace('refs/heads/', '');
      } else if (line === '' && currentWorktree.path) {
        worktrees.push(currentWorktree as WorktreeInfo);
        currentWorktree = {};
      }
    }

    // Don't forget the last one
    if (currentWorktree.path) {
      worktrees.push(currentWorktree as WorktreeInfo);
    }

    return worktrees;
  } catch (error) {
    throw new Error('Failed to list worktrees');
  }
}

export function createWorktree(options: WorktreeOptions): WorktreeResult {
  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch {
    throw new Error('Not in a git repository');
  }

  // Get the repository root
  const repoRoot = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
  }).trim();
  const repoName = repoRoot.split('/').pop() || 'repo';

  // Determine worktree path
  const worktreePath =
    options.path ||
    join(repoRoot, '..', `${repoName}_worktrees`, options.branch);

  // Build git worktree command
  let gitCommand = `git worktree add "${worktreePath}" `;

  if (options.create) {
    gitCommand += `-b ${options.branch}`;
  } else {
    gitCommand += options.branch;
  }

  if (options.force) {
    gitCommand += ' --force';
  }

  logger.info(`Creating worktree at: ${chalk.cyan(worktreePath)}`);
  logger.debug(`Executing: ${gitCommand}`);

  // Execute git worktree command
  execSync(gitCommand, { stdio: 'inherit' });

  logger.success(`Worktree created successfully!`);

  // Copy ignored files to the new worktree
  logger.info('Copying ignored files to new worktree...');
  try {
    // Get list of ignored files/directories
    const ignoredFiles = execSync(
      'git ls-files --ignored --exclude-standard --directory --others',
      {
        encoding: 'utf8',
        cwd: repoRoot,
      }
    )
      .trim()
      .split('\n')
      .filter((f) => f);

    if (ignoredFiles.length > 0) {
      // Create rsync command to copy ignored files
      const rsyncCmd = `rsync -av --relative ${ignoredFiles.map((f) => `"./${f}"`).join(' ')} "${worktreePath}/"`;

      logger.debug(`Copying ${ignoredFiles.length} ignored files/directories`);
      execSync(rsyncCmd, {
        stdio: 'pipe',
        cwd: repoRoot,
      });

      logger.success(`Copied ${ignoredFiles.length} ignored files/directories`);
    } else {
      logger.debug('No ignored files to copy');
    }
  } catch (error) {
    logger.warning('Failed to copy ignored files (this is non-fatal)');
    logger.debug(`Error: ${error}`);
  }

  return {
    path: worktreePath,
    branch: options.branch,
    repoRoot,
    repoName,
  };
}

export async function removeWorktree(
  options: RemoveWorktreeOptions
): Promise<void> {
  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch {
    throw new Error('Not in a git repository');
  }

  let branchToRemove = options.branch;

  // If no branch provided, show interactive selection
  if (!branchToRemove) {
    const worktrees = listWorktrees();

    // Filter out the main worktree (the one without a branch)
    const removableWorktrees = worktrees.filter((wt) => wt.branch);

    if (removableWorktrees.length === 0) {
      throw new Error('No worktrees available to remove');
    }

    // Prepare list for fzf
    const fzfList = removableWorktrees.map(
      (wt) => `${wt.branch.padEnd(30)} ${wt.path}`
    );

    try {
      const result = await nfzf({
        list: fzfList,
        height: 40, // 40% of screen
        query: '',
      });

      if (!result.selected) {
        throw new Error('No worktree selected');
      }

      // Extract branch name from the selected value
      branchToRemove = removableWorktrees[result.selected.index]?.branch;
      if (!branchToRemove) {
        throw new Error('Invalid selection');
      }
    } catch (error) {
      throw new Error('Selection cancelled');
    }
  }

  logger.info(`Removing worktree for branch: ${chalk.cyan(branchToRemove)}`);

  // Build git worktree remove command
  let gitCommand = `git worktree remove ${branchToRemove}`;

  if (options.force) {
    gitCommand += ' --force';
  }

  logger.debug(`Executing: ${gitCommand}`);

  try {
    // Execute git worktree remove command
    execSync(gitCommand, { stdio: 'inherit' });
    logger.success(`Worktree removed successfully!`);
  } catch (error) {
    // If removal by branch name fails, try to list worktrees and find the path
    logger.debug(
      'Failed to remove by branch name, trying to find worktree path...'
    );

    try {
      // Get list of worktrees
      const worktrees = execSync('git worktree list --porcelain', {
        encoding: 'utf8',
      });

      // Parse worktrees to find the one with our branch
      const lines = worktrees.split('\n');
      let worktreePath = '';

      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const nextLine = lines[i + 1];

        if (
          currentLine &&
          currentLine.startsWith('worktree ') &&
          nextLine &&
          nextLine === `branch refs/heads/${branchToRemove}`
        ) {
          worktreePath = currentLine.substring(9); // Remove 'worktree ' prefix
          break;
        }
      }

      if (worktreePath) {
        gitCommand = `git worktree remove "${worktreePath}"`;
        if (options.force) {
          gitCommand += ' --force';
        }

        logger.debug(`Found worktree at: ${worktreePath}`);
        logger.debug(`Executing: ${gitCommand}`);

        execSync(gitCommand, { stdio: 'inherit' });
        logger.success(`Worktree removed successfully!`);
      } else {
        throw new Error(`No worktree found for branch: ${branchToRemove}`);
      }
    } catch (innerError) {
      throw new Error(
        `Failed to remove worktree: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`
      );
    }
  }
}

class WorktreeCommand implements CLICommand {
  name = 'worktree';
  description = 'Manage git worktrees';

  register(program: Command): void {
    const worktreeCmd = program
      .command(this.name)
      .alias('wt')
      .description(this.description)
      .argument(
        '[branch]',
        'branch name for the worktree (default action: create)'
      )
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

    // Create subcommand
    worktreeCmd
      .command('create <branch>')
      .description('Create a new worktree')
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
