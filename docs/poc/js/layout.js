export class LayoutEngine {
  constructor() {
    this.NODE_WIDTH = 260;
    this.NODE_HEIGHT = 96;
    this.X_GAP = 300;
  }

  calculate(roots) {
    const positions = new Map();
    let currentY = 0;
    roots.forEach((root) => {
      const treeSize = this.traverse(root, 0, currentY, positions);
      currentY += treeSize + 16;
    });
    return { positions, totalHeight: currentY };
  }

  traverse(node, level, startY, positions) {
    const x = 50 + level * this.X_GAP;
    if (!node.children || node.children.length === 0) {
      positions.set(node.id, { x, y: startY });
      return this.NODE_HEIGHT + 10;
    }

    let totalHeight = 0;
    let childY = startY;
    node.children.forEach((child) => {
      const h = this.traverse(child, level + 1, childY, positions);
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
