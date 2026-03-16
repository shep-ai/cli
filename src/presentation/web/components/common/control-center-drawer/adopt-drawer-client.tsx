'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { adoptBranch } from '@/app/actions/adopt-branch';
import { listBranches } from '@/app/actions/list-branches';
import { AdoptBranchDrawer } from './adopt-branch-drawer';

export interface AdoptDrawerClientProps {
  repositoryPath: string;
}

export function AdoptDrawerClient({ repositoryPath }: AdoptDrawerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  const isOnAdoptRoute = pathname.startsWith('/adopt');
  const isOpen = !isSubmitting && isOnAdoptRoute;

  // Reset isSubmitting once the route has actually changed away from /adopt
  useEffect(() => {
    if (!isOnAdoptRoute && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [isOnAdoptRoute, isSubmitting]);

  // Clear error when drawer reopens
  useEffect(() => {
    if (isOnAdoptRoute) {
      setError(undefined);
    }
  }, [isOnAdoptRoute]);

  // Fetch branches when drawer opens
  useEffect(() => {
    if (isOnAdoptRoute && repositoryPath) {
      setBranchesLoading(true);
      listBranches(repositoryPath)
        .then(setBranches)
        .catch(() => setBranches([]))
        .finally(() => setBranchesLoading(false));
    }
  }, [isOnAdoptRoute, repositoryPath]);

  const onClose = useCallback(() => {
    router.push('/');
  }, [router]);

  const onSubmit = useCallback(
    (branchName: string) => {
      setError(undefined);
      setIsSubmitting(true);
      router.push('/');

      adoptBranch({ branchName, repositoryPath })
        .then((result) => {
          if (result.error) {
            toast.error(result.error);
            return;
          }
          window.dispatchEvent(
            new CustomEvent('shep:feature-created', {
              detail: {
                featureId: result.feature!.id,
                name: result.feature!.name,
                description: result.feature!.description,
                repositoryPath: result.feature!.repositoryPath,
              },
            })
          );
          toast.success(`Branch adopted as "${result.feature!.name}"`);
        })
        .catch(() => {
          toast.error('Failed to adopt branch');
          setIsSubmitting(false);
        });
    },
    [router, repositoryPath]
  );

  return (
    <AdoptBranchDrawer
      open={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      error={error}
      branches={branches}
      branchesLoading={branchesLoading}
    />
  );
}
