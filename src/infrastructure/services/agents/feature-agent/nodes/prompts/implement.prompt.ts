/**
 * Implement Phase Prompt — PLACEHOLDER
 *
 * The implement phase is not yet wired up. This returns a programming joke
 * to clearly signal it's a placeholder while keeping the graph pipeline intact.
 */

const JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'A SQL query walks into a bar, walks up to two tables and asks... "Can I JOIN you?"',
  "There are only 10 types of people: those who understand binary, and those who don't.",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "What's a programmer's favorite hangout place? Foo Bar.",
  'To understand recursion, you must first understand recursion.',
  "!false — it's funny because it's true.",
];

export function getImplementPlaceholderJoke(): string {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}
