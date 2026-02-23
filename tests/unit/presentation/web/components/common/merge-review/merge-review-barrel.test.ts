import { describe, it, expect } from 'vitest';
import * as barrel from '@/components/common/merge-review';

describe('merge-review barrel export', () => {
  it('exports MergeReview component', () => {
    expect(barrel.MergeReview).toBeDefined();
    expect(typeof barrel.MergeReview).toBe('function');
  });

  it('exports MergeReviewDrawer component', () => {
    expect(barrel.MergeReviewDrawer).toBeDefined();
    expect(typeof barrel.MergeReviewDrawer).toBe('function');
  });
});
