const winston = require('winston');
const path = require('path');
const chalk = require('chalk');

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Enhanced console format with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Color coding by level
    const levelColors = {
      error: chalk.red.bold,
      warn: chalk.yellow.bold,
      info: chalk.blue,
      debug: chalk.green,
      verbose: chalk.cyan
    };

    // Determine color function based on level
    const levelName = level.toLowerCase();
    const colorFn = levelColors[levelName] || chalk.white;

    // Format timestamp
    const ts = chalk.gray(timestamp);

    // Format level with colors
    let formattedLevel;
    if (levelName === 'error') {
      formattedLevel = chalk.bgRed.white.bold(` ${level.toUpperCase()} `);
    } else if (levelName === 'warn') {
      formattedLevel = chalk.bgYellow.black.bold(` ${level.toUpperCase()} `);
    } else if (levelName === 'info') {
      formattedLevel = chalk.bgBlue.white(` ${level.toUpperCase()} `);
    } else if (levelName === 'debug') {
      formattedLevel = chalk.bgGreen.white(` ${level.toUpperCase()} `);
    } else {
      formattedLevel = chalk.gray(`[${level}]`);
    }

    // Format message
    let formattedMessage = colorFn(message);

    // Add meta data if present
    let msg = `${ts} ${formattedLevel} ${formattedMessage}`;

    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta, null, 2);
      if (levelName === 'error') {
        msg += '\n' + chalk.red(metaStr);
      } else {
        msg += '\n' + chalk.gray(metaStr);
      }
    }

    return msg;
  })
);

// Create transports
const transports = [];

// Console transport
transports.push(
  new winston.transports.Console({
    format: nodeEnv === 'production' ? logFormat : consoleFormat,
    level: logLevel
  })
);

// File transports for production
if (nodeEnv === 'production') {
  // Error log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    })
  );

  // Combined log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false
});

// Add stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Add friendly helper methods for better debugging
logger.success = (message, meta = {}) => {
  logger.info(`✓ ${message}`, meta);
};

logger.failure = (message, meta = {}) => {
  logger.error(`✗ ${message}`, meta);
};

logger.dbQuery = (message, meta = {}) => {
  logger.debug(`🔍 DB Query: ${message}`, meta);
};

logger.dbError = (message, error, query = null) => {
  const meta = {
    error: error.message,
    code: error.code,
    ...(query && { query: query.substring(0, 200) })
  };
  logger.error(`❌ Database Error: ${message}`, meta);
};

logger.apiCall = (message, meta = {}) => {
  logger.debug(`🌐 API Call: ${message}`, meta);
};

logger.apiError = (message, error) => {
  logger.error(`🚫 API Error: ${message}`, {
    error: error.message,
    status: error.status || error.statusCode,
    code: error.code
  });
};

logger.searchQuery = (message, meta = {}) => {
  logger.info(`🔎 Search: ${message}`, meta);
};

logger.matchFound = (type, message, meta = {}) => {
  logger.debug(`✅ ${type} Match: ${message}`, meta);
};

logger.matchNotFound = (type, message) => {
  logger.debug(`⚠️  ${type} Match Failed: ${message}`);
};

logger.cacheHit = (key) => {
  logger.debug(`⚡ Cache Hit: ${key}`);
};

logger.cacheMiss = (key) => {
  logger.debug(`💾 Cache Miss: ${key}`);
};

logger.performance = (operation, duration, meta = {}) => {
  const color = duration > 1000 ? 'slow' : duration > 500 ? 'medium' : 'fast';
  const emoji = color === 'slow' ? '🐌' : color === 'medium' ? '⏱️' : '⚡';
  logger.info(`${emoji} Performance: ${operation} took ${duration}ms`, meta);
};

module.exports = logger;
