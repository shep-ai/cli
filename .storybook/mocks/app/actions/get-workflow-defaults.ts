export async function getWorkflowDefaults() {
  return {
    approvalGates: {
      allowPrd: false,
      allowPlan: false,
      allowMerge: false,
    },
    push: false,
    openPr: false,
  };
}
