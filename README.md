# cuti 💖

> Claude + Utils = cuti

A CLI containing tools for claude code workflows

## Features

- **Git Worktree Management** - Create and manage Git worktrees with interactive navigation
- **Jira Integration** - Fetch issue details and generate branch names using Claude AI
- **Configuration Management** - Global and local configuration support
- **Shell Integration** - Navigate to worktrees directly from your shell
- **Built with Bun** - Fast runtime execution

## Installation

```bash
# Install globally with Bun
bun install -g cuti

# Or clone and link locally
git clone https://github.com/yourusername/cuti.git
cd cuti
bun install
bun link
```

## Usage

### Shell Integration Setup

Enable interactive worktree navigation by adding cuti to your shell configuration:

```bash
# For bash - add to ~/.bashrc
eval "$(cuti shell-init bash)"

# For zsh - add to ~/.zshrc
eval "$(cuti shell-init zsh)"

# For fish - add to ~/.config/fish/config.fish
cuti shell-init fish | source
```

After setup, you can use `cuti wt` to interactively navigate to any worktree:

```bash
# Type this to see an interactive list and jump to a worktree
cuti wt
```

### Configuration

Set up your Jira credentials:

```bash
# Set Jira configuration
cuti config set jira.host your-company.atlassian.net --global
cuti config set jira.email your.email@company.com --global
cuti config set jira.apiToken your-api-token --global

# List all configuration
cuti config list

# Initialize local config for project-specific settings
cuti config init
```

### Worktree Management

Create a new worktree from a Jira issue:

```bash
# Create worktree from Jira issue (auto-generates branch name)
cuti worktree add --jira ABC-1234

# Create worktree with custom branch name
cuti worktree add feature/my-new-feature

# List all worktrees
cuti worktree list

# Remove a worktree
cuti worktree remove feature/my-new-feature
```

### Commands Reference

#### `cuti config`

Manage configuration settings.

- `config get <key>` - Display a configuration value
- `config set <key> <value>` - Set a configuration value
- `config list` - List all configuration values
- `config reset` - Reset configuration to defaults
- `config init` - Initialize a local config file
- `config delete <key>` - Delete a configuration value

Options:

- `--global` - Apply to global configuration
- `--local` - Apply to local configuration only
- `--force` - Force operation without confirmation

#### `cuti worktree` (alias: `wt`)

Manage Git worktrees with optional Jira integration.

- `worktree add <branch>` - Create a new worktree
- `worktree remove [branch]` - Remove an existing worktree
- `worktree list` - List all worktrees
- `worktree` (no subcommand) - With shell integration enabled, shows interactive list and navigates to selected worktree

Options for `worktree add`:

- `-p, --path <path>` - Custom path for the worktree
- `-f, --force` - Force creation even if branch exists
- `-j, --jira` - Treat branch parameter as a Jira issue key/URL
- `--no-assign` - Don't assign Jira issue to yourself
- `--no-transition` - Don't transition Jira issue to "In Progress"

#### `cuti shell-init`

Output shell integration script for interactive worktree navigation.

- `shell-init [shell]` - Output integration script for specified shell (bash, zsh, or fish)

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime
- Git
- Node.js (for compatibility)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/cuti.git
cd cuti

# Install dependencies
bun install

# Run TypeScript checks
bun run tsc --noEmit

# Run the CLI locally
bun run index.ts

# Link for global usage during development
bun link
```

### Project Structure

```
cuti/
├── index.ts          # Main entry point for the CLI
├── commands/         # Command modules
│   ├── config.ts     # Configuration command
│   └── worktree.ts   # Worktree management command
├── lib/              # Utility modules
│   ├── logger.ts     # Logging utilities
│   ├── utils.ts      # General utilities
│   ├── jira.ts       # Jira API integration
│   └── git.ts        # Git operations
├── types/            # TypeScript type definitions
│   └── command.ts    # Command interface types
└── dist/             # Build output directory
```

### Adding New Commands

1. Create a new file in `commands/` directory
2. Implement the `Command` interface
3. Register the command in `index.ts`

Example:

```typescript
import { Command } from '../types/command.js';

export const myCommand: Command = {
  name: 'mycommand',
  description: 'Description of my command',
  action: async (options) => {
    // Command implementation
  },
};
```

## Configuration

Configuration files are stored in:

- Global: `~/.cuti/config.json`
- Local: `.cuti/config.json` (in project root)

Local configuration overrides global configuration.

### Configuration Options

- `jira.host` - Your Jira instance hostname
- `jira.email` - Your Jira account email
- `jira.apiToken` - Your Jira API token
- `jira.project` - Default Jira project key (defaults to "CCR")

## Debug Mode

Run any command with the `-d` or `--debug` flag to enable debug logging:

```bash
cuti -d worktree add --jira ABC-1234
```

## License

MIT
