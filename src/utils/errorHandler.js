const logger = require('./logger');

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, { errors });
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database error occurred') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class AIServiceError extends AppError {
  constructor(message = 'AI service error occurred') {
    super(message, 503);
    this.name = 'AIServiceError';
  }
}

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  logger.error('Error occurred:', {
    message: error.message,
    statusCode: error.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: error.stack
  });

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map(e => e.message);
    error = new ValidationError('Validation failed', errors);
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    error = new AppError('Duplicate entry', 409);
  }

  if (err.code === '23503') {
    error = new AppError('Referenced resource not found', 404);
  }

  if (err.code === '22P02') {
    error = new AppError('Invalid data format', 400);
  }

  // OpenAI errors
  if (err.status === 429) {
    error = new AIServiceError('Rate limit exceeded. Please try again later.');
  }

  if (err.status === 401) {
    error = new AIServiceError('AI service authentication failed');
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(error.details || {}),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

/**
 * Handle async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.originalUrl
    }
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AIServiceError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
