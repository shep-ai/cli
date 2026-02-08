import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-empty-function */

/**
 * Test suite for ILogger interface contract.
 *
 * These tests verify the interface contract for the structured logger.
 * They ensure that any implementation provides all required methods
 * with correct signatures (message + optional context).
 */
describe('ILogger Interface Contract', () => {
  it('should define debug method with message and optional context', () => {
    // Create a mock implementation that satisfies the interface
    const logger = {
      debug: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      info: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      warn: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      error: vi.fn((message: string, context?: Record<string, unknown>) => {}),
    };

    // Verify debug method signature
    logger.debug('Test debug message');
    expect(logger.debug).toHaveBeenCalledWith('Test debug message');

    logger.debug('Test debug message with context', { userId: '123' });
    expect(logger.debug).toHaveBeenCalledWith('Test debug message with context', { userId: '123' });
  });

  it('should define info method with message and optional context', () => {
    const logger = {
      debug: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      info: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      warn: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      error: vi.fn((message: string, context?: Record<string, unknown>) => {}),
    };

    // Verify info method signature
    logger.info('Test info message');
    expect(logger.info).toHaveBeenCalledWith('Test info message');

    logger.info('Test info message with context', { action: 'create' });
    expect(logger.info).toHaveBeenCalledWith('Test info message with context', {
      action: 'create',
    });
  });

  it('should define warn method with message and optional context', () => {
    const logger = {
      debug: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      info: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      warn: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      error: vi.fn((message: string, context?: Record<string, unknown>) => {}),
    };

    // Verify warn method signature
    logger.warn('Test warn message');
    expect(logger.warn).toHaveBeenCalledWith('Test warn message');

    logger.warn('Test warn message with context', { reason: 'deprecated' });
    expect(logger.warn).toHaveBeenCalledWith('Test warn message with context', {
      reason: 'deprecated',
    });
  });

  it('should define error method with message and optional context', () => {
    const logger = {
      debug: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      info: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      warn: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      error: vi.fn((message: string, context?: Record<string, unknown>) => {}),
    };

    // Verify error method signature
    logger.error('Test error message');
    expect(logger.error).toHaveBeenCalledWith('Test error message');

    logger.error('Test error message with context', { code: 'ERR_001', stack: 'Error stack' });
    expect(logger.error).toHaveBeenCalledWith('Test error message with context', {
      code: 'ERR_001',
      stack: 'Error stack',
    });
  });

  it('should support all 4 log levels', () => {
    const logger = {
      debug: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      info: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      warn: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      error: vi.fn((message: string, context?: Record<string, unknown>) => {}),
    };

    // Verify all 4 methods are callable
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(logger.debug).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should accept structured context with arbitrary data', () => {
    const logger = {
      debug: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      info: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      warn: vi.fn((message: string, context?: Record<string, unknown>) => {}),
      error: vi.fn((message: string, context?: Record<string, unknown>) => {}),
    };

    // Verify context can contain various data types
    const complexContext = {
      userId: '123',
      action: 'create',
      count: 42,
      enabled: true,
      metadata: { nested: 'value' },
      tags: ['tag1', 'tag2'],
    };

    logger.info('Complex context test', complexContext);
    expect(logger.info).toHaveBeenCalledWith('Complex context test', complexContext);
  });
});
