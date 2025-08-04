const ImageComparator = require('./core/ImageComparator');
const { ValidationError, ComparisonError } = require('./utils/errors');

class VisualComparisonEngine {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 0.5,
      includeAA: options.includeAA !== undefined ? options.includeAA : false,
      alpha: options.alpha || 0.1,
      maxSide: options.maxSide || 400,
      backgroundColor: options.backgroundColor || [240, 240, 240, 255],
      minClusterSize: options.minClusterSize || 4,
      maxTotalDiffPixels: options.maxTotalDiffPixels || 40,
      maxSignificantClusters: options.maxSignificantClusters || 2,
      lineShiftThreshold: options.lineShiftThreshold || 0.8,
      ...options
    };
    
    this.comparator = new ImageComparator(this.options);
  }

  /**
   * Compare two images and return comparison result
   * @param {ImageData|Buffer|Canvas} actual - Actual image
   * @param {ImageData|Buffer|Canvas} expected - Expected image
   * @param {Object} options - Override default options
   * @returns {Promise<ComparisonResult>}
   */
  async compare(actual, expected, options = {}) {
    try {
      const mergedOptions = { ...this.options, ...options };
      return await this.comparator.compare(actual, expected, mergedOptions);
    } catch (error) {
      throw new ComparisonError(`Comparison failed: ${error.message}`, error);
    }
  }

  /**
   * Batch compare multiple image pairs
   * @param {Array<{actual, expected, name}>} imagePairs
   * @param {Object} options
   * @returns {Promise<Array<ComparisonResult>>}
   */
  async batchCompare(imagePairs, options = {}) {
    const results = [];
    const mergedOptions = { ...this.options, ...options };
    
    for (const pair of imagePairs) {
      try {
        const result = await this.comparator.compare(
          pair.actual, 
          pair.expected, 
          mergedOptions
        );
        results.push({
          name: pair.name,
          ...result
        });
      } catch (error) {
        results.push({
          name: pair.name,
          ok: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = VisualComparisonEngine;