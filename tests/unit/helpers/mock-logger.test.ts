import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  createMockLogger,
  expectLoggedDebug,
  expectLoggedInfo,
  expectLoggedWarn,
  expectLoggedError,
} from '../../helpers/mock-logger';

describe('createMockLogger', () => {
  it('should return an ILogger mock with all methods', () => {
    const logger = createMockLogger();

    expect(logger).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should track debug calls', () => {
    const logger = createMockLogger();

    logger.debug('Debug message', { key: 'value' });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith('Debug message', { key: 'value' });
  });

  it('should track info calls', () => {
    const logger = createMockLogger();

    logger.info('Info message', { userId: '123' });

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Info message', { userId: '123' });
  });

  it('should track warn calls', () => {
    const logger = createMockLogger();

    logger.warn('Warning message', { warning: true });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('Warning message', { warning: true });
  });

  it('should track error calls', () => {
    const logger = createMockLogger();

    logger.error('Error message', { error: 'something went wrong' });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Error message', { error: 'something went wrong' });
  });

  it('should track multiple calls', () => {
    const logger = createMockLogger();

    logger.debug('First debug');
    logger.info('First info');
    logger.debug('Second debug');

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('should handle calls without context', () => {
    const logger = createMockLogger();

    logger.debug('Message without context');

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith('Message without context');
  });
});

describe('expectLoggedDebug', () => {
  it('should assert debug was logged with message', () => {
    const logger = createMockLogger();
    logger.debug('Debug message', { key: 'value' });

    expectLoggedDebug(logger, 'Debug message');
    expectLoggedDebug(logger, 'Debug message', { key: 'value' });
  });

  it('should throw if debug was not logged with expected message', () => {
    const logger = createMockLogger();
    logger.debug('Different message');

    expect(() => expectLoggedDebug(logger, 'Expected message')).toThrow();
  });
});

describe('expectLoggedInfo', () => {
  it('should assert info was logged with message', () => {
    const logger = createMockLogger();
    logger.info('Info message', { userId: '123' });

    expectLoggedInfo(logger, 'Info message');
    expectLoggedInfo(logger, 'Info message', { userId: '123' });
  });

  it('should throw if info was not logged with expected message', () => {
    const logger = createMockLogger();
    logger.info('Different message');

    expect(() => expectLoggedInfo(logger, 'Expected message')).toThrow();
  });
});

describe('expectLoggedWarn', () => {
  it('should assert warn was logged with message', () => {
    const logger = createMockLogger();
    logger.warn('Warning message', { warning: true });

    expectLoggedWarn(logger, 'Warning message');
    expectLoggedWarn(logger, 'Warning message', { warning: true });
  });

  it('should throw if warn was not logged with expected message', () => {
    const logger = createMockLogger();
    logger.warn('Different message');

    expect(() => expectLoggedWarn(logger, 'Expected message')).toThrow();
  });
});

describe('expectLoggedError', () => {
  it('should assert error was logged with message', () => {
    const logger = createMockLogger();
    logger.error('Error message', { error: 'failed' });

    expectLoggedError(logger, 'Error message');
    expectLoggedError(logger, 'Error message', { error: 'failed' });
  });

  it('should throw if error was not logged with expected message', () => {
    const logger = createMockLogger();
    logger.error('Different message');

    expect(() => expectLoggedError(logger, 'Expected message')).toThrow();
  });
});
