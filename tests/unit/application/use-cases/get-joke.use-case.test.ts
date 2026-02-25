/**
 * GetJokeUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { JOKES } from '@/domain/jokes.js';
import { GetJokeUseCase } from '@/application/use-cases/get-joke.use-case.js';

describe('GetJokeUseCase', () => {
  describe('JOKES array', () => {
    it('should contain at least 20 jokes', () => {
      expect(JOKES.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('execute()', () => {
    it('should return JOKES[0] when randomFn returns 0', () => {
      const useCase = new GetJokeUseCase(() => 0);
      expect(useCase.execute()).toBe(JOKES[0]);
    });

    it('should return the last joke when randomFn returns 0.9999', () => {
      const useCase = new GetJokeUseCase(() => 0.9999);
      expect(useCase.execute()).toBe(JOKES[JOKES.length - 1]);
    });

    it('should return a string that is a member of JOKES when constructed with no args', () => {
      const useCase = new GetJokeUseCase();
      const result = useCase.execute();
      expect(typeof result).toBe('string');
      expect(JOKES).toContain(result);
    });
  });
});
