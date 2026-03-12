import { NextResponse } from 'next/server';

import { resolve } from '@/lib/server-container';
import type { IVersionService } from '@shepai/core/application/ports/output/services/version-service.interface';

/** Prevent Next.js from statically prerendering this route at build time. */
export const dynamic = 'force-dynamic';

/**
 * Returns runtime version info.
 *
 * Reads the version from the DI container's VersionService — the same source
 * used by `shep --version`. This avoids stale values from NEXT_PUBLIC_* env
 * vars which Next.js inlines at build time.
 */
export function GET(): NextResponse {
  try {
    const versionService = resolve<IVersionService>('IVersionService');
    const { version, name, description } = versionService.getVersion();

    return NextResponse.json({
      version,
      packageName: name,
      description,
      branch: process.env.NEXT_PUBLIC_SHEP_BRANCH ?? '',
      commitHash: process.env.NEXT_PUBLIC_SHEP_COMMIT ?? '',
      instancePath: process.env.NEXT_PUBLIC_SHEP_INSTANCE_PATH ?? '',
      isDev: process.env.NODE_ENV === 'development',
    });
  } catch {
    // DI container not available (e.g. during build) — fall back to env vars
    return NextResponse.json({
      version: process.env.NEXT_PUBLIC_SHEP_VERSION ?? 'unknown',
      packageName: process.env.NEXT_PUBLIC_SHEP_PACKAGE_NAME ?? '@shepai/cli',
      description: process.env.NEXT_PUBLIC_SHEP_DESCRIPTION ?? 'Autonomous AI Native SDLC Platform',
      branch: process.env.NEXT_PUBLIC_SHEP_BRANCH ?? '',
      commitHash: process.env.NEXT_PUBLIC_SHEP_COMMIT ?? '',
      instancePath: process.env.NEXT_PUBLIC_SHEP_INSTANCE_PATH ?? '',
      isDev: process.env.NODE_ENV === 'development',
    });
  }
}
