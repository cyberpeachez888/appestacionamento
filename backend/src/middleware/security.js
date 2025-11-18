/**
 * Security Middleware
 * Middleware de segurança para proteger a aplicação
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Configuração do Helmet para headers de segurança HTTP
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Necessário para alguns frameworks
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        process.env.SUPABASE_URL || 'https://*.supabase.co',
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Pode causar problemas com alguns recursos
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny', // Previne clickjacking
  },
  noSniff: true, // Previne MIME type sniffing
  xssFilter: true, // Filtro XSS básico do navegador
});

/**
 * Rate limiter global para todas as rotas
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10),
  message: {
    error: 'Muitas requisições. Por favor, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting em health checks
    return req.path === '/api/health' || req.path === '/health';
  },
});

/**
 * Rate limiter agressivo para endpoints sensíveis
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 tentativas por hora
  message: {
    error: 'Muitas tentativas. Por favor, tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(
      `⚠️  Rate limit excedido - IP: ${req.ip}, Path: ${req.path}`
    );
    res.status(429).json({
      error: 'Muitas tentativas. Por favor, tente novamente em 1 hora.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 / 60) + ' minutos',
    });
  },
});

/**
 * Middleware para forçar HTTPS em produção
 */
export const forceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Verificar se já está em HTTPS (via proxy)
    const isHTTPS =
      req.secure ||
      req.header('x-forwarded-proto') === 'https' ||
      req.header('x-forwarded-ssl') === 'on';

    if (!isHTTPS) {
      const host = req.header('host') || req.hostname;
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }
  next();
};

/**
 * Middleware para mascarar dados sensíveis em logs
 */
export function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'secret',
    'api_key',
    'apikey',
    'authorization',
  ];

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

/**
 * Middleware para logar requisições com dados mascarados
 */
export const secureLogger = (req, res, next) => {
  // Log apenas em desenvolvimento ou se configurado
  if (process.env.LOG_REQUESTS === 'true' || process.env.NODE_ENV !== 'production') {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        body: maskSensitiveData(req.body),
        query: req.query,
      };
      
      if (res.statusCode >= 400) {
        console.error('❌ Request Error:', logData);
      } else if (process.env.VERBOSE_LOGGING === 'true') {
        console.log('📝 Request:', logData);
      }
    });
  }
  
  next();
};

/**
 * Middleware para validar origem em produção
 */
export const validateOrigin = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const origin = req.headers.origin;
    
    // Permitir requisições sem origin apenas de ferramentas como Postman
    // Em produção real, você pode querer bloquear isso também
    if (!origin) {
      // Permitir apenas em rotas específicas (ex: health check)
      if (req.path === '/api/health' || req.path === '/health') {
        return next();
      }
      // Para outras rotas, pode bloquear ou permitir conforme necessário
    }
  }
  
  next();
};

