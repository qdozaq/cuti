import type { Context } from '@inquirer/type';

/**
 * Default context for prompts that outputs to stderr instead of stdout.
 * This is useful for CLI tools that need to capture stdout for piping
 * while still showing interactive prompts to the user.
 *
 * Example usage:
 * ```typescript
 * import { select } from '@inquirer/prompts';
 * import { stderrContext } from './prompts';
 *
 * const answer = await select({
 *   message: 'Select an option:',
 *   choices: ['Option 1', 'Option 2']
 * }, stderrContext);
 * ```
 */
export const stderrContext: Context = {
  output: process.stderr,
};

/**
 * Creates a context object for prompts with custom output stream.
 * @param output - The output stream to use (defaults to stderr)
 * @returns Context object for use with @inquirer/prompts
 */
export function createPromptContext(
  output: NodeJS.WritableStream = process.stderr
): Context {
  return {
    output,
  };
}
