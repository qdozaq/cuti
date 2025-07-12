import { Command } from 'commander';
import { logger } from '../lib/logger';
import type { CLICommand } from '../types/command';
import chalk from 'chalk';

class HelloCommand implements CLICommand {
  name = 'hello';
  description = 'Say hello with style';

  register(program: Command): void {
    program
      .command(this.name)
      .description(this.description)
      .option('-n, --name <name>', 'name to greet', 'World')
      .option('-c, --color <color>', 'greeting color', 'cyan')
      .option('-e, --emoji', 'include emoji in greeting')
      .action(this.execute.bind(this));
  }

  private execute(options: {
    name: string;
    color: string;
    emoji: boolean;
  }): void {
    const { name, color, emoji } = options;
    const greeting = `Hello, ${name}!`;
    const prefix = emoji ? '👋 ' : '';

    const colorFn = this.getColorFunction(color);

    if (colorFn) {
      console.log(prefix + colorFn(greeting));
    } else {
      logger.warning(`Unknown color: ${color}, using default`);
      console.log(prefix + chalk.cyan(greeting));
    }

    logger.success('Greeting delivered successfully!');
  }

  private getColorFunction(color: string): ((text: string) => string) | null {
    const colors: Record<string, (text: string) => string> = {
      red: chalk.red,
      green: chalk.green,
      yellow: chalk.yellow,
      blue: chalk.blue,
      magenta: chalk.magenta,
      cyan: chalk.cyan,
      white: chalk.white,
      gray: chalk.gray,
    };

    return colors[color.toLowerCase()] || null;
  }
}

export default new HelloCommand();
