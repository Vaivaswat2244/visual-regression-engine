import * as p5 from 'p5';
import pixelmatch from 'pixelmatch';

// Default configuration
const DEFAULT_CONFIG = {
  MAX_SIDE: 800,
  BG_COLOR: [255, 255, 255] as [number, number, number],
  PIXEL_MATCH_OPTIONS: {
    threshold: 0.5,
    includeAA: false,
    alpha: 0.1
  },
  MIN_CLUSTER_SIZE: 4,
  MAX_TOTAL_DIFF_PIXELS: 40
};

export interface ComparisonConfig {
  MAX_SIDE?: number;
  BG_COLOR?: [number, number, number];
  PIXEL_MATCH_OPTIONS?: {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
  };
  MIN_CLUSTER_SIZE?: number;
  MAX_TOTAL_DIFF_PIXELS?: number;
}

export interface ClusterInfo {
  size: number;
  pixels: Array<{x: number, y: number}>;
  isLineShift: boolean;
}

export interface ComparisonResult {
  ok: boolean;
  diff: p5.Graphics;
  details?: {
    totalDiffPixels: number;
    significantDiffPixels: number;
    clusters: ClusterInfo[];
  };
}

export class P5VisualCompare {
  private config: Required<ComparisonConfig>;
  private p5Instance: p5;

