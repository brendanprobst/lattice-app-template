import chalk from 'chalk';

/**
 * Terminal logger utility with colored output
 */
export class Logger {
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  static error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  static warning(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  static server(message: string): void {
    console.log(chalk.cyan('🚀'), message);
  }

  static divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }
}
