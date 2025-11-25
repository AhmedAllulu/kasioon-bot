const { body, query, param, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errorHandler');

/**
 * Validation middleware
 */

/**
 * Check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    throw new ValidationError('Validation failed', errorMessages);
  }

  next();
};

/**
 * Validate search request
 */
const validateSearch = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Query is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Query must be between 2 and 500 characters'),
  body('language')
    .optional()
    .isIn(['ar', 'en'])
    .withMessage('Language must be ar or en'),
  body('source')
    .optional()
    .isIn(['api', 'telegram', 'whatsapp', 'website', 'app'])
    .withMessage('Invalid source'),
  body('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be between 1 and 100'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  validate
];

/**
 * Validate analyze request
 */
const validateAnalyze = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Query is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Query must be between 2 and 500 characters'),
  body('language')
    .optional()
    .isIn(['ar', 'en'])
    .withMessage('Language must be ar or en'),
  validate
];

/**
 * Validate webhook request
 */
const validateWebhook = [
  body('messageType')
    .optional()
    .isIn(['text', 'voice', 'audio'])
    .withMessage('Invalid message type'),
  body('language')
    .optional()
    .isIn(['ar', 'en'])
    .withMessage('Language must be ar or en'),
  validate
];

/**
 * Validate category search
 */
const validateCategorySearch = [
  param('categoryId')
    .isUUID()
    .withMessage('Invalid category ID'),
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be between 1 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  validate
];

module.exports = {
  validateSearch,
  validateAnalyze,
  validateWebhook,
  validateCategorySearch
};
