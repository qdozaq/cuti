import { execSync } from 'child_process';
import chalk from 'chalk';
import { logger } from '../../lib/logger';
import type { RemoveWorktreeOptions } from './types';
import { listWorktrees } from './list';

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
      // Lazy load node-fzf only when needed
      const nfzf = (await import('node-fzf')).default;
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
