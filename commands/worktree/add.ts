import { execSync } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';
import { loading } from '../../lib/loading';
import { configManager } from '../../lib/config';
import { validateGitRepository } from '../../lib/utils';
import type { WorktreeOptions, WorktreeResult } from './types';

export function createWorktree(options: WorktreeOptions): WorktreeResult {
  validateGitRepository();

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
    options.path ||
    join(
      repoRoot,
      '..',
      `${repoName}_worktrees`,
      // use branch without prefix for directory path
      options.branch
    );

  // Check if branch exists
  let branchExists = false;
  try {
    execSync(`git rev-parse --verify ${finalBranch}`, { stdio: 'pipe' });
    branchExists = true;
  } catch {
    // Branch does not exist, will create it
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

  // Start loading animation
  loading.start('Creating worktree');

  // Execute git worktree command
  execSync(gitCommand, { stdio: 'pipe' });

  // Copy ignored files to the new worktree
  loading.updateMessage('Copying ignored files');
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

      execSync(rsyncCmd, {
        stdio: 'pipe',
        cwd: repoRoot,
      });
    }
  } catch (error) {
    // Failed to copy ignored files (non-fatal)
  }

  // Stop loading animation with success message
  loading.stop(`Worktree created successfully at ${chalk.cyan(worktreePath)}`);

  return {
    path: worktreePath,
    branch: finalBranch,
    repoRoot,
    repoName,
  };
}
