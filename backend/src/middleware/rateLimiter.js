import rateLimit from 'express-rate-limit';

// Rate limiter for login attempts
// Limits to 5 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Muitas tentativas de login. Por favor, tente novamente em 15 minutos.',
    retryAfter: '15 minutos',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Muitas tentativas de login. Por favor, tente novamente em 15 minutos.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 / 60) + ' minutos',
    });
  },
});

// General API rate limiter
// Limits to 300 requests per 15 minutes per IP (increased for operational needs)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window (was 100)
  message: {
    error: 'Muitas requisições. Por favor, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive operations
// Limits to 3 attempts per hour per IP
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    error: 'Muitas tentativas. Por favor, tente novamente em 1 hora.',
    retryAfter: '1 hora',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Muitas tentativas. Por favor, tente novamente em 1 hora.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 / 60) + ' minutos',
    });
  },
});
