/**
 * Minimal type declarations for @xenova/transformers mock
 * RED phase: Just enough types to make tests compile
 */
declare module '@xenova/transformers' {
  export function pipeline(task: string, model?: string): Promise<any>;
  export const env: {
    cacheDir: string;
  };
}
