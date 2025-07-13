import { Version3Client } from 'jira.js';
import type { Version3Models } from 'jira.js';
import { ensureJiraConfig } from './jira-config';
import { logger } from './logger';

export class JiraClient {
  private client: Version3Client | null = null;

  /**
   * Get or create the Jira client instance
   */
  private async getClient(): Promise<Version3Client> {
    if (!this.client) {
      const config = await ensureJiraConfig();

      logger.debug(`Using Jira host: '${config.host}'`);
      logger.debug(`Using Jira API token: '${config.apiToken}'`);

      this.client = new Version3Client({
        host: config.host,
        authentication: {
          basic: {
            email: config.email,
            apiToken: config.apiToken,
          },
        },
      });
    }
    return this.client;
  }

  /**
   * Get an issue by its key
   * @param issueKey - The issue key (e.g., 'CCR-1234')
   * @returns Issue data
   */
  async getIssue(issueKey: string): Promise<Version3Models.Issue> {
    try {
      const client = await this.getClient();
      const issue = await client.issues.getIssue({
        issueIdOrKey: issueKey,
      });
      return issue;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Issue ${issueKey} not found`);
      }
      if (error.response?.status === 401) {
        throw new Error(
          'Invalid Jira credentials. Please check your configuration.'
        );
      }
      throw new Error(`Failed to fetch issue: ${error.message}`);
    }
  }

  /**
   * Assign an issue to the current user
   * @param issueKey - The issue key to assign
   */
  async assignIssueToCurrentUser(issueKey: string): Promise<void> {
    try {
      const client = await this.getClient();

      // Get the current user
      const currentUser = await client.myself.getCurrentUser();

      if (!currentUser.accountId) {
        throw new Error('Could not get current user account ID');
      }

      // Assign the issue using the account ID
      await client.issues.assignIssue({
        issueIdOrKey: issueKey,
        accountId: currentUser.accountId,
      });

      logger.debug(
        `Successfully assigned ${issueKey} to ${currentUser.displayName} (${currentUser.accountId})`
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Issue ${issueKey} not found`);
      }
      if (error.response?.status === 401) {
        throw new Error(
          'Invalid Jira credentials. Please check your configuration.'
        );
      }
      throw new Error(`Failed to assign issue: ${error.message}`);
    }
  }

  /**
   * Transition an issue to a new status
   * @param issueKey - The issue key to transition
   * @param transitionName - The name of the transition (e.g., 'In Progress', 'Done')
   */
  async transitionIssue(
    issueKey: string,
    transitionName: string
  ): Promise<void> {
    try {
      const client = await this.getClient();

      // Get available transitions for the issue
      const transitions = await client.issues.getTransitions({
        issueIdOrKey: issueKey,
      });

      // Find the transition with the matching name
      const transition = transitions.transitions?.find(
        (t) => t.name?.toLowerCase() === transitionName.toLowerCase()
      );

      if (!transition || !transition.id) {
        const availableTransitions = transitions.transitions
          ?.map((t) => t.name)
          .join(', ');
        throw new Error(
          `Transition "${transitionName}" not found. Available transitions: ${availableTransitions}`
        );
      }

      // Execute the transition
      await client.issues.doTransition({
        issueIdOrKey: issueKey,
        transition: {
          id: transition.id,
        },
      });

      logger.debug(
        `Successfully transitioned ${issueKey} to ${transitionName}`
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Issue ${issueKey} not found`);
      }
      if (error.response?.status === 401) {
        throw new Error(
          'Invalid Jira credentials. Please check your configuration.'
        );
      }
      throw new Error(`Failed to transition issue: ${error.message}`);
    }
  }

  /**
   * Clear the cached client (useful after config changes)
   */
  clearClient(): void {
    this.client = null;
  }
}

// Export a singleton instance
export const jiraClient = new JiraClient();
