import chalk from 'chalk';
import { logger } from '../../lib/logger';
import type { RemoveWorktreeOptions } from './types';
import { listWorktrees } from './list';
import { validateGitRepository } from '../../lib/utils';
import { execSync } from 'child_process';

export async function removeWorktree(
  options: RemoveWorktreeOptions
): Promise<void> {
  validateGitRepository();

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
      (wt) => `${wt.branch?.padEnd(30)} ${wt.path}`
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

  const worktreePath = listWorktrees().find(
    (wt) => wt.branch === branchToRemove
  )?.path;

  if (!worktreePath) {
    throw new Error(`No worktree found for branch: ${branchToRemove}`);
  }

  logger.info(`Removing worktree for branch: ${chalk.cyan(branchToRemove)}`);
  logger.debug(`Worktree path: ${worktreePath}`);
  let gitCommand = `git worktree remove "${worktreePath}"`;

  if (options.force) {
    gitCommand += ' --force';
  }

  try {
    execSync(gitCommand, { stdio: 'inherit' });
    logger.success(`Worktree removed successfully!`);
  } catch (error) {
    throw new Error(
      `Failed to remove worktree: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
