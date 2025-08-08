# Visual Regression Engine

A modular visual comparison engine specifically designed for Processing and p5.js regression testing. This engine provides advanced clustering analysis to detect significant visual differences while filtering out minor rendering variations.

## Features

- 🎨 **Creative Coding Focused**: Built specifically for Processing and p5.js visual testing
- 🔍 **Smart Difference Detection**: Advanced clustering analysis to distinguish significant changes from noise
- 📏 **Configurable Thresholds**: Customizable sensitivity and tolerance settings
- 🚀 **High Performance**: Efficient image processing with optimized algorithms
- 🧩 **Modular Architecture**: Clean, extensible codebase with separate concerns
- 📊 **Detailed Analytics**: Comprehensive reporting on detected differences

## Installation

```bash
npm install visual-regression-engine
```

## Quick Start

```javascript
const VisualComparisonEngine = require('visual-regression-engine');
const { loadImage } = require('canvas');

const engine = new VisualComparisonEngine({
  threshold: 0.1,              // Pixel difference threshold (0-1)
  maxTotalDiffPixels: 100,     // Maximum allowed different pixels
  minClusterSize: 5,           // Minimum cluster size to be considered significant
  maxSignificantClusters: 3,   // Maximum allowed significant clusters
  maxSide: 800,               // Resize images to max dimension
  backgroundColor: [255, 255, 255, 255] // Background color for standardization
});

async function compareImages() {
  const actualImage = await loadImage('path/to/actual.png');
  const expectedImage = await loadImage('path/to/expected.png');
  
  const result = await engine.compare(actualImage, expectedImage);
  
  if (result.ok) {
    console.log('✅ Images match within tolerance');
  } else {
    console.log('❌ Images differ significantly');
    console.log(`Total different pixels: ${result.diffCount}`);
    console.log(`Significant different pixels: ${result.details.significantDiffPixels}`);
    console.log(`Significant clusters: ${result.details.analysis.significantClusters}`);
  }
}

compareImages();
```

## API Reference

### VisualComparisonEngine

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `threshold` | number | 0.1 | Pixel color difference threshold (0-1) |
| `maxTotalDiffPixels` | number | 100 | Maximum allowed different pixels for test to pass |
| `minClusterSize` | number | 5 | Minimum cluster size to be considered significant |
| `maxSignificantClusters` | number | 3 | Maximum allowed significant clusters |
| `maxSide` | number | 800 | Maximum dimension for image resizing |
| `backgroundColor` | array | [255,255,255,255] | RGBA background color |
| `includeAA` | boolean | false | Include anti-aliasing differences |
| `alpha` | number | 0.1 | Alpha threshold for transparency |
| `lineShiftThreshold` | number | 0.8 | Threshold for detecting line shifts |

#### Methods

##### `compare(actualImage, expectedImage, options?)`

Compares two images and returns a detailed analysis.

**Parameters:**
- `actualImage` - Image object, Canvas, Buffer, or ImageData
- `expectedImage` - Image object, Canvas, Buffer, or ImageData  
- `options` - Optional override options for this comparison

**Returns:** Promise<ComparisonResult>

```javascript
{
  ok: boolean,                    // Whether images match within tolerance
  diffCount: number,              // Total number of different pixels
  diffImageData: ImageData,       // Visual diff highlighting differences
  details: {
    totalDiffPixels: number,      // Same as diffCount
    significantDiffPixels: number,// Pixels in significant clusters only
    clusters: Array,              // Array of detected clusters
    analysis: {                   // Detailed cluster analysis
      clusters: Array,
      significantClusters: number,
      significantPixels: number,
      totalClusters: number
    }
  }
}
```

## Advanced Usage

### Folder Comparison

```javascript
const VisualComparisonEngine = require('visual-regression-engine');
const { loadImage, createCanvas } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

class TestSuite {
  constructor() {
    this.engine = new VisualComparisonEngine({
      threshold: 0.1,
      maxTotalDiffPixels: 50,
      minClusterSize: 4,
    });
  }

  async runTests() {
    const referenceDir = './test/reference';
    const actualDir = './test/actual';
    const diffOutputDir = './test/diff-output';

    await fs.mkdir(diffOutputDir, { recursive: true });

    const files = await fs.readdir(referenceDir);
    const results = [];

    for (const file of files.filter(f => /\.(png|jpg)$/i.test(f))) {
      const refImage = await loadImage(path.join(referenceDir, file));
      const actualImage = await loadImage(path.join(actualDir, file));
      
      const result = await this.engine.compare(refImage, actualImage);
      results.push({ file, ...result });

      if (!result.ok) {
        await this.saveDiffImage(result.diffImageData, 
          path.join(diffOutputDir, `diff-${file}`));
      }
    }

    return results;
  }

  async saveDiffImage(imageData, outputPath) {
    const canvas = createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
  }
}
```

### Custom Configuration for Different Test Types

```javascript
// High precision for critical UI elements
const strictEngine = new VisualComparisonEngine({
  threshold: 0.05,
  maxTotalDiffPixels: 10,
  minClusterSize: 2
});

// Relaxed settings for creative/generative content
const creativeEngine = new VisualComparisonEngine({
  threshold: 0.2,
  maxTotalDiffPixels: 500,
  minClusterSize: 10,
  lineShiftThreshold: 0.9 // More tolerant of line shifts
});
```

## Understanding the Results

### Cluster Analysis

The engine groups different pixels into clusters and analyzes their significance:

- **Line Shifts**: Detected when >80% of pixels in a cluster have ≤2 neighbors (indicates text/line movement)
- **Significant Clusters**: Clusters that meet the minimum size requirement and aren't classified as line shifts
- **Total vs Significant Pixels**: Total includes all different pixels; significant only includes those in meaningful clusters

### Typical Workflow

1. **Set appropriate thresholds** based on your content type
2. **Run initial comparison** to understand difference patterns
3. **Adjust settings** based on false positives/negatives
4. **Integrate into CI/CD** pipeline for automated testing

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Core comparison engine with clustering analysis
- Support for multiple image formats
- Configurable thresholds and options