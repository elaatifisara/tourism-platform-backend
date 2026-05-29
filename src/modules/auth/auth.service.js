/**
 * AUTH MODEL - Gestion des données d'authentification
 * Responsabilités: Stocker et récupérer les données d'auth (tokens, codes 2FA)
 */

const sequelize = require('../../config/database');
const { DataTypes } = require('sequelize');
const db = require('../../config/database');

/**
 * Model pour les codes 2FA temporaires
 */
const TwoFactorCode = sequelize.define(
  'TwoFactorCode',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'two_factor_codes',
    timestamps: true,
    updatedAt: false,
  }
);

/**
 * Model pour les logs d'authentification
 */
const AuthLog = sequelize.define(
  'AuthLog',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('success', 'failure'),
      defaultValue: 'failure',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'auth_logs',
    timestamps: true,
    updatedAt: false,
  }
);

/**
 * Model pour les tentatives de login
 */
const LoginAttempt = sequelize.define(
  'LoginAttempt',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
    },
  },
  {
    tableName: 'login_attempts',
    timestamps: true,
    updatedAt: false,
  }
);

/**
 * AUTH METHODS - Gestion des opérations d'authentification
 */
class AuthModel {
  /**
   * Sauvegarder temporairement un code 2FA
   */
  static async saveTwoFactorCode(userId, code, expiresAt) {
    try {
      // Supprimer les anciens codes non expirés
      await TwoFactorCode.destroy({
        where: { userId }
      });

      // Créer le nouveau code
      const result = await TwoFactorCode.create({
        userId,
        code,
        expiresAt
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error saving 2FA code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer le code 2FA d'un utilisateur
   */
  static async getTwoFactorCode(userId) {
    try {
      const record = await TwoFactorCode.findOne({
        where: { userId }
      });
      return { success: true, data: record };
    } catch (error) {
      console.error('Error getting 2FA code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Incrémenter les tentatives de vérification 2FA
   */
  static async incrementTwoFactorAttempts(userId) {
    try {
      const record = await TwoFactorCode.findOne({ where: { userId } });
      
      if (!record) {
        return { success: false, error: 'Code not found' };
      }

      await record.increment('attempts', { by: 1 });
      return { success: true, data: record };
    } catch (error) {
      console.error('Error incrementing 2FA attempts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprimer le code 2FA d'un utilisateur (après vérification réussie)
   */
  static async deleteTwoFactorCode(userId) {
    try {
      await TwoFactorCode.destroy({ where: { userId } });
      return { success: true };
    } catch (error) {
      console.error('Error deleting 2FA code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enregistrer une tentative de login
   */
  static async recordLoginAttempt(email, ipAddress) {
    try {
      await LoginAttempt.create({ email, ipAddress });
      return { success: true };
    } catch (error) {
      console.error('Error recording login attempt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Compter les tentatives de login dans la dernière période
   */
  static async countRecentLoginAttempts(email, ipAddress, minutes = 15) {
    try {
      const timeLimit = new Date(Date.now() - minutes * 60 * 1000);
      
      const count = await LoginAttempt.count({
        where: {
          [sequelize.Sequelize.Op.or]: [
            { email, createdAt: { [sequelize.Sequelize.Op.gte]: timeLimit } },
            { ipAddress, createdAt: { [sequelize.Sequelize.Op.gte]: timeLimit } }
          ]
        }
      });

      return { success: true, count };
    } catch (error) {
      console.error('Error counting login attempts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enregistrer un événement d'authentification
   */
  static async recordAuthLog(userId, action, ipAddress, userAgent, status, errorMessage = null) {
    try {
      await AuthLog.create({
        userId,
        action,
        ipAddress,
        userAgent,
        status,
        errorMessage
      });
      return { success: true };
    } catch (error) {
      console.error('Error recording auth log:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les logs récents d'un utilisateur
   */
  static async getUserAuthLogs(userId, limit = 10) {
    try {
      const logs = await AuthLog.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit
      });
      return { success: true, data: logs };
    } catch (error) {
      console.error('Error getting auth logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Nettoyer les codes expirés
   */
  static async cleanupExpiredCodes() {
    try {
      const result = await TwoFactorCode.destroy({
        where: {
          expiresAt: { [sequelize.Sequelize.Op.lt]: new Date() }
        }
      });
      console.log(`Cleaned up ${result} expired 2FA codes`);
      return { success: true, deletedCount: result };
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Nettoyer les tentatives de login anciennes
   */
  static async cleanupOldLoginAttempts(daysOld = 7) {
    try {
      const timeLimit = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await LoginAttempt.destroy({
        where: {
          createdAt: { [sequelize.Sequelize.Op.lt]: timeLimit }
        }
      });

      console.log(`Cleaned up ${result} old login attempts`);
      return { success: true, deletedCount: result };
    } catch (error) {
      console.error('Error cleaning up old login attempts:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  TwoFactorCode,
  AuthLog,
  LoginAttempt,
  AuthModel
};
