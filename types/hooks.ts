import type { WorktreeResult } from '../commands/worktree/types';

export interface HookContext {
  command: string;
  subcommand: string;
  phase: 'pre' | 'post';
  args: {
    branch?: string;
    path?: string;
    force?: boolean;
    jira?: boolean;
    assign?: boolean;
    transition?: boolean;
    nameOnly?: boolean;
  };
  result?: WorktreeResult;
  error?: Error;
}

export interface HookConfig {
  enabled?: boolean;
  failOnError?: boolean;
  timeout?: number;
}

export interface HookExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}
