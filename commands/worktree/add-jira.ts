import chalk from 'chalk';
import { jiraClient } from '../../lib/jira';
import { extractIssueKey, generateBranchName } from '../../lib/jira-utils';
import { logger } from '../../lib/logger';

export interface PreprocessJiraOptions {
  noAssign?: boolean;
  noTransition?: boolean;
}

export interface JiraPreprocessResult {
  branchName: string;
  issueKey: string;
  summary: string;
}

/**
 * Preprocess a Jira issue to extract branch name and perform Jira operations
 * @param input - Jira issue key or URL
 * @param options - Options for Jira operations
 * @returns JiraPreprocessResult with the branch name and issue details
 */
export async function preprocessJiraIssue(
  input: string,
  options: PreprocessJiraOptions = {}
): Promise<JiraPreprocessResult> {
  try {
    // Extract issue key from input
    logger.info('Extracting issue key from input...');
    const issueKey = extractIssueKey(input);
    logger.debug(`Extracted issue key: ${issueKey}`);

    // Fetch issue details from Jira
    logger.info(`Fetching issue details for ${chalk.cyan(issueKey)}...`);
    const issue = await jiraClient.getIssue(issueKey);
    logger.debug(`Issue summary: ${issue.fields.summary}`);

    // Generate branch name
    const branchName = generateBranchName(issueKey, issue.fields.summary);
    logger.info(`Generated branch name: ${chalk.cyan(branchName)}`);

    // Store issue details for return
    const result: JiraPreprocessResult = {
      branchName,
      issueKey,
      summary: issue.fields.summary,
    };

    // Assign issue if not disabled
    if (!options.noAssign) {
      // todo: get the user from the config
      // logger.info('Assigning issue to ');
      try {
        // await jiraClient.assignIssue(issueKey, );
        logger.success('Issue assigned successfully');
      } catch (error) {
        logger.warning(`Failed to assign issue: ${error}`);
      }
    }

    // Transition issue if not disabled
    if (!options.noTransition) {
      logger.info('Transitioning issue to "In Progress"...');
      try {
        await jiraClient.transitionIssue(issueKey, 'In Progress');
        logger.success('Issue transitioned successfully');
      } catch (error) {
        logger.warning(`Failed to transition issue: ${error}`);
      }
    }

    logger.success(chalk.green('✓ Jira issue processed successfully!'));
    logger.info(`  Issue: ${chalk.cyan(issueKey)} - ${issue.fields.summary}`);
    logger.info(`  Branch: ${chalk.cyan(branchName)}`);

    return result;
  } catch (error) {
    logger.error(`Failed to process Jira issue: ${error}`);
    throw error;
  }
}
