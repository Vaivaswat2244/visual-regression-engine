// src/core/ImageProcessor.js
const { createCanvas, createImageData, Image } = require('canvas');

class ImageProcessor {
  constructor(options = {}) {
    this.options = options;
  }

  async processImages(actual, expected, options) {
    const actualCanvas = await this._toCanvas(actual);
    const expectedCanvas = await this._toCanvas(expected);

    const scale = this._calculateScale(expectedCanvas, options.maxSide);
    
    const resizedActual = this._resizeImage(actualCanvas, scale);
    const resizedExpected = this._resizeImage(expectedCanvas, scale);

    const width = resizedExpected.width;
    const height = resizedExpected.height;
    const processedActual = this._createStandardizedCanvas(resizedActual, width, height, options.backgroundColor);
    const processedExpected = this._createStandardizedCanvas(resizedExpected, width, height, options.backgroundColor);

    const actualImageData = processedActual.getContext('2d').getImageData(0, 0, width, height);
    const expectedImageData = processedExpected.getContext('2d').getImageData(0, 0, width, height);

    return {
      actualImageData,
      expectedImageData,
      width,
      height
    };
  }

  async _toCanvas(input) {
    if (input instanceof HTMLCanvasElement || (input.getContext)) {
      return input;
    }
    
    if (input.data && input.width && input.height) {
      
      const canvas = createCanvas(input.width, input.height);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(input, 0, 0);
      return canvas;
    }
    
    if (Buffer.isBuffer(input)) {
      const img = new Image();
      img.src = input;
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas;
    }

    throw new Error('Unsupported image input type');
  }

  _calculateScale(canvas, maxSide) {
    const scale = Math.min(maxSide / canvas.width, maxSide / canvas.height);
    const ratio = canvas.width / canvas.height;
    const narrow = ratio !== 1;
    
    return narrow ? scale * 2 : scale;
  }

  _resizeImage(canvas, scale) {
    const newWidth = Math.ceil(canvas.width * scale);
    const newHeight = Math.ceil(canvas.height * scale);
    
    const resizedCanvas = createCanvas(newWidth, newHeight);
    const ctx = resizedCanvas.getContext('2d');
    
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
    return resizedCanvas;
  }

  _createStandardizedCanvas(sourceCanvas, width, height, backgroundColor) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = `rgba(${backgroundColor.join(',')})`;
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(sourceCanvas, 0, 0);
    
    return canvas;
  }
}

module.exports = ImageProcessor;