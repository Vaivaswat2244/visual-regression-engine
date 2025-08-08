// test/compare-folders.js
const VisualComparisonEngine = require('../src/index');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

// --- Configuration ---
const REFERENCE_DIR = path.join(__dirname, 'reference');
const ACTUAL_DIR = path.join(__dirname, 'absolute');
const DIFF_DIR = path.join(__dirname, 'diff-output');
// --- End Configuration ---

class FolderComparer {
  constructor() {
    this.engine = new VisualComparisonEngine({
      threshold: 0.1,         // How different a pixel color can be to be considered "the same"
      maxTotalDiffPixels: 50, // Max number of different pixels for the test to pass
      minClusterSize: 4,      // Minimum size of a cluster of different pixels to be counted
    });
  }

  async run() {
    console.log('🖼️  Starting image comparison...');
    console.log(`Reference: ${REFERENCE_DIR}`);
    console.log(`Actual:    ${ACTUAL_DIR}`);
    console.log(`Output:    ${DIFF_DIR}\n`);

    // 1. Setup output directory
    await fs.mkdir(DIFF_DIR, { recursive: true });

    // 2. Get list of reference images
    const referenceFiles = await fs.readdir(REFERENCE_DIR);
    const imageFiles = referenceFiles.filter(file => /\.(png|jpg|jpeg)$/i.test(file));

    if (imageFiles.length === 0) {
      console.log('No image files found in the reference directory. Exiting.');
      return;
    }

    const results = [];

    // 3. Loop and compare each image
    for (const filename of imageFiles) {
      const refPath = path.join(REFERENCE_DIR, filename);
      const actualPath = path.join(ACTUAL_DIR, filename);
      const diffPath = path.join(DIFF_DIR, `diff-${filename}`);

      try {
        // Check if the actual file exists before trying to load it
        await fs.access(actualPath);

        const refImage = await loadImage(refPath);
        const actualImage = await loadImage(actualPath);

        console.log(`- Comparing ${filename}...`);
        const comparison = await this.engine.compare(refImage, actualImage);
        
        results.push({ filename, ...comparison });

        if (!comparison.ok) {
          console.log(`  ❌ FAILED: ${comparison.diffCount} different pixels found.`);
          await this.saveDiffImage(comparison.diffImageData, diffPath);
          console.log(`  💾 Diff image saved to: ${diffPath}`);
        } else {
          console.log('  ✅ PASSED');
        }

      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`- Comparing ${filename}...`);
          console.error(`  ❌ ERROR: Corresponding file not found in actual directory: ${actualPath}`);
        } else {
          console.error(`An error occurred while comparing ${filename}:`, error);
        }
        results.push({ filename, ok: false, error: error.message });
      }
    }
    
    // 4. Print final report
    this.printReport(results);
  }

  async saveDiffImage(imageData, outputPath) {
    const canvas = createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
  }

  printReport(results) {
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    console.log('\n--- 📊 Comparison Summary ---');
    console.log(`Total Images Compared: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('---------------------------\n');
    
    if (failed > 0) {
        console.log("See diff images in the 'diff-output' directory.");
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const comparer = new FolderComparer();
  comparer.run().catch(error => {
    console.error('The comparison process failed with an unhandled error:', error);
    process.exit(1);
  });
}