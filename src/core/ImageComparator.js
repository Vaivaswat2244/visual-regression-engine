const pixelmatch = require('pixelmatch');
const { createImageData, createCanvas } = require('canvas');
const ClusterAnalyzer = require('./ClusterAnalyzer');
const ImageProcessor = require('./ImageProcessor');
const { ValidationError } = require('../utils/errors');

class ImageComparator {
  constructor(options = {}) {
    this.options = options;
    this.processor = new ImageProcessor(options);
    this.clusterAnalyzer = new ClusterAnalyzer(options);
  }

  async compare(actual, expected, options = {}) {
    const mergedOptions = { ...this.options, ...options };

    this._validateInputs(actual, expected);

    const processedImages = await this.processor.processImages(actual, expected, mergedOptions);
    const { actualImageData, expectedImageData, width, height } = processedImages;

    const diffBuffer = new Uint8ClampedArray(width * height * 4);

    const diffCount = pixelmatch(
      actualImageData.data,
      expectedImageData.data,
      diffBuffer,
      width,
      height,
      {
        threshold: mergedOptions.threshold,
        includeAA: mergedOptions.includeAA,
        alpha: mergedOptions.alpha
      }
    );

    const diffImageData = createImageData(diffBuffer, width, height);

    if (diffCount === 0) {
      return {
        ok: true,
        diffCount: 0,
        diffImageData,
        diffImage: this._createDiffPngBuffer(diffImageData), // Add PNG buffer
        details: {
          totalDiffPixels: 0,
          significantDiffPixels: 0,
          clusters: []
        }
      };
    }

    const clusterAnalysis = this.clusterAnalyzer.analyzeClusters(
      diffBuffer,
      width,
      height,
      mergedOptions
    );

    const ok = this._evaluateSignificance(clusterAnalysis, mergedOptions);

    return {
      ok,
      diffCount,
      diffImageData,
      diffImage: this._createDiffPngBuffer(diffImageData), // Add PNG buffer
      details: {
        totalDiffPixels: diffCount,
        significantDiffPixels: clusterAnalysis.significantPixels,
        clusters: clusterAnalysis.clusters,
        analysis: clusterAnalysis
      }
    };
  }

  _validateInputs(actual, expected) {
    if (!actual || !expected) {
      throw new ValidationError('Both actual and expected images are required');
    }
  }

  _evaluateSignificance(analysis, options) {
    const { significantPixels, significantClusters } = analysis;

    return (
      significantPixels === 0 ||
      (
        significantPixels <= options.maxTotalDiffPixels &&
        significantClusters <= options.maxSignificantClusters
      )
    );
  }

  _createDiffPngBuffer(imageData) {
    // Create a canvas with the same dimensions
    const canvas = createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    // Put the image data onto the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to PNG buffer
    return canvas.toBuffer('image/png');
  }
}

module.exports = ImageComparator;