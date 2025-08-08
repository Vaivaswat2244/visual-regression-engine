// examples/basic-usage.js
const VisualComparisonEngine = require('../src/index');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;

async function basicExample() {
  console.log('🎨 Visual Comparison Engine - Basic Example\n');

  // Create the engine with configuration
  const engine = new VisualComparisonEngine({
    threshold: 0.1,
    maxTotalDiffPixels: 100,
    minClusterSize: 5,
    maxSignificantClusters: 3
  });

  // Create two simple test images
  const image1 = createTestImage('Hello World', 'blue');
  const image2 = createTestImage('Hello World', 'red');

  try {
    console.log('Comparing two similar images with different colors...');
    const result = await engine.compare(image1, image2);

    console.log('\n📊 Results:');
    console.log(`- Match: ${result.ok ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Total different pixels: ${result.diffCount}`);
    console.log(`- Significant different pixels: ${result.details.significantDiffPixels}`);
    console.log(`- Total clusters found: ${result.details.analysis.totalClusters}`);
    console.log(`- Significant clusters: ${result.details.analysis.significantClusters}`);

    // Save diff image
    if (!result.ok) {
      await saveDiffImage(result.diffImageData, './diff-output.png');
      console.log('\n💾 Diff image saved as: diff-output.png');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function createTestImage(text, color) {
  const canvas = createCanvas(400, 200);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 400, 200);

  // Draw text
  ctx.fillStyle = color;
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 200, 100);

  // Add some shapes
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(100, 150, 20, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillRect(280, 130, 40, 40);

  return canvas;
}

async function saveDiffImage(imageData, filename) {
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(filename, buffer);
}

// Run the example
if (require.main === module) {
  basicExample().catch(console.error);
}