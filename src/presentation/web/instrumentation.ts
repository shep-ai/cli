/**
 * Next.js Instrumentation
 *
 * This file runs once at server startup (both dev and production).
 * We use it to initialize the DI container before any API routes are hit.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import 'reflect-metadata';
import { initializeContainer } from '@/infrastructure/di/container';

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // eslint-disable-next-line no-console
    console.log('[Instrumentation] Initializing DI container...');
    try {
      await initializeContainer();
      // eslint-disable-next-line no-console
      console.log('[Instrumentation] DI container initialized successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Instrumentation] Failed to initialize DI container:', error);
      throw error;
    }
  }
}
