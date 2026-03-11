import { NextResponse } from 'next/server';

/**
 * Returns runtime version info.
 *
 * NEXT_PUBLIC_* env vars are inlined at build time for client components,
 * so client-side code sees the version from when the bundle was built —
 * not the currently running CLI version.
 *
 * This API route reads the env vars at runtime on the server, ensuring
 * the client always gets the correct version.
 */
export function GET(): NextResponse {
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
