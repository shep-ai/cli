import { NextResponse } from 'next/server';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: true;
  updatedAt: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get('path') ?? homedir();
  const showHidden = url.searchParams.get('showHidden') === 'true';

  if (!path.isAbsolute(rawPath)) {
    return NextResponse.json({ error: 'Path must be absolute' }, { status: 400 });
  }

  const resolvedPath = path.resolve(rawPath);

  try {
    const dirStat = await stat(resolvedPath);
    if (!dirStat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Failed to access path';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const dirents = await readdir(resolvedPath, { withFileTypes: true });

    const entries: DirectoryEntry[] = [];

    const entryPromises = dirents.map(async (dirent) => {
      if (!showHidden && dirent.name.startsWith('.')) {
        return null;
      }

      const entryPath = path.join(resolvedPath, dirent.name);

      try {
        if (dirent.isDirectory()) {
          const entryStat = await stat(entryPath);
          return {
            name: dirent.name,
            path: entryPath,
            isDirectory: true as const,
            updatedAt: entryStat.mtime.toISOString(),
          };
        }

        if (dirent.isSymbolicLink()) {
          const entryStat = await stat(entryPath);
          if (entryStat.isDirectory()) {
            return {
              name: dirent.name,
              path: entryPath,
              isDirectory: true as const,
              updatedAt: entryStat.mtime.toISOString(),
            };
          }
        }
      } catch {
        // Skip inaccessible entries (permission denied, broken symlinks)
      }

      return null;
    });

    const results = await Promise.all(entryPromises);
    for (const result of results) {
      if (result !== null) {
        entries.push(result);
      }
    }

    return NextResponse.json({ entries, currentPath: resolvedPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read directory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
