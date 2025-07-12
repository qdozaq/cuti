import { Command } from 'commander';

export interface CLICommand {
  name: string;
  description: string;
  register(program: Command): void;
}

export type CommandModule = {
  default: CLICommand;
};