// test/standalone-graphics-test.js
const VisualComparisonEngine = require('../src/index');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class StandaloneGraphicsTestSuite {
  constructor() {
    this.engine = new VisualComparisonEngine({
      threshold: 0.1,
      maxTotalDiffPixels: 50,
      minClusterSize: 4,
      maxSide: 400
    });
    
    this.testCases = [];
    this.outputDir = path.join(__dirname, 'graphics-output');
  }

  async setup() {
    // Create output directories
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'p5js'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'processing'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'diffs'), { recursive: true });
  }

  // Generate P5.js graphics using headless browser
  async generateP5Graphics() {
    const p5TestCases = [
      {
        name: 'basic-shapes',
        code: `
          function setup() {
            createCanvas(200, 200);
            background(240);
            noLoop();
          }
          
          function draw() {
            fill(255, 0, 0);
            ellipse(50, 50, 40, 40);
            
            fill(0, 255, 0);
            rect(100, 100, 50, 50);
            
            stroke(0, 0, 255);
            strokeWeight(3);
            line(0, 0, 200, 200);
          }
        `
      },
      {
        name: 'typography',
        code: `
          function setup() {
            createCanvas(300, 150);
            background(255);
            noLoop();
          }
          
          function draw() {
            fill(0);
            textSize(24);
            textAlign(CENTER, CENTER);
            text('Hello p5.js!', width/2, height/2);
            
            textSize(12);
            text('Visual regression test', width/2, height/2 + 30);
          }
        `
      },
      {
        name: 'bezier-curves',
        code: `
          function setup() {
            createCanvas(200, 200);
            background(255);
            noLoop();
          }
          
          function draw() {
            stroke(0);
            strokeWeight(2);
            noFill();
            
            // Draw multiple bezier curves
            for (let i = 0; i < 5; i++) {
              let y = 40 + i * 30;
              bezier(20, y, 20 + i*10, y-20, 180-i*10, y+20, 180, y);
            }
          }
        `
      },
      {
        name: 'transforms',
        code: `
          function setup() {
            createCanvas(200, 200);
            background(240);
            noLoop();
          }
          
          function draw() {
            translate(100, 100);
            
            for (let i = 0; i < 8; i++) {
              push();
              rotate(TWO_PI / 8 * i);
              fill(255, 100, 100);
              rect(30, -10, 40, 20);
              pop();
            }
          }
        `
      },
      {
        name: 'pixel-manipulation',
        code: `
          function setup() {
            createCanvas(150, 150);
            noLoop();
          }
          
          function draw() {
            loadPixels();
            for (let x = 0; x < width; x++) {
              for (let y = 0; y < height; y++) {
                let index = (x + y * width) * 4;
                pixels[index] = x * 255 / width;     // Red
                pixels[index + 1] = y * 255 / height; // Green
                pixels[index + 2] = 100;              // Blue
                pixels[index + 3] = 255;              // Alpha
              }
            }
            updatePixels();
          }
        `
      }
    ];

    const results = [];
    
    for (const testCase of p5TestCases) {
      try {
        console.log(`Generating p5.js: ${testCase.name}...`);
        const imageBuffer = await this.runP5Headless(testCase.code);
        const outputPath = path.join(this.outputDir, 'p5js', `${testCase.name}.png`);
        await fs.writeFile(outputPath, imageBuffer);
        
        results.push({
          name: testCase.name,
          platform: 'p5js',
          path: outputPath,
          success: true
        });
      } catch (error) {
        console.error(`Failed to generate ${testCase.name}:`, error.message);
        results.push({
          name: testCase.name,
          platform: 'p5js',
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Generate Processing graphics using headless mode
  async generateProcessingGraphics() {
    const processingTestCases = [
      {
        name: 'basic-shapes',
        code: `
          void setup() {
            size(200, 200);
            background(240);
            
            fill(255, 0, 0);
            ellipse(50, 50, 40, 40);
            
            fill(0, 255, 0);
            rect(100, 100, 50, 50);
            
            stroke(0, 0, 255);
            strokeWeight(3);
            line(0, 0, 200, 200);
            
            save("basic-shapes.png");
            exit();
          }
        `
      },
      {
        name: 'typography',
        code: `
          void setup() {
            size(300, 150);
            background(255);
            
            fill(0);
            textSize(24);
            textAlign(CENTER, CENTER);
            text("Hello Processing!", width/2, height/2);
            
            textSize(12);
            text("Visual regression test", width/2, height/2 + 30);
            
            save("typography.png");
            exit();
          }
        `
      },
      {
        name: 'bezier-curves',
        code: `
          void setup() {
            size(200, 200);
            background(255);
            
            stroke(0);
            strokeWeight(2);
            noFill();
            
            for (int i = 0; i < 5; i++) {
              float y = 40 + i * 30;
              bezier(20, y, 20 + i*10, y-20, 180-i*10, y+20, 180, y);
            }
            
            save("bezier-curves.png");
            exit();
          }
        `
      },
      {
        name: 'transforms',
        code: `
          void setup() {
            size(200, 200);
            background(240);
            
            translate(100, 100);
            
            for (int i = 0; i < 8; i++) {
              pushMatrix();
              rotate(TWO_PI / 8 * i);
              fill(255, 100, 100);
              rect(30, -10, 40, 20);
              popMatrix();
            }
            
            save("transforms.png");
            exit();
          }
        `
      }
    ];

    const results = [];
    
    for (const testCase of processingTestCases) {
      try {
        console.log(`Generating Processing: ${testCase.name}...`);
        await this.runProcessingSketch(testCase.code, testCase.name);
        
        const outputPath = path.join(this.outputDir, 'processing', `${testCase.name}.png`);
        results.push({
          name: testCase.name,
          platform: 'processing',
          path: outputPath,
          success: true
        });
      } catch (error) {
        console.error(`Failed to generate ${testCase.name}:`, error.message);
        results.push({
          name: testCase.name,
          platform: 'processing',
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async runP5Headless(code) {
    // Create a headless p5.js environment using jsdom
    const jsdom = require('jsdom');
    const { JSDOM } = jsdom;
    
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.min.js"></script>
        </head>
        <body>
          <script>
            ${code}
          </script>
        </body>
      </html>
    `, {
      resources: 'usable',
      runScripts: 'dangerously'
    });

    return new Promise((resolve, reject) => {
      dom.window.addEventListener('load', () => {
        setTimeout(() => {
          try {
            const canvas = dom.window.document.querySelector('canvas');
            if (canvas) {
              const dataURL = canvas.toDataURL('image/png');
              const buffer = Buffer.from(dataURL.split(',')[1], 'base64');
              resolve(buffer);
            } else {
              reject(new Error('No canvas found'));
            }
          } catch (error) {
            reject(error);
          }
        }, 1000); // Wait for p5.js to render
      });
    });
  }

  async runProcessingSketch(code, name) {
    // Create temporary Processing sketch file
    const sketchDir = path.join(this.outputDir, 'temp-processing');
    await fs.mkdir(sketchDir, { recursive: true });
    
    const sketchFile = path.join(sketchDir, `${name}.pde`);
    await fs.writeFile(sketchFile, code);
    
    try {
      // Run Processing in headless mode (requires Processing CLI)
      execSync(`processing-java --sketch=${sketchDir} --run`, {
        cwd: sketchDir,
        timeout: 10000
      });
      
      // Move generated image to correct location
      const generatedImage = path.join(sketchDir, `${name}.png`);
      const targetPath = path.join(this.outputDir, 'processing', `${name}.png`);
      
      if (await this.fileExists(generatedImage)) {
        await fs.copyFile(generatedImage, targetPath);
      }
    } finally {
      // Cleanup temp files
      await fs.rmdir(sketchDir, { recursive: true }).catch(() => {});
    }
  }

  async compareGraphics(p5Results, processingResults) {
    const comparisons = [];
    
    for (const p5Result of p5Results) {
      if (!p5Result.success) continue;
      
      const processingResult = processingResults.find(r => r.name === p5Result.name && r.success);
      if (!processingResult) continue;
      
      try {
        console.log(`Comparing: ${p5Result.name}...`);
        
        const p5Image = await loadImage(p5Result.path);
        const processingImage = await loadImage(processingResult.path);
        
        const comparison = await this.engine.compare(p5Image, processingImage, {
          strategy: 'cross-platform'
        });
        
        // Save diff image
        if (comparison.diffCount > 0) {
          const diffPath = path.join(this.outputDir, 'diffs', `${p5Result.name}-diff.png`);
          await this.saveDiffImage(comparison.diffImageData, diffPath);
        }
        
        comparisons.push({
          name: p5Result.name,
          result: comparison,
          p5Path: p5Result.path,
          processingPath: processingResult.path,
          diffPath: comparison.diffCount > 0 ? path.join('diffs', `${p5Result.name}-diff.png`) : null
        });
        
      } catch (error) {
        console.error(`Comparison failed for ${p5Result.name}:`, error.message);
        comparisons.push({
          name: p5Result.name,
          error: error.message
        });
      }
    }
    
    return comparisons;
  }

  async saveDiffImage(imageData, outputPath) {
    const canvas = createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
  }

  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async generateReport(comparisons) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: comparisons.length,
        passed: comparisons.filter(c => c.result?.ok).length,
        failed: comparisons.filter(c => c.result && !c.result.ok).length,
        errors: comparisons.filter(c => c.error).length
      },
      details: comparisons
    };
    
    const reportPath = path.join(this.outputDir, 'comparison-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Comparison Report:');
    console.log(`Total tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Errors: ${report.summary.errors}`);
    console.log(`Report saved to: ${reportPath}`);
    
    return report;
  }

  async runFullSuite() {
    console.log('🎨 Starting Standalone Graphics Test Suite\n');
    
    await this.setup();
    
    console.log('Generating p5.js graphics...');
    const p5Results = await this.generateP5Graphics();
    
    console.log('\nGenerating Processing graphics...');
    const processingResults = await this.generateProcessingGraphics();
    
    console.log('\nComparing graphics...');
    const comparisons = await this.compareGraphics(p5Results, processingResults);
    
    const report = await this.generateReport(comparisons);
    
    console.log('\n🎉 Test suite completed!');
    console.log(`Output directory: ${this.outputDir}`);
    
    return report;
  }
}

// Run if executed directly
if (require.main === module) {
  const suite = new StandaloneGraphicsTestSuite();
  suite.runFullSuite()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = StandaloneGraphicsTestSuite;