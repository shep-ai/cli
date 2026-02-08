import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { createConsoleTransport } from '../../../../../../src/infrastructure/services/logger/transports/console.transport.js';
import type { LoggerConfig } from '../../../../../../src/infrastructure/services/logger/logger-config.factory.js';

/**
 * Test suite for Console Transport.
 *
 * Tests the console transport factory for pino logger.
 * Verifies pretty-printing in development and JSON in production.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 */
describe('Console Transport', () => {
  describe('createConsoleTransport', () => {
    it('should create a transport object', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: true,
        isProduction: false,
        usePrettyPrint: true,
        isTTY: true,
        colorize: true,
      };

      const transport = createConsoleTransport(config);

      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('target');
    });

    it('should use pino-pretty in development mode', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: true,
        isProduction: false,
        usePrettyPrint: true,
        isTTY: true,
        colorize: true,
      };

      const transport = createConsoleTransport(config);

      expect(transport.target).toBe('pino-pretty');
    });

    it('should use pino/file (JSON) in production mode', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: false,
        isProduction: true,
        usePrettyPrint: false,
        isTTY: false,
        colorize: false,
      };

      const transport = createConsoleTransport(config);

      expect(transport.target).toBe('pino/file');
    });

    it('should enable colorize when config.colorize is true', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: true,
        isProduction: false,
        usePrettyPrint: true,
        isTTY: true,
        colorize: true,
      };

      const transport = createConsoleTransport(config);

      expect(transport.options).toHaveProperty('colorize', true);
    });

    it('should disable colorize when config.colorize is false', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: false,
        isProduction: true,
        usePrettyPrint: false,
        isTTY: false,
        colorize: false,
      };

      const transport = createConsoleTransport(config);

      // pino/file doesn't have colorize option, but pino-pretty does
      if (transport.target === 'pino-pretty') {
        expect(transport.options).toHaveProperty('colorize', false);
      }
    });

    it('should include timestamp in pretty output', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: true,
        isProduction: false,
        usePrettyPrint: true,
        isTTY: true,
        colorize: true,
      };

      const transport = createConsoleTransport(config);

      expect(transport.options).toHaveProperty('translateTime');
    });

    it('should ignore context fields in pretty output', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: true,
        isProduction: false,
        usePrettyPrint: true,
        isTTY: true,
        colorize: true,
      };

      const transport = createConsoleTransport(config);

      expect(transport.options).toHaveProperty('ignore');
      expect(transport.options.ignore).toContain('pid');
      expect(transport.options.ignore).toContain('hostname');
    });

    it('should write to stdout (fd 1) for JSON output', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: false,
        isProduction: true,
        usePrettyPrint: false,
        isTTY: false,
        colorize: false,
      };

      const transport = createConsoleTransport(config);

      // pino/file uses destination option for file descriptor
      expect(transport.options).toHaveProperty('destination', 1);
    });

    it('should handle forced pretty-print in production', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: false,
        isProduction: true,
        usePrettyPrint: true, // Forced pretty-print
        isTTY: true,
        colorize: true,
      };

      const transport = createConsoleTransport(config);

      expect(transport.target).toBe('pino-pretty');
    });

    it('should handle forced JSON in development', () => {
      const config: LoggerConfig = {
        level: 'info',
        isDevelopment: true,
        isProduction: false,
        usePrettyPrint: false, // Forced JSON
        isTTY: true,
        colorize: false,
      };

      const transport = createConsoleTransport(config);

      expect(transport.target).toBe('pino/file');
    });
  });
});
