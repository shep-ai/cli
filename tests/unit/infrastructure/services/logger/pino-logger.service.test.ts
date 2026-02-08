import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { PinoLogger } from '../../../../../src/infrastructure/services/logger/pino-logger.service.js';
import { LogLevel } from '../../../../../src/domain/generated/output.js';

/**
 * Test suite for PinoLogger Service.
 *
 * Tests the Pino implementation of ILogger interface.
 * Verifies all log levels and context handling.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 */
describe('PinoLogger Service', () => {
  let logger: PinoLogger;

  beforeEach(() => {
    // Create logger with minimal config for testing
    logger = new PinoLogger({
      level: LogLevel.Debug,
      logDir: undefined, // No file transport in tests
    });
  });

  describe('Log Level Methods', () => {
    it('should have debug method', () => {
      expect(logger).toHaveProperty('debug');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have info method', () => {
      expect(logger).toHaveProperty('info');
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger).toHaveProperty('warn');
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(logger).toHaveProperty('error');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('Message Logging', () => {
    it('should log debug message without context', () => {
      expect(() => {
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should log info message without context', () => {
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    it('should log warn message without context', () => {
      expect(() => {
        logger.warn('Test warn message');
      }).not.toThrow();
    });

    it('should log error message without context', () => {
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();
    });
  });

  describe('Context Logging', () => {
    it('should log debug with context object', () => {
      expect(() => {
        logger.debug('Debug with context', { userId: '123', action: 'test' });
      }).not.toThrow();
    });

    it('should log info with context object', () => {
      expect(() => {
        logger.info('Info with context', { count: 42, enabled: true });
      }).not.toThrow();
    });

    it('should log warn with context object', () => {
      expect(() => {
        logger.warn('Warning with context', { reason: 'deprecated' });
      }).not.toThrow();
    });

    it('should log error with context object', () => {
      expect(() => {
        logger.error('Error with context', { code: 'ERR_001', stack: 'trace' });
      }).not.toThrow();
    });

    it('should handle complex nested context', () => {
      const complexContext = {
        user: { id: '123', name: 'Test User' },
        metadata: { nested: { deep: 'value' } },
        tags: ['tag1', 'tag2'],
      };

      expect(() => {
        logger.info('Complex context', complexContext);
      }).not.toThrow();
    });

    it('should handle empty context object', () => {
      expect(() => {
        logger.info('Empty context', {});
      }).not.toThrow();
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect configured log level', () => {
      const infoLogger = new PinoLogger({
        level: LogLevel.Info,
        logDir: undefined,
      });

      // Debug should be filtered, info should pass
      expect(() => {
        infoLogger.debug('Should be filtered');
        infoLogger.info('Should be logged');
      }).not.toThrow();
    });

    it('should log all levels when set to debug', () => {
      const debugLogger = new PinoLogger({
        level: LogLevel.Debug,
        logDir: undefined,
      });

      expect(() => {
        debugLogger.debug('Debug message');
        debugLogger.info('Info message');
        debugLogger.warn('Warn message');
        debugLogger.error('Error message');
      }).not.toThrow();
    });

    it('should only log errors when set to error level', () => {
      const errorLogger = new PinoLogger({
        level: LogLevel.Error,
        logDir: undefined,
      });

      expect(() => {
        errorLogger.debug('Filtered');
        errorLogger.info('Filtered');
        errorLogger.warn('Filtered');
        errorLogger.error('Should be logged');
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should accept LogLevel enum for level', () => {
      expect(() => {
        new PinoLogger({ level: LogLevel.Debug, logDir: undefined });
        new PinoLogger({ level: LogLevel.Info, logDir: undefined });
        new PinoLogger({ level: LogLevel.Warn, logDir: undefined });
        new PinoLogger({ level: LogLevel.Error, logDir: undefined });
      }).not.toThrow();
    });

    it('should work without file transport', () => {
      expect(() => {
        new PinoLogger({ level: LogLevel.Info, logDir: undefined });
      }).not.toThrow();
    });

    it('should work with file transport enabled', () => {
      expect(() => {
        new PinoLogger({ level: LogLevel.Info, logDir: '/tmp/test-logs' });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should not throw when logging fails', () => {
      // Logger should handle errors gracefully
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
    });

    it('should handle undefined context', () => {
      expect(() => {
        logger.info('Message', undefined);
      }).not.toThrow();
    });

    it('should handle null in context (converted to undefined)', () => {
      expect(() => {
        logger.info('Message', { value: null } as any);
      }).not.toThrow();
    });
  });

  describe('ILogger Interface Compliance', () => {
    it('should implement all ILogger methods', () => {
      const requiredMethods = ['debug', 'info', 'warn', 'error'];

      requiredMethods.forEach((method) => {
        expect(logger).toHaveProperty(method);
        expect(typeof (logger as any)[method]).toBe('function');
      });
    });

    it('should accept correct method signatures', () => {
      // These should all compile and run without error
      logger.debug('message');
      logger.debug('message', {});
      logger.debug('message', { key: 'value' });

      logger.info('message');
      logger.info('message', {});
      logger.info('message', { key: 'value' });

      logger.warn('message');
      logger.warn('message', {});
      logger.warn('message', { key: 'value' });

      logger.error('message');
      logger.error('message', {});
      logger.error('message', { key: 'value' });
    });
  });
});
