// @vitest-environment node

/**
 * parsePort Unit Tests
 *
 * Tests for the utility that extracts localhost URLs/ports from dev server
 * stdout/stderr output lines.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect } from 'vitest';
import { parsePort } from '@/infrastructure/services/deployment/parse-port.js';

describe('parsePort', () => {
  it('should extract URL from Vite "Local:" output', () => {
    const result = parsePort('  Local:   http://localhost:3000/');
    expect(result).toBe('http://localhost:3000/');
  });

  it('should extract URL from Vite v5 "- Local:" output', () => {
    const result = parsePort('  ➜  Local:   http://localhost:5173/');
    expect(result).toBe('http://localhost:5173/');
  });

  it('should extract URL from Next.js "ready" output', () => {
    const result = parsePort('ready - started server on 0.0.0.0:3000, url: http://localhost:3000');
    expect(result).toBe('http://localhost:3000');
  });

  it('should extract URL from Next.js "Local:" output', () => {
    const result = parsePort('   ▲ Next.js 14.0.0');
    expect(result).toBeNull();

    const result2 = parsePort('   - Local:        http://localhost:3000');
    expect(result2).toBe('http://localhost:3000');
  });

  it('should extract URL from Express "listening on port" output', () => {
    const result = parsePort('Server listening on port 3000');
    expect(result).toBe('http://localhost:3000');
  });

  it('should extract URL from case-insensitive "Listening on port" output', () => {
    const result = parsePort('Listening on port 8080');
    expect(result).toBe('http://localhost:8080');
  });

  it('should extract generic localhost URL from arbitrary line', () => {
    const result = parsePort('App available at http://localhost:4200 in development mode');
    expect(result).toBe('http://localhost:4200');
  });

  it('should extract https localhost URL', () => {
    const result = parsePort('Server running at https://localhost:3443');
    expect(result).toBe('https://localhost:3443');
  });

  it('should extract URL with 127.0.0.1', () => {
    const result = parsePort('Development server running at http://127.0.0.1:8080/');
    expect(result).toBe('http://127.0.0.1:8080/');
  });

  it('should return null for non-matching lines', () => {
    expect(parsePort('Compiling...')).toBeNull();
    expect(parsePort('webpack 5.88.2 compiled successfully')).toBeNull();
    expect(parsePort('info  - Loaded env from .env')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parsePort('')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(parsePort('   ')).toBeNull();
  });

  it('should handle port in "started on port" pattern', () => {
    const result = parsePort('Server started on port 9000');
    expect(result).toBe('http://localhost:9000');
  });
});
