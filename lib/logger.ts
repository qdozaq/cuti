import chalk from 'chalk';

export class Logger {
  private static instance: Logger;
  private debugMode: boolean = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  info(message: string): void {
    console.log(chalk.blue('🩶'), message);
  }

  success(message: string): void {
    console.log(chalk.green('💚'), message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('💛'), message);
  }

  error(message: string | Error): void {
    const errorMessage = message instanceof Error ? message.message : message;
    console.error(chalk.red('💔'), errorMessage);
    if (message instanceof Error && this.debugMode && message.stack) {
      console.error(chalk.gray(message.stack));
    }
  }

  debug(message: string): void {
    if (this.debugMode) {
      console.log(chalk.gray('⚙'), message);
    }
  }

  highlight(message: string): void {
    console.log(chalk.cyan(message));
  }

  dim(message: string): void {
    console.log(chalk.gray(message));
  }

  bold(message: string): void {
    console.log(chalk.bold(message));
  }
}

export const logger = Logger.getInstance();
