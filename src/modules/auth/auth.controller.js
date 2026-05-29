/**
 * AUTH CONTROLLER - Authentification et sécurité
 * Responsabilités: Inscription, login, 2FA SMS, email verification, password reset
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
const { AuthModel } = require('./auth.service');
const TwoFactorAuth = require('../../utils/twoFactorAuth');
const EmailService = require('../../utils/emailService');
const User = require('../users/user.model');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class AuthController {
  /**
   * INSCRIPTION - Créer un nouvel utilisateur
   */
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Validation basique
      if (!email || !password || password.length < 8) {
        await AuthModel.recordAuthLog(
          null,
          'REGISTER_VALIDATION_FAILED',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Invalid email or password'
        );
        return res.status(400).json({
          error: 'Email et mot de passe (min 8 caractères) requis'
        });
      }

      // Vérifier email existe déjà
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        await AuthModel.recordAuthLog(
          null,
          'REGISTER_EMAIL_EXISTS',
          ipAddress,
          req.get('user-agent'),
          'failure',
          `Email already registered: ${email}`
        );
        return res.status(409).json({ error: 'Cet email existe déjà' });
      }

      // Hacher mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

      // Générer UUID pour vérification email
      const emailVerificationToken = uuidv4();
      const emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Créer utilisateur
      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationTokenExpiry,
        role: 'traveler'
      });

      // Envoyer email de vérification
      const emailResult = await EmailService.sendVerificationEmail(
        email,
        firstName,
        emailVerificationToken
      );

      await AuthModel.recordAuthLog(
        user.id,
        'REGISTER_SUCCESS',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      return res.status(201).json({
        message: 'Inscription réussie. Vérifiez votre email.',
        userId: user.id,
        email: user.email,
        emailSent: emailResult.success
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Erreur d\'inscription' });
    }
  }

  /**
   * VÉRIFICATION EMAIL - Valider token et marquer email comme vérifié
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!token) {
        return res.status(400).json({ error: 'Token requis' });
      }

      // Chercher utilisateur avec ce token
      const user = await User.findOne({
        where: { emailVerificationToken: token }
      });

      if (!user) {
        await AuthModel.recordAuthLog(
          null,
          'EMAIL_VERIFY_INVALID_TOKEN',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Invalid verification token'
        );
        return res.status(400).json({ error: 'Token invalide ou expiré' });
      }

      // Vérifier expiration
      if (new Date() > new Date(user.emailVerificationTokenExpiry)) {
        await AuthModel.recordAuthLog(
          user.id,
          'EMAIL_VERIFY_TOKEN_EXPIRED',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Verification token expired'
        );
        return res.status(400).json({ error: 'Token expiré. Veuillez demander un nouveau token.' });
      }

      // Marquer email comme vérifié
      await user.update({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null
      });

      await AuthModel.recordAuthLog(
        user.id,
        'EMAIL_VERIFY_SUCCESS',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      res.status(200).json({
        message: 'Email vérifié avec succès!',
        email: user.email
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'Erreur vérification email' });
    }
  }

  /**
   * CONNEXION - Authentifier utilisateur
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      // Enregistrer tentative
      await AuthModel.recordLoginAttempt(email, ipAddress);

      const user = await User.findOne({ where: { email } });
      if (!user) {
        await AuthModel.recordAuthLog(
          null,
          'LOGIN_USER_NOT_FOUND',
          ipAddress,
          req.get('user-agent'),
          'failure',
          `User not found: ${email}`
        );
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Vérifier mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        await AuthModel.recordAuthLog(
          user.id,
          'LOGIN_INVALID_PASSWORD',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Invalid password'
        );
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Si 2FA activée, envoyer code et retourner temp token
      if (user.twoFactorEnabled) {
        const otpCode = TwoFactorAuth.generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Sauvegarder code 2FA
        await AuthModel.saveTwoFactorCode(user.id, otpCode, expiresAt);

        // Envoyer SMS via Twilio
        try {
          await client.messages.create({
            body: `Votre code de vérification TravEasy: ${otpCode}. Valide 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone
          });
        } catch (smsError) {
          console.error('SMS send error:', smsError);
          await AuthModel.recordAuthLog(
            user.id,
            'LOGIN_SMS_FAILED',
            ipAddress,
            req.get('user-agent'),
            'failure',
            'Failed to send SMS'
          );
          return res.status(500).json({ error: 'Erreur envoi SMS' });
        }

        // Créer temp token valide 10 minutes
        const tempToken = jwt.sign(
          { userId: user.id, email: user.email, step: '2fa' },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );

        await AuthModel.recordAuthLog(
          user.id,
          'LOGIN_2FA_REQUIRED',
          ipAddress,
          req.get('user-agent'),
          'success'
        );

        return res.status(200).json({
          step: '2fa_required',
          message: 'Code SMS envoyé à votre téléphone',
          tempToken,
          maskedPhone: user.phone.replace(/(?<=.{2}).(?=.*@)/g, '*')
        });
      }

      // Générer JWT complet
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      await AuthModel.recordAuthLog(
        user.id,
        'LOGIN_SUCCESS',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      res.status(200).json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
    } catch (error) {
      console.error('❌ Login error:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      
      res.status(500).json({ 
        message: 'Erreur serveur lors de la connexion',
        error: process.env.NODE_ENV === 'development' 
               ? error.message 
               : 'Une erreur est survenue. Veuillez réessayer plus tard.',
        code: 'LOGIN_SERVER_ERROR'
      });
    }
  }

  /**
   * ENVOYER CODE 2FA - Envoyer code SMS (pour re-envoi)
   */
  static async send2FACode(req, res) {
    try {
      const userId = req.user?.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA non activé' });
      }

      // Générer nouveau code OTP
      const otpCode = TwoFactorAuth.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await AuthModel.saveTwoFactorCode(userId, otpCode, expiresAt);

      // Envoyer SMS
      try {
        await client.messages.create({
          body: `Votre code de vérification TravEasy: ${otpCode}. Valide 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone
        });
      } catch (smsError) {
        console.error('SMS send error:', smsError);
        await AuthModel.recordAuthLog(
          userId,
          'SEND_2FA_SMS_FAILED',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Failed to send SMS'
        );
        return res.status(500).json({ error: 'Erreur envoi SMS' });
      }

      await AuthModel.recordAuthLog(
        userId,
        'SEND_2FA_SUCCESS',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      res.status(200).json({
        message: 'Code envoyé avec succès'
      });
    } catch (error) {
      console.error('Send 2FA error:', error);
      res.status(500).json({ error: 'Erreur envoi code' });
    }
  }

  /**
   * 2FA - Vérifier code OTP ou code de récupération
   */
  static async verify2FA(req, res) {
    try {
      const { code, useRecoveryCode } = req.body;
      const tempToken = req.headers.authorization?.split(' ')[1];
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!code || !tempToken) {
        return res.status(400).json({ error: 'Code et token requis' });
      }

      // Vérifier temp token
      let decoded;
      try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Token expiré. Veuillez vous reconnecter.' });
      }

      if (decoded.step !== '2fa') {
        return res.status(401).json({ error: 'Token invalide' });
      }

      const userId = decoded.userId;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      let isValid = false;

      // Vérifier si c'est un code de récupération
      if (useRecoveryCode) {
        const validation = TwoFactorAuth.validateRecoveryCode(
          code,
          user.twoFactorRecoveryCodes || []
        );

        if (!validation.valid) {
          await AuthModel.recordAuthLog(
            userId,
            'VERIFY_2FA_RECOVERY_INVALID',
            ipAddress,
            req.get('user-agent'),
            'failure',
            validation.error
          );
          return res.status(400).json({ error: validation.error });
        }

        // Marquer code comme utilisé
        const updatedCodes = TwoFactorAuth.markRecoveryCodeAsUsed(
          user.twoFactorRecoveryCodes,
          code
        );

        await user.update({
          twoFactorRecoveryCodes: updatedCodes
        });

        isValid = true;
      } else {
        // Vérifier code OTP
        const result = await AuthModel.getTwoFactorCode(userId);

        if (!result.success || !result.data) {
          await AuthModel.recordAuthLog(
            userId,
            'VERIFY_2FA_OTP_NOT_FOUND',
            ipAddress,
            req.get('user-agent'),
            'failure',
            'OTP code not found'
          );
          return res.status(400).json({ error: 'Code expiré. Veuillez demander un nouveau code.' });
        }

        const twoFactorCode = result.data;

        // Vérifier expiration
        if (new Date() > new Date(twoFactorCode.expiresAt)) {
          await AuthModel.deleteTwoFactorCode(userId);
          await AuthModel.recordAuthLog(
            userId,
            'VERIFY_2FA_OTP_EXPIRED',
            ipAddress,
            req.get('user-agent'),
            'failure',
            'OTP expired'
          );
          return res.status(400).json({ error: 'Code expiré. Veuillez demander un nouveau code.' });
        }

        // Vérifier tentatives
        if (twoFactorCode.attempts >= 5) {
          await AuthModel.deleteTwoFactorCode(userId);
          await AuthModel.recordAuthLog(
            userId,
            'VERIFY_2FA_TOO_MANY_ATTEMPTS',
            ipAddress,
            req.get('user-agent'),
            'failure',
            'Too many failed attempts'
          );
          return res.status(400).json({
            error: 'Trop de tentatives échouées. Code annulé. Demandez un nouveau code.'
          });
        }

        // Vérifier le code
        const validation = TwoFactorAuth.validateOTP(
          code,
          twoFactorCode.code,
          twoFactorCode.expiresAt
        );

        if (!validation.valid) {
          await AuthModel.incrementTwoFactorAttempts(userId);
          await AuthModel.recordAuthLog(
            userId,
            'VERIFY_2FA_OTP_INVALID',
            ipAddress,
            req.get('user-agent'),
            'failure',
            validation.error
          );
          return res.status(400).json({ error: validation.error });
        }

        isValid = true;

        // Supprimer code après vérification réussie
        await AuthModel.deleteTwoFactorCode(userId);
      }

      if (isValid) {
        // Générer JWT complet
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        await AuthModel.recordAuthLog(
          userId,
          'VERIFY_2FA_SUCCESS',
          ipAddress,
          req.get('user-agent'),
          'success'
        );

        res.status(200).json({
          message: 'Authentification réussie',
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        });
      }
    } catch (error) {
      console.error('Verify 2FA error:', error);
      res.status(500).json({ error: 'Erreur vérification 2FA' });
    }
  }

  /**
   * ACTIVER 2FA - Activer authentification 2FA pour utilisateur
   */
  static async enable2FA(req, res) {
    try {
      const userId = req.user?.userId;
      const { phone } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      if (!phone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis' });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Générer codes de récupération
      const recoveryCodes = TwoFactorAuth.generateRecoveryCodes(10);

      // Générer code OTP pour confirmation
      const otpCode = TwoFactorAuth.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await AuthModel.saveTwoFactorCode(userId, otpCode, expiresAt);

      // Envoyer SMS de confirmation
      try {
        await client.messages.create({
          body: `Votre code de confirmation 2FA TravEasy: ${otpCode}. Valide 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
      } catch (smsError) {
        console.error('SMS send error:', smsError);
        return res.status(500).json({ error: 'Erreur envoi SMS' });
      }

      // Retourner les codes de récupération (utilisateur doit les sauvegarder avant confirmation)
      res.status(200).json({
        message: 'Code SMS envoyé pour confirmation',
        recoveryCodes: recoveryCodes.map(c => c.code),
        requiresConfirmation: true
      });
    } catch (error) {
      console.error('Enable 2FA error:', error);
      res.status(500).json({ error: 'Erreur activation 2FA' });
    }
  }

  /**
   * CONFIRMER 2FA - Confirmer activation 2FA après vérification du code
   */
  static async confirm2FA(req, res) {
    try {
      const userId = req.user?.userId;
      const { code, phone, recoveryCodes } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!userId || !code || !phone) {
        return res.status(400).json({
          error: 'Données complètes requises'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier le code OTP
      const result = await AuthModel.getTwoFactorCode(userId);

      if (!result.success || !result.data) {
        return res.status(400).json({ error: 'Code expiré' });
      }

      const twoFactorCode = result.data;

      const validation = TwoFactorAuth.validateOTP(
        code,
        twoFactorCode.code,
        twoFactorCode.expiresAt
      );

      if (!validation.valid) {
        await AuthModel.recordAuthLog(
          userId,
          'CONFIRM_2FA_FAILED',
          ipAddress,
          req.get('user-agent'),
          'failure',
          validation.error
        );
        return res.status(400).json({ error: validation.error });
      }

      // Activer 2FA
      await user.update({
        twoFactorEnabled: true,
        phone,
        twoFactorRecoveryCodes: recoveryCodes
      });

      await AuthModel.deleteTwoFactorCode(userId);

      // Envoyer email avec codes de récupération
      await EmailService.sendRecoveryCodesEmail(
        user.email,
        user.firstName,
        recoveryCodes
      );

      await AuthModel.recordAuthLog(
        userId,
        'ENABLE_2FA_SUCCESS',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      res.status(200).json({
        message: '2FA activé avec succès',
        emailSent: true
      });
    } catch (error) {
      console.error('Confirm 2FA error:', error);
      res.status(500).json({ error: 'Erreur confirmation 2FA' });
    }
  }

  /**
   * FORGOT PASSWORD - Demander réinitialisation mot de passe
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!email) {
        return res.status(400).json({ error: 'Email requis' });
      }

      const user = await User.findOne({ where: { email } });

      // Ne pas révéler si l'email existe ou non (sécurité)
      if (!user) {
        await AuthModel.recordAuthLog(
          null,
          'FORGOT_PASSWORD_USER_NOT_FOUND',
          ipAddress,
          req.get('user-agent'),
          'failure',
          `User not found: ${email}`
        );
        return res.status(200).json({
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé.'
        });
      }

      // Générer UUID pour reset password (usage unique)
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await user.update({
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry
      });

      // Envoyer email
      const emailResult = await EmailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken
      );

      await AuthModel.recordAuthLog(
        user.id,
        'FORGOT_PASSWORD_EMAIL_SENT',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      res.status(200).json({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
        emailSent: emailResult.success
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Erreur traitement demande' });
    }
  }

  /**
   * RESET PASSWORD - Réinitialiser mot de passe avec token
   */
  static async resetPassword(req, res) {
    try {
      const { token, password, passwordConfirm } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!token || !password || !passwordConfirm) {
        return res.status(400).json({
          error: 'Token et mots de passe requis'
        });
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({
          error: 'Les mots de passe ne correspondent pas'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }

      // Chercher utilisateur avec ce token
      const user = await User.findOne({
        where: { passwordResetToken: token }
      });

      if (!user) {
        await AuthModel.recordAuthLog(
          null,
          'RESET_PASSWORD_INVALID_TOKEN',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Invalid reset token'
        );
        return res.status(400).json({
          error: 'Token invalide ou expiré'
        });
      }

      // Vérifier expiration (1 heure)
      if (new Date() > new Date(user.passwordResetTokenExpiry)) {
        await AuthModel.recordAuthLog(
          user.id,
          'RESET_PASSWORD_TOKEN_EXPIRED',
          ipAddress,
          req.get('user-agent'),
          'failure',
          'Reset token expired'
        );
        return res.status(400).json({
          error: 'Lien expiré. Veuillez demander une nouvelle réinitialisation.'
        });
      }

      // Hacher nouveau mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

      // Mettre à jour et supprimer token
      await user.update({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null
      });

      await AuthModel.recordAuthLog(
        user.id,
        'RESET_PASSWORD_SUCCESS',
        ipAddress,
        req.get('user-agent'),
        'success'
      );

      res.status(200).json({
        message: 'Mot de passe réinitialisé avec succès!'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Erreur réinitialisation' });
    }
  }

  /**
   * LOGOUT - Déconnecter utilisateur
   */
  static async logout(req, res) {
    try {
      const userId = req.user?.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (userId) {
        await AuthModel.recordAuthLog(
          userId,
          'LOGOUT',
          ipAddress,
          req.get('user-agent'),
          'success'
        );
      }

      res.status(200).json({
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erreur déconnexion' });
    }
  }

  /**
   * REFRESH TOKEN - Renouveler le JWT
   */
  static async refreshToken(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token requis' });
      }

      // Vérifier token (même expiré)
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Générer nouveau token
      const newToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(200).json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Erreur renouvellement token' });
    }
  }
}

module.exports = AuthController;
