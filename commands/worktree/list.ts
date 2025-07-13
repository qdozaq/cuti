import { execSync } from 'child_process';
import type { WorktreeInfo } from './types';

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
