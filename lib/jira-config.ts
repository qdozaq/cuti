import { configManager } from './config';
import { prompt } from './prompt';
import { logger } from './logger';

export interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
}

/**
 * Get Jira configuration from the config manager
 * @returns Jira configuration or undefined if not set
 */
export function getJiraConfig(): JiraConfig | undefined {
  const jiraConfig = configManager.get<JiraConfig>('jira');

  if (!jiraConfig) {
    return undefined;
  }

  // Validate that all required fields are present
  if (!jiraConfig.host || !jiraConfig.email || !jiraConfig.apiToken) {
    return undefined;
  }

  return jiraConfig;
}

/**
 * Check if Jira configuration exists and is complete
 * @returns true if all Jira config values are present
 */
export function hasJiraConfig(): boolean {
  const config = getJiraConfig();
  return config !== undefined;
}

/**
 * Prompt user for Jira configuration values
 * @returns Complete Jira configuration
 */
async function promptForJiraConfig(): Promise<JiraConfig> {
  logger.info(
    'Jira configuration not found. Please provide your Jira details:'
  );
  logger.info(
    'You can create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens'
  );

  // Get existing partial config if any
  const existingConfig = configManager.get<Partial<JiraConfig>>('jira') || {};

  // Prompt for host
  let host = existingConfig.host;
  if (!host) {
    host = await prompt(
      'Jira host URL (e.g., https://yoursite.atlassian.net): '
    );
    // Ensure host has https:// prefix
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = `https://${host}`;
    }
    // Remove trailing slash if present
    host = host.replace(/\/$/, '');
  }

  // Prompt for email
  let email = existingConfig.email;
  if (!email) {
    email = await prompt('Email address: ');
  }

  // Prompt for API token
  let apiToken = existingConfig.apiToken;
  if (!apiToken) {
    apiToken = await prompt('API token: ', { hidden: true });
  }

  return { host, email, apiToken };
}

/**
 * Ensure Jira configuration exists, prompting if necessary
 * @param forcePrompt - Force re-prompting even if config exists
 * @returns Complete Jira configuration
 */
export async function ensureJiraConfig(
  forcePrompt: boolean = false
): Promise<JiraConfig> {
  if (!forcePrompt && hasJiraConfig()) {
    return getJiraConfig()!;
  }

  const config = await promptForJiraConfig();

  // Save to global config
  await configManager.set('jira', config, true);
  logger.success('Jira configuration saved to global config');

  return config;
}

/**
 * Clear Jira configuration
 */
export async function clearJiraConfig(): Promise<void> {
  await configManager.delete('jira', true);
  logger.success('Jira configuration cleared');
}
