const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'csms' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length 
            ? `\n${JSON.stringify(meta, null, 2)}` 
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || path.join(logsDir, 'csms.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for error logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Create a separate logger for OCPP messages
const ocppLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ocpp' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'ocpp.log'),
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true
    })
  ]
});

module.exports = {
  logger,
  ocppLogger
}; 