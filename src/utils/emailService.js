/**
 * EMAIL SERVICE - Envoi des emails de vérification et reset password
 * Responsabilités: Vérification email, reset password emails
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  /**
   * Envoyer email de vérification
   */
  async sendVerificationEmail(email, firstName, token) {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: 'Vérifiez votre adresse email - TravEasy',
        html: this.getVerificationEmailTemplate(firstName, verificationLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', result.messageId);
      
      return {
        success: true,
        message: 'Email de vérification envoyé',
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email de vérification',
        error: error.message
      };
    }
  }

  /**
   * Envoyer email de réinitialisation mot de passe
   */
  async sendPasswordResetEmail(email, firstName, token) {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: 'Réinitialiser votre mot de passe - TravEasy',
        html: this.getPasswordResetEmailTemplate(firstName, resetLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      
      return {
        success: true,
        message: 'Email de réinitialisation envoyé',
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
        error: error.message
      };
    }
  }

  /**
   * Envoyer email avec codes de récupération 2FA
   */
  async sendRecoveryCodesEmail(email, firstName, codes) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: 'Codes de récupération 2FA - TravEasy',
        html: this.getRecoveryCodesEmailTemplate(firstName, codes)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Recovery codes email sent:', result.messageId);
      
      return {
        success: true,
        message: 'Codes de récupération envoyés',
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Error sending recovery codes email:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'envoi des codes de récupération',
        error: error.message
      };
    }
  }

  /**
   * Template HTML pour email de vérification
   */
  getVerificationEmailTemplate(firstName, verificationLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          .code { background-color: #f0f0f0; padding: 10px; border-radius: 3px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Bienvenue sur TravEasy!</h2>
          </div>
          <div class="content">
            <p>Bonjour ${firstName},</p>
            <p>Merci de vous être inscrit sur TravEasy. Pour finaliser votre inscription, veuillez vérifier votre adresse email en cliquant sur le lien ci-dessous.</p>
            <p>Ce lien expire dans 24 heures.</p>
            <a href="${verificationLink}" class="button">Vérifier mon email</a>
            <p>Ou copez ce lien dans votre navigateur:</p>
            <div class="code">${verificationLink}</div>
            <p>Si vous n'avez pas créé ce compte, ignorez cet email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TravEasy. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template HTML pour email de réinitialisation mot de passe
   */
  getPasswordResetEmailTemplate(firstName, resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          .code { background-color: #f0f0f0; padding: 10px; border-radius: 3px; font-family: monospace; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 3px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Réinitialiser votre mot de passe</h2>
          </div>
          <div class="content">
            <p>Bonjour ${firstName},</p>
            <p>Vous avez demandé une réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour continuer.</p>
            <p>Ce lien expire dans 1 heure.</p>
            <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            <p>Ou copez ce lien dans votre navigateur:</p>
            <div class="code">${resetLink}</div>
            <div class="warning">
              <strong>⚠️ Attention:</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre compte reste sécurisé.
            </div>
            <p>Besoin d'aide? Contactez notre support: support@travelasy.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TravEasy. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template HTML pour codes de récupération 2FA
   */
  getRecoveryCodesEmailTemplate(firstName, codes) {
    const codesHtml = codes
      .map((code) => `<div class="code-item">${code.code}</div>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          .codes { background-color: #f0f0f0; padding: 15px; border-radius: 3px; margin-top: 20px; }
          .code-item { font-family: monospace; padding: 8px; margin: 5px 0; background-color: white; border: 1px solid #ddd; border-radius: 3px; }
          .warning { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px; border-radius: 3px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Codes de Récupération 2FA</h2>
          </div>
          <div class="content">
            <p>Bonjour ${firstName},</p>
            <p>Vous avez activé l'authentification à deux facteurs (2FA) pour votre compte TravEasy.</p>
            <p>Voici vos 10 codes de récupération. Chaque code ne peut être utilisé qu'une seule fois.</p>
            
            <div class="codes">
              ${codesHtml}
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>Conservez ces codes dans un endroit sûr</li>
                <li>Chaque code ne peut être utilisé qu'une fois</li>
                <li>Utilisez un code si vous perdez accès à votre téléphone</li>
                <li>Ne partagez jamais ces codes avec personne</li>
              </ul>
            </div>

            <p>Si vous n'avez pas activé 2FA, contactez immédiatement notre support.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TravEasy. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
