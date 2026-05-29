/**
 * RATE LIMITING MIDDLEWARE - Protection contre les attaques par force brute
 * Responsabilités: Limiter les tentatives de login et autres endpoints sensibles
 */

const rateLimit = require('express-rate-limit');

/**
 * Limiter pour login: Max 5 tentatives par IP / 15 minutes
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Don't rate limit admin users
    return req.user?.role === 'admin';
  }
});

/**
 * Limiter pour registration: Max 3 créations par IP / 1 heure
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: 'Trop de créations de compte. Veuillez réessayer dans une heure.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limiter pour forgot password: Max 3 demandes par IP / 1 heure
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: 'Trop de demandes de réinitialisation. Veuillez réessayer dans une heure.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Use email as key if provided, otherwise use IP
    return req.body.email || req.ip;
  }
});

/**
 * Limiter pour 2FA: Max 10 tentatives par utilisateur / 10 minutes
 */
const twoFactorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit each user to 10 attempts per windowMs
  message: 'Trop de tentatives de vérification 2FA. Veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Use userId from JWT token or IP
    return req.user?.userId || req.ip;
  }
});

/**
 * Limiter pour send 2FA SMS: Max 3 envois par utilisateur / 5 minutes
 */
const sendSMSLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each user to 3 SMS per 5 minutes
  message: 'Trop de demandes d\'envoi SMS. Veuillez réessayer dans 5 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.user?.userId || req.ip;
  }
});

/**
 * Limiter pour verify email: Max 20 tentatives par IP / 1 heure
 */
const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Trop de tentatives. Veuillez réessayer dans une heure.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limiter strict pour endpoints critiques: Max 10 par IP / 1 heure
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Trop de requêtes. Veuillez réessayer dans une heure.',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  twoFactorLimiter,
  sendSMSLimiter,
  verifyEmailLimiter,
  strictLimiter
};
