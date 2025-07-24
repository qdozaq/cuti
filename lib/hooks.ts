import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { configManager } from './config';
import type {
  HookContext,
  HookExecutionResult,
  HookConfig,
} from '../types/hooks';

export class HookManager {
  private readonly hooksDir: string;
  private readonly config: HookConfig;

  constructor(hooksDir?: string) {
    this.hooksDir = hooksDir || join(process.cwd(), '.cuti', 'hooks');
    const defaultConfig: HookConfig = {
      enabled: true,
      failOnError: false,
      timeout: 30000,
    };
    this.config = {
      ...defaultConfig,
      ...(configManager.get<HookConfig>('hooks') || {}),
    };
  }

  private isExecutable(filePath: string): boolean {
    try {
      const stats = statSync(filePath);
      return stats.isFile() && (stats.mode & 0o111) !== 0;
    } catch {
      return false;
    }
  }

  private findHooks(hookType: string): string[] {
    if (!existsSync(this.hooksDir)) {
      logger.debug(`Hooks directory not found: ${this.hooksDir}`);
      return [];
    }

    try {
      const files = readdirSync(this.hooksDir);
      const hooks = files
        .filter((file) => file === hookType || file.startsWith(`${hookType}.`))
        .map((file) => join(this.hooksDir, file))
        .filter((filePath) => this.isExecutable(filePath))
        .sort();

      logger.debug(`Found ${hooks.length} hooks for ${hookType}`);
      return hooks;
    } catch (error) {
      logger.debug(`Error reading hooks directory: ${error}`);
      return [];
    }
  }

  private async executeHook(
    hookPath: string,
    context: HookContext
  ): Promise<HookExecutionResult> {
    const hookName = hookPath.split('/').pop() || 'unknown';
    logger.debug(`Executing hook: ${hookName}`);

    const env: Record<string, string | undefined> = {
      ...process.env,
      CUTI_HOOK_COMMAND: context.command,
      CUTI_HOOK_SUBCOMMAND: context.subcommand,
      CUTI_HOOK_PHASE: context.phase,
      CUTI_HOOK_BRANCH: context.args.branch || '',
      CUTI_HOOK_PATH: context.args.path || '',
      CUTI_HOOK_FORCE: context.args.force ? 'true' : 'false',
      CUTI_HOOK_JIRA: context.args.jira ? 'true' : 'false',
      CUTI_HOOK_CONTEXT: JSON.stringify(context),
    };

    if (context.result) {
      env['CUTI_HOOK_RESULT_PATH'] = context.result.path;
      env['CUTI_HOOK_RESULT_BRANCH'] = context.result.branch;
      env['CUTI_HOOK_RESULT_REPO_ROOT'] = context.result.repoRoot;
      env['CUTI_HOOK_RESULT_REPO_NAME'] = context.result.repoName;
    }

    try {
      const output = execSync(hookPath, {
        encoding: 'utf8',
        timeout: this.config.timeout,
        env,
        maxBuffer: 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'], // Capture stdout and stderr separately
      });

      logger.debug(`Hook ${hookName} completed successfully`);
      return {
        success: true,
        output: output.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const exitCode = error.status || 1;

      // Extract stdout and stderr from the error
      let combinedOutput = '';

      // Include stdout if available
      if (error.stdout) {
        combinedOutput += error.stdout.toString().trim();
      }

      // Include stderr if available
      if (error.stderr) {
        const stderr = error.stderr.toString().trim();
        if (stderr && combinedOutput) {
          combinedOutput += '\n';
        }
        combinedOutput += stderr;
      }

      logger.debug(`Hook ${hookName} failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        output: combinedOutput,
        exitCode,
      };
    }
  }

  public async runHooks(hookType: string, context: HookContext): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('Hooks are disabled');
      return;
    }

    const hooks = this.findHooks(hookType);
    if (hooks.length === 0) {
      return;
    }

    logger.debug(`Running ${hooks.length} ${hookType} hooks`);

    for (const hookPath of hooks) {
      const result = await this.executeHook(hookPath, context);

      // Always display output (stdout/stderr) if present
      if (result.output) {
        console.log(result.output);
      }

      // If hook failed, display error information
      if (!result.success) {
        const hookName = hookPath.split('/').pop() || 'unknown';
        console.error(
          `❌ Hook '${hookName}' failed with exit code ${result.exitCode}`
        );

        if (result.error && !result.output?.includes(result.error)) {
          // Only show error message if it wasn't already in the output
          console.error(result.error);
        }

        if (this.config.failOnError) {
          throw new Error(`Hook failed: ${hookName}\n${result.error}`);
        }
      }
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  public getConfig(): HookConfig {
    return { ...this.config };
  }
}

export const hookManager = new HookManager();
