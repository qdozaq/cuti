export interface WorktreeOptions {
  branch: string;
  path?: string;
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

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
}
