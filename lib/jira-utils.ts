/**
 * Utility functions for Jira integration
 */

export function extractIssueKey(input: string): string {
  // Check if input is a URL
  const urlPattern = /\/browse\/([A-Z]+-\d+)/i;
  const urlMatch = input.match(urlPattern);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].toUpperCase();
  }

  // Check if input is already a valid issue key
  const keyPattern = /^([A-Z]+-\d+)$/i;
  const keyMatch = input.match(keyPattern);
  if (keyMatch && keyMatch[1]) {
    return keyMatch[1].toUpperCase();
  }

  // If no pattern matches, throw an error
  throw new Error(
    `Invalid input: "${input}". Expected a Jira URL or issue key (e.g., CCR-1234)`
  );
}
