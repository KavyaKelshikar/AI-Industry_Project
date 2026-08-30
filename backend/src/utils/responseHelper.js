const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const defaultErrorCode = (statusCode) => {
  if (statusCode === 400) return 'BAD_REQUEST';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode >= 500) return 'INTERNAL_SERVER_ERROR';
  return 'REQUEST_ERROR';
};

const errorResponse = (res, message, statusCode = 400, code = null, details = null) => {
  const response = {
    success: false,
    error: {
      code: code || defaultErrorCode(statusCode),
      message,
    },
  };
  if (details) response.error.details = details;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, meta, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
    message,
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };
