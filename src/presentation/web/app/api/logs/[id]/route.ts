import { type NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';

/**
 * GET /api/logs/[id] - Fetch a single log entry by ID
 *
 * Params:
 * - id: Log entry UUID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    // Resolve repository from DI container
    const logRepository = container.resolve<ILogRepository>('ILogRepository');

    // Fetch log entry
    const logEntry = await logRepository.findById(id);

    if (!logEntry) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    return NextResponse.json({ log: logEntry });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { error: 'Failed to fetch log entry', message: err.message },
      { status: 500 }
    );
  }
}
