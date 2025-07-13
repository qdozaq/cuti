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

/**
 * Convert text to kebab-case (lowercase with dashes)
 * @param text - Text to slugify
 * @returns Slugified text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with dashes
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .replace(/-+/g, '-'); // Replace multiple dashes with single dash
}

/**
 * Generate a Git branch name from issue key and summary
 * @param issueKey - Jira issue key (e.g., "CCR-1234")
 * @param summary - Issue summary text
 * @returns Branch name in format "<issue-key>-<summary-slug>"
 */
export function generateBranchName(issueKey: string, summary: string): string {
  const slugifiedSummary = slugify(summary);
  return `${issueKey.toLowerCase()}-${slugifiedSummary}`;
}
