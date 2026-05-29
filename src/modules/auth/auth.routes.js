const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  twoFactorLimiter,
  sendSMSLimiter,
  verifyEmailLimiter
} = require('../../middleware/rateLimiting');
const { verifyToken } = require('../../middleware/auth');

/**
 * PUBLIC ROUTES - Sans authentification
 */

// Inscription avec rate limiting (max 3 par heure)
router.post('/register', registerLimiter, AuthController.register);

// Connexion avec rate limiting (max 5 tentatives par 15 min)
router.post('/login', loginLimiter, AuthController.login);

// Vérifier email (GET avec token en paramètre)
router.get('/verify-email/:token', verifyEmailLimiter, AuthController.verifyEmail);

// Demander réinitialisation mot de passe avec rate limiting (max 3 par heure)
router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);

// Réinitialiser mot de passe
router.post('/reset-password/:token', AuthController.resetPassword);

/**
 * 2FA ROUTES - Authentication à deux facteurs
 */

// Envoyer code 2FA (après login réussi)
// Utilise temp token (step: '2fa') en Authorization header
router.post('/2fa/verify', twoFactorLimiter, AuthController.verify2FA);

/**
 * PROTECTED ROUTES - Avec authentification
 */

// Activer 2FA pour l'utilisateur connecté
router.post('/2fa/enable', verifyToken, AuthController.enable2FA);

// Confirmer activation 2FA
router.post('/2fa/confirm', verifyToken, AuthController.confirm2FA);

// Renvoyer code 2FA
router.post('/2fa/send', verifyToken, sendSMSLimiter, AuthController.send2FACode);

// Déconnexion
router.post('/logout', verifyToken, AuthController.logout);

// Renouveler token JWT
router.post('/refresh', AuthController.refreshToken);

module.exports = router;
