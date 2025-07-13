import { logger } from './logger';

const HAIKU_MODEL = 'claude-3-5-haiku-20241022';

export class ClaudeClient {
  /**
   * Generate a branch name using Claude CLI
   * @param issueKey - The Jira issue key
   * @param summary - The issue summary
   * @param description - The issue description
   * @returns A concise branch name
   */
  async generateBranchName(
    issueKey: string,
    summary: string,
    description?: string
  ): Promise<string> {
    try {
      const prompt = `Generate a concise Git branch name for this issue:

Summary: ${summary}
${description ? `Description: ${description}` : ''}

Requirements:
- Follow with a short, descriptive slug (2-5 words)
- Use kebab-case (lowercase with hyphens)
- Keep total length under 50 characters
- Focus on the main action or feature
- Avoid unnecessary words like "the", "a", "an"

Examples:
- add-user-auth
- fix-dashboard-performance
- update-api-docs

Respond with ONLY the branch name, nothing else.`;

      // Use Bun's shell to run claude command
      const result =
        await Bun.$`claude --model ${HAIKU_MODEL} --print ${prompt}`.text();
      const branchName = `${issueKey.toLowerCase()}-${result.trim()}`;

      if (!branchName) {
        throw new Error('No branch name generated');
      }

      logger.debug(`Claude generated branch name: ${branchName}`);
      return branchName;
    } catch (error: any) {
      logger.error(
        `Failed to generate branch name with Claude fallback to issue key: ${error.message}`
      );

      return issueKey.toLowerCase();
    }
  }
}

// Export a singleton instance
export const claudeClient = new ClaudeClient();
