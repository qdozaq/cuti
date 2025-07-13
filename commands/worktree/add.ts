import { execSync } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../../lib/logger';
import { configManager } from '../../lib/config';
import type { WorktreeOptions, WorktreeResult } from './types';

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

  // Apply branch prefix if configured
  const branchPrefix = configManager.get<string>('branchPrefix');
  const finalBranch = branchPrefix
    ? `${branchPrefix}${options.branch}`
    : options.branch;

  // Determine worktree path
  const worktreePath =
    options.path || join(repoRoot, '..', `${repoName}_worktrees`, finalBranch);

  // Check if branch exists
  let branchExists = false;
  try {
    execSync(`git rev-parse --verify ${finalBranch}`, { stdio: 'pipe' });
    branchExists = true;
    logger.debug(`Branch ${finalBranch} exists`);
  } catch {
    logger.debug(`Branch ${finalBranch} does not exist, will create it`);
  }

  // Build git worktree command
  let gitCommand = `git worktree add "${worktreePath}" `;

  if (!branchExists) {
    gitCommand += `-b ${finalBranch}`;
  } else {
    gitCommand += finalBranch;
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
    branch: finalBranch,
    repoRoot,
    repoName,
  };
}
