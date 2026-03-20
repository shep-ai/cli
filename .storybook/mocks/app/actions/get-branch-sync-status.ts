export async function getBranchSyncStatus(_featureId: string): Promise<{
  success: boolean;
  data?: { ahead: number; behind: number; baseBranch: string; checkedAt: string };
  error?: string;
}> {
  return {
    success: true,
    data: { ahead: 3, behind: 0, baseBranch: 'main', checkedAt: new Date().toISOString() },
  };
}
