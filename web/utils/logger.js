// @ts-nocheck

/**
 * Structured logging utility for the application
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  log(level, message, data = null) {
    if (LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel]) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        context: this.context,
        message,
        ...(data && { data })
      };

      if (process.env.NODE_ENV === 'production') {
        // In production, use structured JSON logging
        console.log(JSON.stringify(logEntry));
      } else {
        // In development, use human-readable format
        console.log(`[${timestamp}] ${level} [${this.context}] ${message}`, data ? data : '');
      }
    }
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }
}

// Create logger instances for different contexts
export const appLogger = new Logger('App');
export const webhookLogger = new Logger('Webhook');
export const apiLogger = new Logger('API');
export const securityLogger = new Logger('Security');

// Error handling utilities
export const handleError = (error, context = 'Unknown', additionalData = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  appLogger.error(`Error in ${context}`, errorData);
  
  return {
    success: false,
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    timestamp: new Date().toISOString()
  };
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };

    if (res.statusCode >= 400) {
      apiLogger.warn('Request completed with error', logData);
    } else {
      apiLogger.info('Request completed', logData);
    }
  });

  next();
};

export default Logger;
