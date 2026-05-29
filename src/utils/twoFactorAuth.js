/**
 * 2FA UTILITY - Gestion des codes OTP et recovery codes
 * Responsabilités: Générer OTP, valider codes, créer recovery codes
 */

const crypto = require('crypto');

class TwoFactorAuth {
  /**
   * Générer un code OTP à 6 chiffres
   */
  static generateOTP() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Générer 10 codes de récupération uniques (8 caractères alphanumérique)
   */
  static generateRecoveryCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto
        .randomBytes(6)
        .toString('hex')
        .toUpperCase()
        .slice(0, 8);
      codes.push({
        code,
        used: false,
        usedAt: null
      });
    }
    return codes;
  }

  /**
   * Valider un code OTP
   * @param {string} providedCode - Code fourni par l'utilisateur
   * @param {string} storedCode - Code stocké en base de données
   * @param {Date} expiryTime - Date d'expiration du code
   */
  static validateOTP(providedCode, storedCode, expiryTime) {
    // Vérifier format (6 chiffres)
    if (!/^\d{6}$/.test(providedCode)) {
      return {
        valid: false,
        error: 'Code invalide (doit être 6 chiffres)'
      };
    }

    // Vérifier expiration
    if (new Date() > new Date(expiryTime)) {
      return {
        valid: false,
        error: 'Code expiré'
      };
    }

    // Vérifier correspondance
    if (providedCode !== storedCode) {
      return {
        valid: false,
        error: 'Code incorrect'
      };
    }

    return { valid: true };
  }

  /**
   * Valider et utiliser un code de récupération
   * @param {string} providedCode - Code fourni par l'utilisateur
   * @param {Array} recoveryCodes - Array des codes de récupération
   */
  static validateRecoveryCode(providedCode, recoveryCodes) {
    if (!Array.isArray(recoveryCodes)) {
      return {
        valid: false,
        error: 'Codes de récupération invalides'
      };
    }

    const codeEntry = recoveryCodes.find(
      (entry) => entry.code === providedCode.toUpperCase()
    );

    if (!codeEntry) {
      return {
        valid: false,
        error: 'Code de récupération invalide'
      };
    }

    if (codeEntry.used) {
      return {
        valid: false,
        error: 'Code de récupération déjà utilisé'
      };
    }

    return { valid: true, code: codeEntry };
  }

  /**
   * Marquer un code de récupération comme utilisé
   */
  static markRecoveryCodeAsUsed(recoveryCodes, codeToUse) {
    return recoveryCodes.map((entry) => {
      if (entry.code === codeToUse.toUpperCase()) {
        return {
          ...entry,
          used: true,
          usedAt: new Date()
        };
      }
      return entry;
    });
  }

  /**
   * Vérifier si tous les codes de récupération sont utilisés
   */
  static allRecoveryCodesUsed(recoveryCodes) {
    if (!Array.isArray(recoveryCodes) || recoveryCodes.length === 0) {
      return false;
    }
    return recoveryCodes.every((code) => code.used === true);
  }

  /**
   * Compter les codes de récupération restants
   */
  static countRemainingRecoveryCodes(recoveryCodes) {
    if (!Array.isArray(recoveryCodes)) {
      return 0;
    }
    return recoveryCodes.filter((code) => !code.used).length;
  }
}

module.exports = TwoFactorAuth;
