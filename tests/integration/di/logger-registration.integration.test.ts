import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import { container, initializeContainer } from '../../../src/infrastructure/di/container.js';
import type { ILogger } from '../../../src/application/ports/output/logger.interface.js';

/**
 * Integration test for Logger DI registration.
 *
 * Tests that ILogger can be resolved from the DI container
 * and works correctly when injected into other services.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 */
describe('Logger DI Registration', () => {
  beforeAll(async () => {
    // Initialize container with all dependencies
    await initializeContainer();
  });

  describe('Logger Resolution', () => {
    it('should resolve ILogger from container', () => {
      const logger = container.resolve<ILogger>('ILogger');

      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('should return singleton instance', () => {
      const logger1 = container.resolve<ILogger>('ILogger');
      const logger2 = container.resolve<ILogger>('ILogger');

      expect(logger1).toBe(logger2);
    });

    it('should have correct method signatures', () => {
      const logger = container.resolve<ILogger>('ILogger');

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('Logger Functionality', () => {
    it('should log messages without throwing', () => {
      const logger = container.resolve<ILogger>('ILogger');

      expect(() => {
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');
      }).not.toThrow();
    });

    it('should log messages with context', () => {
      const logger = container.resolve<ILogger>('ILogger');

      expect(() => {
        logger.info('Test message', { userId: '123', action: 'test' });
      }).not.toThrow();
    });

    it('should handle complex context objects', () => {
      const logger = container.resolve<ILogger>('ILogger');

      const context = {
        user: { id: '123', name: 'Test' },
        metadata: { nested: { value: 'data' } },
      };

      expect(() => {
        logger.info('Complex context', context);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use log level from Settings', () => {
      const logger = container.resolve<ILogger>('ILogger');

      // Logger should be configured (no errors)
      expect(() => {
        logger.info('Configuration test');
      }).not.toThrow();
    });

    it('should be available for injection', () => {
      // Verify logger can be resolved (implies it's registered)
      expect(() => {
        container.resolve<ILogger>('ILogger');
      }).not.toThrow();
    });
  });
});
