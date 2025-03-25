const logger = require('../utils/logger').logger;

function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error:', err);

  // Don't expose internal server errors to the client
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler }; 