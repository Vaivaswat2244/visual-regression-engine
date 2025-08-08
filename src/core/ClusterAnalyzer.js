class ClusterAnalyzer {
  constructor(options = {}) {
    this.options = options;
  }

  analyzeClusters(diffBuffer, width, height, options) {
    const visited = new Set();
    const clusters = [];

    // Find all clusters using BFS
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = (y * width + x) * 4;

        // Check if this is a diff pixel (red from pixelmatch) and not visited
        if (this._isDiffPixel(diffBuffer, pos) && !visited.has(pos)) {
          const cluster = this._findCluster(diffBuffer, x, y, width, height, visited);
          clusters.push(cluster);
        }
      }
    }

    // Analyze cluster significance
    const significantClusters = clusters.filter(
      cluster => !cluster.isLineShift && cluster.size >= options.minClusterSize
    );

    const significantPixels = significantClusters.reduce((sum, cluster) => sum + cluster.size, 0);

    return {
      clusters,
      significantClusters: significantClusters.length,
      significantPixels,
      totalClusters: clusters.length
    };
  }

  _isDiffPixel(buffer, pos) {
    return buffer[pos] === 255 && buffer[pos + 1] === 0 && buffer[pos + 2] === 0;
  }

  _findCluster(buffer, startX, startY, width, height, visited) {
    const queue = [{ x: startX, y: startY }];
    const clusterPixels = [];
    let size = 0;

    while (queue.length > 0) {
      const { x, y } = queue.shift();
      const pos = (y * width + x) * 4;

      if (visited.has(pos) || !this._isDiffPixel(buffer, pos)) {
        continue;
      }

      visited.add(pos);
      size++;
      clusterPixels.push({ x, y });

      // Add 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const npos = (ny * width + nx) * 4;
            if (!visited.has(npos)) {
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    const isLineShift = this._detectLineShift(clusterPixels, buffer, width, height);

    return {
      size,
      pixels: clusterPixels,
      isLineShift,
      bounds: this._calculateBounds(clusterPixels)
    };
  }

  _detectLineShift(clusterPixels, buffer, width, height) {
    if (clusterPixels.length === 0) return false;

    let linelikePixels = 0;

    for (const { x, y } of clusterPixels) {
      let neighbors = 0;

      // Count diff pixel neighbors in 8-connected neighborhood
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const npos = (ny * width + nx) * 4;
            if (this._isDiffPixel(buffer, npos)) {
              neighbors++;
            }
          }
        }
      }

      // Line-like pixels typically have ≤2 neighbors
      if (neighbors <= 2) {
        linelikePixels++;
      }
    }

    // If >80% of pixels are line-like, consider it a line shift
    return linelikePixels / clusterPixels.length > this.options.lineShiftThreshold;
  }

  _calculateBounds(pixels) {
    if (pixels.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = pixels[0].x, maxX = pixels[0].x;
    let minY = pixels[0].y, maxY = pixels[0].y;

    for (const { x, y } of pixels) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
}

module.exports = ClusterAnalyzer;