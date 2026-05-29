/**
 * SCHÉMA SQL - Tables manquantes pour fonctionnalités complètes
 * À ajouter à la base de données existante
 */

-- ===============================================
-- AUTHENTIFICATION - 2FA SMS
-- ===============================================

CREATE TABLE IF NOT EXISTS two_factor_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_code (user_id, code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_expires (user_id, expires_at)
);

CREATE TABLE IF NOT EXISTS two_factor_setup_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_setup (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ajouter colonnes à la table users si n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_token_expiry DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME;

-- ===============================================
-- TRANSPORT - CALCUL TARIFAIRE
-- ===============================================

CREATE TABLE IF NOT EXISTS transport_fare_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_type VARCHAR(50) NOT NULL UNIQUE,
  base_fare DECIMAL(10, 2) NOT NULL,
  km_rate DECIMAL(10, 2) NOT NULL,
  hour_rate DECIMAL(10, 2) NOT NULL,
  night_surcharge DECIMAL(5, 2) DEFAULT 0.25 COMMENT 'Majoration 22h-6h',
  weekend_surcharge DECIMAL(5, 2) DEFAULT 0.10 COMMENT 'Majoration week-end',
  seasonal_surcharge DECIMAL(5, 2) DEFAULT 0.15 COMMENT 'Majoration juillet/août',
  luggage_fee DECIMAL(10, 2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vehicle_type (vehicle_type)
);

CREATE TABLE IF NOT EXISTS transport_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  pickup_time DATETIME NOT NULL,
  booking_date DATE NOT NULL,
  passengers INT DEFAULT 1,
  total_price DECIMAL(10, 2),
  status ENUM('confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'confirmed',
  special_requirements TEXT,
  payment_method VARCHAR(50),
  refund_amount DECIMAL(10, 2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_pickup (user_id, pickup_time),
  INDEX idx_status (status)
);

-- ===============================================
-- PAIEMENTS - CMI, Stripe, PayPal
-- ===============================================

CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  booking_id INT,
  booking_type VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MAD',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL COMMENT 'stripe, paypal, cmi',
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_transaction_id VARCHAR(255),
  cmi_order_id VARCHAR(255),
  cmi_transaction_id VARCHAR(255),
  paypal_order_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_payment_method (payment_method),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS refunds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id INT NOT NULL,
  user_id INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status)
);

-- ===============================================
-- NOTIFICATIONS - QUEUE ASYNC
-- ===============================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  event_type VARCHAR(100) NOT NULL COMMENT 'payment.confirmed, booking.reminder, etc',
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  notification_type VARCHAR(50) COMMENT 'email, sms, app',
  status VARCHAR(50) COMMENT 'sent, failed, pending',
  retry_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_event (user_id, event_type),
  INDEX idx_status (status)
);

-- ===============================================
-- SUPPORT - TICKETS ET FAQ
-- ===============================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  category VARCHAR(100),
  assigned_to INT COMMENT 'Admin user ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS support_replies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_admin_response BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket (ticket_id)
);

CREATE TABLE IF NOT EXISTS faq (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question VARCHAR(255) NOT NULL,
  answer LONGTEXT NOT NULL,
  category VARCHAR(100),
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category)
);

-- ===============================================
-- ADMIN - GESTION PLATEFORME
-- ===============================================

CREATE TABLE IF NOT EXISTS admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  old_value JSON,
  new_value JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_date (admin_id, created_at)
);

-- Insérer configurations tarifaires par défaut
INSERT INTO transport_fare_config (vehicle_type, base_fare, km_rate, hour_rate, night_surcharge, weekend_surcharge, seasonal_surcharge, luggage_fee) 
VALUES 
  ('taxi', 10.00, 6.50, 50.00, 0.25, 0.10, 0.15, 5.00),
  ('vtc', 15.00, 8.00, 60.00, 0.20, 0.10, 0.15, 0.00),
  ('rental_with_driver', 20.00, 7.00, 70.00, 0.15, 0.10, 0.15, 0.00),
  ('rental_without_driver', 0.00, 0.50, 100.00, 0.00, 0.10, 0.25, 0.00)
ON DUPLICATE KEY UPDATE id=id;
