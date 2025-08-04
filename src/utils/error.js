class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ComparisonError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'ComparisonError';
    this.cause = cause;
  }
}

module.exports = {
  ValidationError,
  ComparisonError
};