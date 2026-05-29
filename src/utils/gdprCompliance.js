// GDPR Compliance Service
// Handles data deletion, data export, and privacy-related operations

const fs = require('fs');
const path = require('path');

class GDPRService {
  /**
   * Request data export for user (Right to data portability)
   * Returns all user data in portable format (JSON)
   */
  static async exportUserData(db, userId) {
    try {
      const userData = {};

      // Get basic user info
      const [user] = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = ?',
        [userId]
      );
      userData.profile = user;

      // Get user profile
      const [profile] = await db.query(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId]
      );
      userData.profile_details = profile || {};

      // Get bookings
      const bookings = await db.query(
        'SELECT * FROM bookings WHERE user_id = ?',
        [userId]
      );
      userData.bookings = bookings;

      // Get payments
      const payments = await db.query(
        'SELECT id, amount, currency, payment_method, status, created_at FROM payments WHERE user_id = ?',
        [userId]
      );
      userData.payments = payments;

      // Get reviews
      const reviews = await db.query(
        'SELECT * FROM reviews WHERE user_id = ?',
        [userId]
      );
      userData.reviews = reviews;

      // Get support tickets
      const tickets = await db.query(
        'SELECT * FROM support_tickets WHERE user_id = ?',
        [userId]
      );
      userData.support_tickets = tickets;

      // Get favorites
      const favorites = await db.query(
        'SELECT place_id FROM favorites WHERE user_id = ?',
        [userId]
      );
      userData.favorites = favorites;

      // Get notification preferences
      const [prefs] = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = ?',
        [userId]
      );
      userData.notification_preferences = prefs || {};

      return {
        success: true,
        data: userData,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete user account and all associated data (Right to be forgotten)
   * IMPORTANT: This operation is irreversible
   */
  static async deleteUserAccount(db, userId, reason = null) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Log the deletion request for audit purposes
      await connection.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          'ACCOUNT_DELETION',
          'user',
          userId,
          JSON.stringify({ reason: reason || 'User requested deletion' }),
        ]
      );

      // Delete user's bookings and related data
      const bookings = await connection.query(
        'SELECT id FROM bookings WHERE user_id = ?',
        [userId]
      );

      for (const booking of bookings) {
        // Delete payments associated with booking
        await connection.query(
          'DELETE FROM payments WHERE booking_id = ?',
          [booking.id]
        );

        // Delete invoices
        await connection.query(
          'DELETE FROM invoices WHERE payment_id IN (SELECT id FROM payments WHERE booking_id = ?)',
          [booking.id]
        );
      }

      // Delete main user data (cascading deletes will handle related data)
      await connection.query(
        'DELETE FROM bookings WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM reviews WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM favorites WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM user_profiles WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM support_tickets WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM notification_preferences WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM notifications WHERE user_id = ?',
        [userId]
      );

      // Anonymize user record (keep minimal info for audit)
      await connection.query(
        `UPDATE users 
         SET email = CONCAT('deleted_', id, '@deleted.local'),
             password_hash = '',
             first_name = 'DELETED',
             last_name = 'DELETED',
             phone = NULL,
             two_factor_enabled = FALSE
         WHERE id = ?`,
        [userId]
      );

      await connection.commit();

      return {
        success: true,
        message: 'User account has been permanently deleted',
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting user account:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Request deletion (creates deletion request that requires confirmation)
   */
  static async requestAccountDeletion(db, userId) {
    try {
      // In production, you would create a confirmation token and send email
      const confirmationToken = require('crypto')
        .randomBytes(32)
        .toString('hex');

      const expiryTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, new_values)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          'DELETION_REQUESTED',
          'user',
          JSON.stringify({
            token: confirmationToken,
            expiresAt: expiryTime,
          }),
        ]
      );

      return {
        success: true,
        message: 'Deletion request submitted. Check your email to confirm.',
        confirmationRequired: true,
        expiresAt: expiryTime,
      };
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's personal data for privacy audit
   */
  static async getUserPrivacyData(db, userId) {
    try {
      const personalData = await db.query(
        `SELECT 
          'email' as field, email as value FROM users WHERE id = ?
        UNION ALL
        SELECT 'phone', phone FROM users WHERE id = ?
        UNION ALL
        SELECT 'first_name', first_name FROM users WHERE id = ?
        UNION ALL
        SELECT 'last_name', last_name FROM users WHERE id = ?`,
        [userId, userId, userId, userId]
      );

      return {
        success: true,
        personalData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user privacy settings
   */
  static async updatePrivacySettings(db, userId, settings) {
    try {
      const {
        allowMarketingEmails = true,
        allowThirdPartySharing = false,
        dataRetention = '3years', // 3years, 1year, indefinite
      } = settings;

      // Store privacy settings
      await db.query(
        `UPDATE users SET 
          preferences = JSON_SET(
            COALESCE(preferences, '{}'),
            '$.privacy.marketing_emails', ?,
            '$.privacy.third_party_sharing', ?,
            '$.privacy.data_retention', ?
          )
         WHERE id = ?`,
        [allowMarketingEmails, allowThirdPartySharing, dataRetention, userId]
      );

      return {
        success: true,
        message: 'Privacy settings updated',
      };
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if user data retention period has expired
   */
  static async checkDataRetentionPolicy(db) {
    try {
      // Find users with expired retention periods
      const expiredUsers = await db.query(`
        SELECT id FROM users WHERE 
          DATE_ADD(updated_at, INTERVAL 3 YEAR) < NOW()
          AND JSON_EXTRACT(preferences, '$.privacy.data_retention') = '3years'
      `);

      // Auto-delete expired data (optional)
      for (const user of expiredUsers) {
        await this.deleteUserAccount(db, user.id, 'Data retention policy expired');
      }

      return {
        success: true,
        deletedUsers: expiredUsers.length,
      };
    } catch (error) {
      console.error('Error checking data retention policy:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log user consent (for audit trail)
   */
  static async logConsent(db, userId, consentType, agreed) {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, new_values)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          'CONSENT_LOGGED',
          'consent',
          JSON.stringify({
            type: consentType,
            agreed,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      return { success: true };
    } catch (error) {
      console.error('Error logging consent:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GDPRService;
