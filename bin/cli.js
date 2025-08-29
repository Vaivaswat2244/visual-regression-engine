#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

async function main() {
  const args = process.argv.slice(2);
  
  // Handle version command
  if (args.includes('--version') || args.includes('-v')) {
    console.log(require('../package.json').version);
    return;
  }
  
  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Visual Regression Engine CLI
Usage:
  visual-regression-engine compare --baseline <path> --comparison <path> [options]
  visual-regression-engine --version
  visual-regression-engine --help

Options:
  --baseline <path>      Path to baseline image
  --comparison <path>    Path to comparison image  
  --output <path>        Path for diff output (optional)
  --threshold <number>   Difference threshold (default: 0.1)
  --format <format>      Output format: json|text (default: json)
`);
    return;
  }
  
  // Parse arguments
  const config = parseArgs(args);
  
  if (!config.baseline || !config.comparison) {
    console.error('Error: Both --baseline and --comparison are required');
    process.exit(1);
  }
  
  try {
    // Import the VisualComparisonEngine
    const VisualComparisonEngine = require('../src/index.js');
    
    // Create engine with options
    const engine = new VisualComparisonEngine({
      threshold: config.threshold,
      // Add other options as needed
    });
    
    // Check if files exist
    if (!fs.existsSync(config.baseline)) {
      throw new Error(`Baseline file not found: ${config.baseline}`);
    }
    if (!fs.existsSync(config.comparison)) {
      throw new Error(`Comparison file not found: ${config.comparison}`);
    }
    
    // Read image files as buffers
    const baselineBuffer = fs.readFileSync(config.baseline);
    const comparisonBuffer = fs.readFileSync(config.comparison);
    
    // Perform comparison
    const result = await engine.compare(baselineBuffer, comparisonBuffer);
    
    // Handle output - convert ImageData to PNG buffer
    let diffImageBuffer = null;
    if (config.output && result.diffImageData) {
      diffImageBuffer = imageDataToPngBuffer(result.diffImageData);
      
      // Ensure output directory exists
      const outputDir = path.dirname(config.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Save diff image
      const outputPath = config.output.endsWith('.png') ? config.output : path.join(config.output, 'diff.png');
      fs.writeFileSync(outputPath, diffImageBuffer);
      console.log(`Diff image saved to: ${outputPath}`);
    }
    
    // Calculate diff percentage
    const totalPixels = result.diffImageData ? result.diffImageData.width * result.diffImageData.height : 0;
    const diffPercent = totalPixels > 0 ? result.diffCount / totalPixels : 0;
    
    // Output results
    if (config.format === 'json') {
      const output = {
        passed: result.ok || false,
        difference: diffPercent,
        diffCount: result.diffCount || 0,
        threshold: config.threshold,
        baseline: config.baseline,
        comparison: config.comparison,
        output: config.output,
        details: result.details || {}
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`Comparison ${result.ok ? 'PASSED' : 'FAILED'}`);
      console.log(`Difference: ${(diffPercent * 100).toFixed(2)}%`);
      console.log(`Diff pixels: ${result.diffCount || 0}`);
      if (result.details && result.details.significantDiffPixels !== undefined) {
        console.log(`Significant diff pixels: ${result.details.significantDiffPixels}`);
        console.log(`Clusters found: ${result.details.clusters ? result.details.clusters.length : 0}`);
      }
    }
    
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    const output = {
      error: error.message,
      baseline: config.baseline,
      comparison: config.comparison
    };
    
    if (config.format === 'json') {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

function parseArgs(args) {
  const config = { 
    threshold: 0.1,
    format: 'json'
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case 'compare':
        // Skip the command name
        break;
      case '--baseline':
        config.baseline = args[++i];
        break;
      case '--comparison':
        config.comparison = args[++i];
        break;
      case '--output':
        config.output = args[++i];
        break;
      case '--threshold':
        config.threshold = parseFloat(args[++i]);
        break;
      case '--format':
        config.format = args[++i];
        break;
    }
  }
  
  return config;
}

function imageDataToPngBuffer(imageData) {
  // Create a canvas with the same dimensions
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  
  // Put the image data onto the canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to PNG buffer
  return canvas.toBuffer('image/png');
}

main().catch(console.error);