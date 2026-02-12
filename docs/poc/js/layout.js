export class LayoutEngine {
  constructor() {
    this.NODE_WIDTH = 260;
    this.NODE_HEIGHT = 96;
    this.X_GAP = 300;
    this.REPO_PILL_WIDTH = 200;
    this.REPO_FEATURES_GAP = 40; // Gap between repo pill and first feature column
  }

  /**
   * Calculate positions for features grouped by repository
   * @param {Map<string, Object[]>} featuresByRepo - Map of repoId -> features
   * @param {Object[]} repos - Array of repository objects
   * @returns {{ repoPositions: Map, featurePositions: Map, totalHeight: number }}
   */
  calculateWithRepos(featuresByRepo, repos) {
    const repoPositions = new Map();
    const featurePositions = new Map();
    let currentY = 0;
    const repoX = 50;
    const featuresStartX = repoX + this.REPO_PILL_WIDTH + this.REPO_FEATURES_GAP;

    repos.forEach((repo) => {
      const features = featuresByRepo.get(repo.id) || [];

      if (features.length === 0) {
        // Repo with no features - still show the pill
        const rowHeight = this.NODE_HEIGHT + 10;
        repoPositions.set(repo.id, { x: repoX, y: currentY + rowHeight / 2 - 20 });
        currentY += rowHeight; // Same height as a feature card row
        return;
      }

      // Build hierarchy for this repo's features
      const roots = this.buildHierarchy(features);

      // Calculate feature positions within this repo group
      roots.forEach((root) => {
        const treeSize = this.traverse(root, 0, currentY, featurePositions, featuresStartX);
        currentY += treeSize;
      });

      // Position repo pill so its center (y+20) aligns with average of root feature centers (y+48)
      const rootCenters = roots.map((r) => featurePositions.get(r.id).y + this.NODE_HEIGHT / 2);
      const avgCenter = rootCenters.reduce((sum, y) => sum + y, 0) / rootCenters.length;
      repoPositions.set(repo.id, { x: repoX, y: avgCenter - 20 });

      currentY += 32; // Gap between repo groups
    });

    return { repoPositions, featurePositions, totalHeight: currentY };
  }

  /**
   * Build hierarchy from flat feature list
   */
  buildHierarchy(features) {
    const map = {};
    const roots = [];
    features.forEach((f) => {
      f.children = [];
      map[f.id] = f;
    });
    features.forEach((f) => {
      if (f.parentId && map[f.parentId]) {
        map[f.parentId].children.push(f);
      } else {
        roots.push(f);
      }
    });
    return roots;
  }

  calculate(roots) {
    const positions = new Map();
    let currentY = 0;
    roots.forEach((root) => {
      const treeSize = this.traverse(root, 0, currentY, positions, 50);
      currentY += treeSize + 16;
    });
    return { positions, totalHeight: currentY };
  }

  traverse(node, level, startY, positions, baseX = 50) {
    const x = baseX + level * this.X_GAP;
    if (!node.children || node.children.length === 0) {
      positions.set(node.id, { x, y: startY });
      return this.NODE_HEIGHT + 10;
    }

    let totalHeight = 0;
    let childY = startY;
    node.children.forEach((child) => {
      const h = this.traverse(child, level + 1, childY, positions, baseX);
      totalHeight += h;
      childY += h;
    });

    const firstChildY = positions.get(node.children[0].id).y;
    const lastChildY = positions.get(node.children[node.children.length - 1].id).y;
    const y = firstChildY + (lastChildY - firstChildY) / 2;

    positions.set(node.id, { x, y });
    return totalHeight;
  }
}
