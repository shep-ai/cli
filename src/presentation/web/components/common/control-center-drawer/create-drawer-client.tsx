'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { createFeature } from '@/app/actions/create-feature';
import { FeatureCreateDrawer } from '@/components/common/feature-create-drawer';
import type { FeatureCreatePayload } from '@/components/common/feature-create-drawer';
import type { ParentFeatureOption } from '@/components/common/feature-create-drawer/feature-create-drawer';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { useSoundAction } from '@/hooks/use-sound-action';

export interface CreateDrawerClientProps {
  repositoryPath: string;
  initialParentId?: string;
  features: ParentFeatureOption[];
  workflowDefaults?: WorkflowDefaults;
}

export function CreateDrawerClient({
  repositoryPath,
  initialParentId,
  features,
  workflowDefaults,
}: CreateDrawerClientProps) {
  const router = useRouter();
  const createSound = useSoundAction('create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive open state from the URL. Next.js parallel routes preserve slot
  // content during soft navigation, so this component is NOT unmounted when
  // navigating to `/`. We watch the pathname and let Vaul handle the close
  // animation when the path no longer matches the create route.
  const pathname = usePathname();
  const isOpen = pathname.startsWith('/create');

  const onClose = useCallback(() => {
    router.push('/');
  }, [router]);

  const onSubmit = useCallback(
    (data: FeatureCreatePayload) => {
      setIsSubmitting(true);

      // Dispatch event for optimistic canvas update before navigating
      window.dispatchEvent(
        new CustomEvent('shep:feature-created', {
          detail: {
            name: data.name,
            description: data.description,
            repositoryPath: data.repositoryPath,
          },
        })
      );

      // Close the drawer immediately for responsive UI
      router.push('/');

      // Fire server action in the background
      createFeature(data)
        .then((result) => {
          if (result.error) {
            toast.error(result.error);
            // Dispatch rollback event
            window.dispatchEvent(new CustomEvent('shep:feature-create-failed'));
            return;
          }
          createSound.play();
          router.refresh();
        })
        .catch(() => {
          toast.error('Failed to create feature');
          window.dispatchEvent(new CustomEvent('shep:feature-create-failed'));
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [router, createSound]
  );

  return (
    <FeatureCreateDrawer
      open={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      repositoryPath={repositoryPath}
      features={features}
      workflowDefaults={workflowDefaults}
      initialParentId={initialParentId}
      isSubmitting={isSubmitting}
    />
  );
}
