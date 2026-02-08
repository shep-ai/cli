import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoggerConfigFactory } from '../../../../../src/infrastructure/services/logger/logger-config.factory.js';
import { LogLevel } from '../../../../../src/domain/generated/output.js';

/**
 * Test suite for LoggerConfigFactory.
 *
 * Tests the multi-layer configuration precedence system:
 * CLI flags > Environment variables > Settings database
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 */
describe('LoggerConfigFactory', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original NODE_ENV using vi.stubEnv
    if (originalNodeEnv !== undefined) {
      vi.stubEnv('NODE_ENV', originalNodeEnv);
    } else {
      vi.unstubAllEnvs();
    }
  });

  describe('Log Level Precedence', () => {
    it('should use CLI level when provided (highest precedence)', () => {
      const config = LoggerConfigFactory.create({
        cliLevel: LogLevel.Debug,
        envLevel: LogLevel.Warn,
        settingsLevel: LogLevel.Info,
      });

      expect(config.level).toBe('debug');
    });

    it('should use ENV level when CLI not provided', () => {
      const config = LoggerConfigFactory.create({
        envLevel: LogLevel.Warn,
        settingsLevel: LogLevel.Info,
      });

      expect(config.level).toBe('warn');
    });

    it('should use Settings level when CLI and ENV not provided', () => {
      const config = LoggerConfigFactory.create({
        settingsLevel: LogLevel.Info,
      });

      expect(config.level).toBe('info');
    });

    it('should default to info when no level provided', () => {
      const config = LoggerConfigFactory.create({});

      expect(config.level).toBe('info');
    });

    it('should handle undefined levels correctly', () => {
      const config = LoggerConfigFactory.create({
        cliLevel: undefined,
        envLevel: undefined,
        settingsLevel: LogLevel.Error,
      });

      expect(config.level).toBe('error');
    });
  });

  describe('Environment Detection', () => {
    it('should detect development environment', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const config = LoggerConfigFactory.create({});

      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should detect production environment', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const config = LoggerConfigFactory.create({});

      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(true);
    });

    it('should default to development when NODE_ENV not set', () => {
      vi.unstubAllEnvs();

      const config = LoggerConfigFactory.create({});

      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should treat test environment as development', () => {
      vi.stubEnv('NODE_ENV', 'test');

      const config = LoggerConfigFactory.create({});

      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });
  });

  describe('Output Format', () => {
    it('should use pretty format in development', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const config = LoggerConfigFactory.create({});

      expect(config.usePrettyPrint).toBe(true);
    });

    it('should use JSON format in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const config = LoggerConfigFactory.create({});

      expect(config.usePrettyPrint).toBe(false);
    });

    it('should allow forcing JSON format in development', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const config = LoggerConfigFactory.create({
        forcePrettyPrint: false,
      });

      expect(config.usePrettyPrint).toBe(false);
    });

    it('should allow forcing pretty format in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const config = LoggerConfigFactory.create({
        forcePrettyPrint: true,
      });

      expect(config.usePrettyPrint).toBe(true);
    });
  });

  describe('TTY Detection', () => {
    it('should detect TTY correctly', () => {
      const config = LoggerConfigFactory.create({});

      // TTY detection should return a boolean
      expect(typeof config.isTTY).toBe('boolean');
    });

    it('should disable colors when not TTY', () => {
      const stdoutTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      const config = LoggerConfigFactory.create({});

      expect(config.colorize).toBe(false);

      // Restore
      Object.defineProperty(process.stdout, 'isTTY', {
        value: stdoutTTY,
        configurable: true,
      });
    });

    it('should enable colors when TTY in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const stdoutTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });

      const config = LoggerConfigFactory.create({});

      expect(config.colorize).toBe(true);

      // Restore
      Object.defineProperty(process.stdout, 'isTTY', {
        value: stdoutTTY,
        configurable: true,
      });
    });
  });

  describe('Invalid Input Handling', () => {
    it('should throw error for invalid log level string', () => {
      expect(() => {
        LoggerConfigFactory.create({
          cliLevel: 'invalid' as any,
        });
      }).toThrow();
    });

    it('should validate LogLevel enum values', () => {
      expect(() => {
        LoggerConfigFactory.create({
          cliLevel: LogLevel.Debug,
        });
      }).not.toThrow();

      expect(() => {
        LoggerConfigFactory.create({
          settingsLevel: LogLevel.Info,
        });
      }).not.toThrow();
    });
  });

  describe('Full Configuration Object', () => {
    it('should return complete configuration with all fields', () => {
      const config = LoggerConfigFactory.create({
        cliLevel: LogLevel.Warn,
      });

      expect(config).toHaveProperty('level');
      expect(config).toHaveProperty('isDevelopment');
      expect(config).toHaveProperty('isProduction');
      expect(config).toHaveProperty('usePrettyPrint');
      expect(config).toHaveProperty('isTTY');
      expect(config).toHaveProperty('colorize');
    });

    it('should produce consistent configuration for same inputs', () => {
      const config1 = LoggerConfigFactory.create({
        settingsLevel: LogLevel.Info,
      });

      const config2 = LoggerConfigFactory.create({
        settingsLevel: LogLevel.Info,
      });

      expect(config1.level).toBe(config2.level);
      expect(config1.isDevelopment).toBe(config2.isDevelopment);
      expect(config1.usePrettyPrint).toBe(config2.usePrettyPrint);
    });
  });
});
