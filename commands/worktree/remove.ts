import chalk from 'chalk';
import { logger } from '../../lib/logger';
import type { RemoveWorktreeOptions } from './types';
import { listWorktrees } from './list';
import { validateGitRepository } from '../../lib/utils';
import { execSync } from 'child_process';
import { stderrContext } from '../../lib/prompts';

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

    // Lazy load inquirer only when needed
    const { select } = await import('@inquirer/prompts');

    // Prepare choices for inquirer
    const choices = removableWorktrees.map((wt) => ({
      name: `${wt.branch?.padEnd(30)} ${wt.path}`,
      value: wt.branch,
    }));

    try {
      branchToRemove = await select(
        {
          message: 'Select a worktree to remove:',
          choices,
        },
        stderrContext
      );

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
