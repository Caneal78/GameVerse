/**
 * Logger Utility
 * 
 * Centralized logging with configurable log levels.
 * Debug logs are disabled in production.
 * 
 * @module Logger
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
};

// Current log level - can be changed at runtime
let currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

/**
 * Set the current log level
 * @param {string} level - 'debug', 'info', 'warning', or 'error'
 */
export function setLogLevel(level) {
  const upperLevel = level.toUpperCase();
  if (LOG_LEVELS[upperLevel] !== undefined) {
    currentLevel = LOG_LEVELS[upperLevel];
  }
}

/**
 * Get the current log level name
 * @returns {string} Current log level name
 */
export function getLogLevel() {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLevel)?.toLowerCase() || 'info';
}

/**
 * Log a debug message
 * @param {string} context - Context or component name
 * @param {...any} args - Arguments to log
 */
export function debug(context, ...args) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(`[DEBUG] [${context}]`, ...args);
  }
}

/**
 * Log an info message
 * @param {string} context - Context or component name
 * @param {...any} args - Arguments to log
 */
export function info(context, ...args) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(`[INFO] [${context}]`, ...args);
  }
}

/**
 * Log a warning message
 * @param {string} context - Context or component name
 * @param {...any} args - Arguments to log
 */
export function warning(context, ...args) {
  if (currentLevel <= LOG_LEVELS.WARNING) {
    console.warn(`[WARNING] [${context}]`, ...args);
  }
}

/**
 * Log an error message
 * @param {string} context - Context or component name
 * @param {...any} args - Arguments to log
 */
export function error(context, ...args) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(`[ERROR] [${context}]`, ...args);
  }
}

/**
 * Create a context-specific logger
 * @param {string} context - Context or component name
 * @returns {Object} Logger with bound context
 */
export function createLogger(context) {
  return {
    debug: (...args) => debug(context, ...args),
    info: (...args) => info(context, ...args),
    warning: (...args) => warning(context, ...args),
    error: (...args) => error(context, ...args),
  };
}

export default {
  setLogLevel,
  getLogLevel,
  debug,
  info,
  warning,
  error,
  createLogger,
};
