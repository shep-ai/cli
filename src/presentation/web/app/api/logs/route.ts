import { type NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';
import type { LogSearchFilters } from '@/domain/generated/output';

/**
 * GET /api/logs - Fetch logs with optional filters
 *
 * Query params:
 * - level: Filter by log level (error, warn, info, debug)
 * - source: Filter by log source
 * - startTime: Start time filter (Unix timestamp in ms)
 * - endTime: End time filter (Unix timestamp in ms)
 * - limit: Number of results per page (default: 50)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build filters from query params
    const filters: LogSearchFilters = {
      level: searchParams.get('level') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      startTime: searchParams.get('startTime')
        ? parseInt(searchParams.get('startTime')!, 10)
        : undefined,
      endTime: searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!, 10) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    // Resolve repository from DI container
    const logRepository = container.resolve<ILogRepository>('ILogRepository');

    // Fetch logs and total count
    const [logs, total] = await Promise.all([
      logRepository.search(filters),
      logRepository.count(filters),
    ]);

    return NextResponse.json({
      logs,
      total,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { error: 'Failed to fetch logs', message: err.message },
      { status: 500 }
    );
  }
}
