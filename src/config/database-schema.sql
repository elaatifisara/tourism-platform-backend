-- Comprehensive Tourism Platform Database Schema
-- Based on PROJECT_REQUIREMENTS.md specifications

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('traveler', 'provider', 'admin') DEFAULT 'traveler',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- User Profiles
CREATE TABLE user_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  bio TEXT,
  profile_image_url VARCHAR(500),
  travel_preferences JSON,
  interests JSON,
  travel_history JSON,
  preferred_language ENUM('en', 'fr') DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Places/Catalog
CREATE TABLE places (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address VARCHAR(500),
  average_price DECIMAL(10, 2),
  opening_hour INT,
  closing_hour INT,
  accessibility BOOLEAN DEFAULT FALSE,
  phone VARCHAR(20),
  website VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_location (latitude, longitude),
  FULLTEXT INDEX ft_search (name, description)
);

-- Place Media (Photos/Images)
CREATE TABLE place_media (
  id INT PRIMARY KEY AUTO_INCREMENT,
  place_id INT NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  media_type ENUM('image', 'video') DEFAULT 'image',
  alt_text VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  INDEX idx_place_id (place_id)
);

-- Reviews and Ratings
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  place_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_place_id (place_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rating (rating)
);

-- Favorites
CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  place_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, place_id),
  INDEX idx_user_id (user_id)
);

-- Transport Pricing
CREATE TABLE transport_pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_type ENUM('classic', 'vtc', 'rental') NOT NULL,
  base_rate DECIMAL(10, 2) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  rate_per_km DECIMAL(10, 2) NOT NULL,
  night_surcharge_percent INT DEFAULT 25,
  weekend_surcharge_percent INT DEFAULT 10,
  seasonal_surcharge_percent INT DEFAULT 15,
  luggage_fee_per_item DECIMAL(10, 2) DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transport Bookings
CREATE TABLE transport_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  vehicle_type ENUM('classic', 'vtc', 'rental'),
  pickup_location VARCHAR(500),
  dropoff_location VARCHAR(500),
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  estimated_distance DECIMAL(10, 2),
  estimated_duration INT,
  estimated_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  driver_id INT,
  driver_phone VARCHAR(20),
  driver_location_lat DECIMAL(10, 8),
  driver_location_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_date (pickup_date)
);

-- Rental Bookings
CREATE TABLE rental_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INT,
  total_price DECIMAL(10, 2),
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_dates (check_in_date, check_out_date)
);

-- Bookings (General)
CREATE TABLE bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  booking_type ENUM('transport', 'rental', 'activity') NOT NULL,
  booking_reference_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (booking_type)
);

-- Payments
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method ENUM('stripe', 'paypal', 'cmi') NOT NULL,
  gateway_transaction_id VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  refund_status ENUM('none', 'requested', 'processing', 'completed') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_booking_id (booking_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Invoices
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id INT NOT NULL UNIQUE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2),
  total DECIMAL(10, 2),
  pdf_path VARCHAR(500),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_invoice_number (invoice_number)
);

-- Notifications
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('email', 'sms') NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
  subject VARCHAR(255),
  content TEXT NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  booking_confirmation_email BOOLEAN DEFAULT TRUE,
  booking_confirmation_sms BOOLEAN DEFAULT TRUE,
  travel_reminders_email BOOLEAN DEFAULT TRUE,
  travel_reminders_sms BOOLEAN DEFAULT FALSE,
  promotions_email BOOLEAN DEFAULT TRUE,
  promotions_sms BOOLEAN DEFAULT FALSE,
  service_updates_email BOOLEAN DEFAULT TRUE,
  service_updates_sms BOOLEAN DEFAULT TRUE,
  review_requests_email BOOLEAN DEFAULT TRUE,
  newsletter BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Support Tickets
CREATE TABLE support_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  assigned_to INT,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
);

-- FAQ/Knowledge Base
CREATE TABLE faq (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT INDEX ft_search (question, answer)
);

-- Audit Logs (for security and GDPR compliance)
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Ensure database has proper character set
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create indexes for better performance
CREATE INDEX idx_places_search ON places (category, subcategory);
CREATE INDEX idx_bookings_user_status ON bookings (user_id, status);
CREATE INDEX idx_payments_user_status ON payments (user_id, status);
CREATE INDEX idx_notifications_user_status ON notifications (user_id, status);
