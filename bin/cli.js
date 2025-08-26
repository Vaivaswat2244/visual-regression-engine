#!/usr/bin/env node
const { VisualRegressionEngine } = require('./index.js');

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
    const engine = new VisualRegressionEngine();
    const result = await engine.compare(config);
    
    if (config.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Comparison ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (result.difference !== undefined) {
        console.log(`Difference: ${(result.difference * 100).toFixed(2)}%`);
      }
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
    }
    
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

function parseArgs(args) {
  const config = { format: 'json', threshold: 0.1 };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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

main().catch(console.error);