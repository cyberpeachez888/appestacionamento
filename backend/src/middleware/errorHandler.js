export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: err.details || []
    });
  }

  // Handle database errors
  if (err.code) {
    // PostgreSQL error codes
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Duplicate Entry',
        message: 'A record with this value already exists'
      });
    }
    if (err.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Invalid Reference',
        message: 'Referenced record does not exist'
      });
    }
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
};
