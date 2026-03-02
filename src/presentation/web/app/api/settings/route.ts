import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import { settingsFormSchema } from '@/components/features/settings/settings-schema';

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const result = settingsFormSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const settings = {
      ...body,
      ...result.data,
    };

    const useCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    const updated = await useCase.execute(settings);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
