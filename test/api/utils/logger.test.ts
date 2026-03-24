import { Logger } from '@api/utils/logger';
import chalk from 'chalk';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info message with blue color and info icon', () => {
      Logger.info('Test info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe(chalk.blue('ℹ'));
      expect(callArgs[1]).toBe('Test info message');
    });

    it('should handle empty messages', () => {
      Logger.info('');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue('ℹ'), '');
    });

    it('should handle messages with special characters', () => {
      Logger.info('Message with "quotes" and \'apostrophes\'');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should log success message with green color and checkmark', () => {
      Logger.success('Test success message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe(chalk.green('✓'));
      expect(callArgs[1]).toBe('Test success message');
    });

    it('should handle long success messages', () => {
      const longMessage = 'A'.repeat(1000);
      Logger.success(longMessage);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✓'), longMessage);
    });
  });

  describe('error', () => {
    it('should log error message with red color and X icon', () => {
      Logger.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleErrorSpy.mock.calls[0];
      expect(callArgs[0]).toBe(chalk.red('✗'));
      expect(callArgs[1]).toBe('Test error message');
    });

    it('should handle error messages with newlines', () => {
      Logger.error('Error line 1\nError line 2');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('warning', () => {
    it('should log warning message with yellow color and warning icon', () => {
      Logger.warning('Test warning message');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleWarnSpy.mock.calls[0];
      expect(callArgs[0]).toBe(chalk.yellow('⚠'));
      expect(callArgs[1]).toBe('Test warning message');
    });

    it('should handle multiple warnings', () => {
      Logger.warning('Warning 1');
      Logger.warning('Warning 2');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('server', () => {
    it('should log server message with cyan color and rocket icon', () => {
      Logger.server('Test server message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe(chalk.cyan('🚀'));
      expect(callArgs[1]).toBe('Test server message');
    });

    it('should handle server startup messages', () => {
      Logger.server('Starting server on port 3000...');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        chalk.cyan('🚀'),
        'Starting server on port 3000...'
      );
    });
  });

  describe('divider', () => {
    it('should log a divider line with gray color', () => {
      Logger.divider();
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe(chalk.gray('─'.repeat(50)));
    });

    it('should create a 50-character divider', () => {
      Logger.divider();
      const divider = '─'.repeat(50);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray(divider));
    });

    it('should be callable multiple times', () => {
      Logger.divider();
      Logger.divider();
      Logger.divider();
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('integration', () => {
    it('should work together for a typical server startup sequence', () => {
      Logger.server('Starting server...');
      Logger.divider();
      Logger.success('Server started successfully');
      Logger.info('API Documentation available');
      Logger.divider();

      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