  constructor(p5Instance: p5, config: ComparisonConfig = {}) {
    this.p5Instance = p5Instance;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      PIXEL_MATCH_OPTIONS: {
        ...DEFAULT_CONFIG.PIXEL_MATCH_OPTIONS,
        ...config.PIXEL_MATCH_OPTIONS
      }
    };
  }

  /**
   * Compare two p5.Image objects and return detailed comparison results
   */
  async checkMatch(actual: p5.Image, expected: p5.Image): Promise<ComparisonResult> {
    const { MAX_SIDE, BG_COLOR } = this.config;
    
    // Calculate scaling
    let scale = Math.min(MAX_SIDE / expected.width, MAX_SIDE / expected.height);
    const ratio = expected.width / expected.height;
    const narrow = ratio !== 1;
    if (narrow) {
      scale *= 2;
    }
    
    // Resize images
    for (const img of [actual, expected]) {
      img.resize(
        Math.ceil(img.width * scale),
        Math.ceil(img.height * scale)
      );
    }

    // Ensure both images have the same dimensions
    const width = expected.width;
    const height = expected.height;
    
    // Create canvases with background color
    const actualCanvas = this.p5Instance.createGraphics(width, height);
    const expectedCanvas = this.p5Instance.createGraphics(width, height);
    actualCanvas.pixelDensity(1);
    expectedCanvas.pixelDensity(1);
    
    actualCanvas.background(...BG_COLOR);
    expectedCanvas.background(...BG_COLOR);
    
    actualCanvas.image(actual, 0, 0);
    expectedCanvas.image(expected, 0, 0);
    
    // Load pixel data
    actualCanvas.loadPixels();
    expectedCanvas.loadPixels();
    
    // Create diff output canvas
    const diffCanvas = this.p5Instance.createGraphics(width, height);
    diffCanvas.pixelDensity(1);
    diffCanvas.loadPixels();
    
    // Run pixelmatch
    const diffCount = pixelmatch(
      actualCanvas.pixels,
      expectedCanvas.pixels,
      diffCanvas.pixels,
      width,
      height,
      this.config.PIXEL_MATCH_OPTIONS
    );
    
    // If no differences, return early
    if (diffCount === 0) {
      actualCanvas.remove();
      expectedCanvas.remove();
      diffCanvas.updatePixels();
      return { ok: true, diff: diffCanvas };
    }
    
    // Post-process to identify and filter out isolated differences
    const visited = new Set<number>();
    const clusterSizes: ClusterInfo[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = (y * width + x) * 4;
        
        // If this is a diff pixel (red in pixelmatch output) and not yet visited
        if (
          diffCanvas.pixels[pos] === 255 && 
          diffCanvas.pixels[pos + 1] === 0 && 
          diffCanvas.pixels[pos + 2] === 0 &&
          !visited.has(pos)
        ) {
          // Find the connected cluster size using BFS
          const clusterInfo = this.findClusterSize(diffCanvas.pixels, x, y, width, height, 1, visited);
          clusterSizes.push(clusterInfo);
        }
      }
    }
    
    // Define significance thresholds
    const { MIN_CLUSTER_SIZE, MAX_TOTAL_DIFF_PIXELS } = this.config;

    // Determine if the differences are significant
    const nonLineShiftClusters = clusterSizes.filter(c => !c.isLineShift && c.size >= MIN_CLUSTER_SIZE);
    
    // Calculate significant differences excluding line shifts
    const significantDiffPixels = nonLineShiftClusters.reduce((sum, c) => sum + c.size, 0);

    // Update the diff canvas
    diffCanvas.updatePixels();
    
    // Clean up canvases
    actualCanvas.remove();
    expectedCanvas.remove();
    
    // Determine test result
    const ok = (
      diffCount === 0 ||  
      (
        significantDiffPixels === 0 ||  
        (
          (significantDiffPixels <= MAX_TOTAL_DIFF_PIXELS) &&  
          (nonLineShiftClusters.length <= 2)  // Not too many significant clusters
        )
      )
    );

    return { 
      ok,
      diff: diffCanvas,
      details: {
        totalDiffPixels: diffCount,
        significantDiffPixels,
        clusters: clusterSizes
      }
    };
  }

  private findClusterSize(
    pixels: Uint8ClampedArray, 
    startX: number, 
    startY: number, 
    width: number, 
    height: number, 
    radius: number, 
    visited: Set<number>
  ): ClusterInfo {
    const queue = [{x: startX, y: startY}];
    let size = 0;
    const clusterPixels: Array<{x: number, y: number}> = [];
    
    while (queue.length > 0) {
      const {x, y} = queue.shift()!;
      const pos = (y * width + x) * 4;
      
      // Skip if already visited
      if (visited.has(pos)) continue;
      
      // Skip if not a diff pixel
      if (pixels[pos] !== 255 || pixels[pos + 1] !== 0 || pixels[pos + 2] !== 0) continue;
      
      // Mark as visited
      visited.add(pos);
      size++;
      clusterPixels.push({x, y});
      
      // Add neighbors to queue
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          // Skip if out of bounds
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          // Skip if already visited
          const npos = (ny * width + nx) * 4;
          if (!visited.has(npos)) {
            queue.push({x: nx, y: ny});
          }
        }
      }
    }

    let isLineShift = false;
    if (clusterPixels.length > 0) {
      // Count pixels with limited neighbors (line-like characteristic)
      let linelikePixels = 0;
      
      for (const {x, y} of clusterPixels) {
        // Count neighbors
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue; // Skip self
            
            const nx = x + dx;
            const ny = y + dy;
            
            // Skip if out of bounds
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            
            const npos = (ny * width + nx) * 4;
            // Check if neighbor is a diff pixel
            if (pixels[npos] === 255 && pixels[npos + 1] === 0 && pixels[npos + 2] === 0) {
              neighbors++;
            }
          }
        }
        
        // Line-like pixels typically have 1-2 neighbors
        if (neighbors <= 2) {
          linelikePixels++;
        }
      }
      
      // If most pixels (>80%) in the cluster have ≤2 neighbors, it's likely a line shift
      isLineShift = linelikePixels / clusterPixels.length > 0.8;
    }

    return {
      size,
      pixels: clusterPixels,
      isLineShift
    };
  }

  /**
   * Static method for quick comparisons without creating an instance
   */
  static async compare(
    p5Instance: p5, 
    actual: p5.Image, 
    expected: p5.Image, 
    config: ComparisonConfig = {}
  ): Promise<ComparisonResult> {
    const comparer = new P5VisualCompare(p5Instance, config);
    return comparer.checkMatch(actual, expected);
  }
}

// Export the original function for backward compatibility
export async function checkMatch(
  actual: p5.Image, 
  expected: p5.Image, 
  p5Instance: p5,
  config: ComparisonConfig = {}
): Promise<ComparisonResult> {
  return P5VisualCompare.compare(p5Instance, actual, expected, config);
}

export default P5VisualCompare;