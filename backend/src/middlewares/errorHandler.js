const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseHelper');

const errorHandler = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new AppError(statusCode, message, false);
  }

  const { statusCode, message, code } = error;
  
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    logger.error(`[UNEXPECTED ERROR] ${err}`);
    return errorResponse(res, 'Internal Server Error', 500, 'INTERNAL_SERVER_ERROR');
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('DEBUG HANDLER ERROR:', err);
    logger.error(err.message || err);
  }

  const details = error.isOperational || process.env.NODE_ENV !== 'development'
    ? null
    : { stack: err.stack };

  return errorResponse(res, message, statusCode, code, details);
};

module.exports = errorHandler;
