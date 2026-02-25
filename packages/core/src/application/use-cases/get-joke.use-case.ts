import { injectable } from 'tsyringe';
import { JOKES } from '../../domain/jokes.js';

@injectable()
export class GetJokeUseCase {
  constructor(private readonly randomFn: () => number = Math.random) {}

  execute(): string {
    return JOKES[Math.floor(this.randomFn() * JOKES.length)];
  }
}
