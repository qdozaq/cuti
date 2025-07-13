@README.md

## Project Structure

```
cuti/
├── index.ts          # Main entry point for the CLI
├── commands/         # Command modules
│   ├── config.ts     # Configuration command
│   └── hello.ts      # Example hello command
├── lib/              # Utility modules
│   ├── logger.ts     # Logging utilities
│   └── utils.ts      # General utilities
├── types/            # TypeScript type definitions
│   └── command.ts    # Command interface types
└── dist/             # Build output directory
```

## Tech Stack

- **Bun** - Runtime and package manager @bun.md
- **Commander.js** - CLI framework
- **Chalk** - Terminal styling
- **TypeScript** - Type safety
