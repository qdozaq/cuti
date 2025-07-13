import { Version3Client } from 'jira.js';
import type { Version3Models } from 'jira.js';

// Define a simplified mock issue type
interface MockIssue {
  key: string;
  fields: {
    summary: string;
    assignee: {
      emailAddress: string;
      displayName: string;
      accountId: string;
    } | null;
    status: {
      name: string;
      id: string;
    };
  };
}

// Mock issue data
const mockIssues: Record<string, MockIssue> = {
  'CCR-1234': {
    key: 'CCR-1234',
    fields: {
      summary: 'Implement user authentication feature',
      assignee: {
        emailAddress: 'john.doe@example.com',
        displayName: 'John Doe',
        accountId: 'user123',
      },
      status: {
        name: 'In Progress',
        id: '3',
      },
    },
  },
  'CCR-5678': {
    key: 'CCR-5678',
    fields: {
      summary: 'Fix performance issue in dashboard',
      assignee: {
        emailAddress: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        accountId: 'user456',
      },
      status: {
        name: 'To Do',
        id: '1',
      },
    },
  },
  'CCR-9012': {
    key: 'CCR-9012',
    fields: {
      summary: 'Update documentation for API endpoints',
      assignee: null,
      status: {
        name: 'Done',
        id: '5',
      },
    },
  },
};

export class MockJiraClient {
  /**
   * Get a mock issue by its key
   * @param issueKey - The issue key (e.g., 'CCR-1234')
   * @returns Mock issue data
   */
  async getIssue(issueKey: string): Promise<MockIssue> {
    console.log(`[Mock] Getting issue: ${issueKey}`);

    const issue = mockIssues[issueKey];
    if (!issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    return issue;
  }

  /**
   * Mock assign an issue to a user
   * @param issueKey - The issue key to assign
   * @param email - The email of the user to assign to
   */
  async assignIssue(issueKey: string, email: string): Promise<void> {
    console.log(`[Mock] Assigning issue ${issueKey} to ${email}`);

    // In a real implementation, this would make an API call
    // For now, just log the operation
    const issue = mockIssues[issueKey];
    if (!issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    console.log(`[Mock] Successfully assigned ${issueKey} to ${email}`);
  }

  /**
   * Mock transition an issue to a new status
   * @param issueKey - The issue key to transition
   * @param transitionName - The name of the transition (e.g., 'In Progress', 'Done')
   */
  async transitionIssue(
    issueKey: string,
    transitionName: string
  ): Promise<void> {
    console.log(`[Mock] Transitioning issue ${issueKey} to ${transitionName}`);

    // In a real implementation, this would make an API call
    // For now, just log the operation
    const issue = mockIssues[issueKey];
    if (!issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    console.log(
      `[Mock] Successfully transitioned ${issueKey} to ${transitionName}`
    );
  }
}

// Export a singleton instance
export const jiraClient = new MockJiraClient();
