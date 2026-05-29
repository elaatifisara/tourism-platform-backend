-- Migration: Add authentication fields to users table
-- Purpose: Add email verification, 2FA recovery codes, password reset tokens

-- Add email verification fields
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) NULL AFTER email_verified;
ALTER TABLE users ADD COLUMN email_verification_token_expiry DATETIME NULL AFTER email_verification_token;

-- Add 2FA recovery codes (stored as JSON array)
ALTER TABLE users ADD COLUMN two_factor_recovery_codes JSON NULL AFTER two_factor_enabled;

-- Add password reset fields
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) NULL AFTER password_hash;
ALTER TABLE users ADD COLUMN password_reset_token_expiry DATETIME NULL AFTER password_reset_token;

-- Add 2FA SMS code storage (temporary)
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- Add authentication logs for security audit
CREATE TABLE IF NOT EXISTS auth_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  status ENUM('success', 'failure') DEFAULT 'failure',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);

-- Add login attempts tracking for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255),
  ip_address VARCHAR(45),
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_ip (email, ip_address),
  INDEX idx_attempt_time (attempt_time)
);
