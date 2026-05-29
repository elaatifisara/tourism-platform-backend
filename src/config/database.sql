CREATE DATABASE IF NOT EXISTS tourism_platform;
USE tourism_platform;
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  phoneNumber VARCHAR(20),
  role ENUM('traveler', 'provider', 'admin') DEFAULT 'traveler',
  preferredLanguage VARCHAR(5) DEFAULT 'en',
  emailNotifications BOOLEAN DEFAULT true,
  smsNotifications BOOLEAN DEFAULT false,
  isDeleted BOOLEAN DEFAULT false,
  deletedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE places (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  subCategory VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price DECIMAL(10, 2),
  operatingHours VARCHAR(255),
  image_url VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE transport_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  pickupLocation VARCHAR(255),
  dropoffLocation VARCHAR(255),
  pickupTime DATETIME,
  vehicleType VARCHAR(50),
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  estimatedPrice DECIMAL(10, 2),
  finalPrice DECIMAL(10, 2),
  driverId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  bookingId INT,
  amount DECIMAL(10, 2) NOT NULL,
  paymentMethod ENUM('stripe', 'paypal', 'cmi') NOT NULL,
  transactionId VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (bookingId) REFERENCES transport_bookings(id)
);
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  placeId INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  content TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (placeId) REFERENCES places(id)
);
CREATE TABLE support_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  subject VARCHAR(255),
  description TEXT,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('open', 'in-progress', 'resolved', 'closed') DEFAULT 'open',
  assignedTo INT,
  resolutionNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type ENUM('email', 'sms', 'in-app') DEFAULT 'email',
  title VARCHAR(255),
  message TEXT,
  status ENUM('sent', 'read', 'failed', 'bounced') DEFAULT 'sent',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  placeId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (placeId) REFERENCES places(id),
  UNIQUE KEY unique_favorite (userId, placeId)
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bookings_userId ON transport_bookings(userId);
CREATE INDEX idx_bookings_status ON transport_bookings(status);
CREATE INDEX idx_payments_userId ON payments(userId);
CREATE INDEX idx_reviews_placeId ON reviews(placeId);
CREATE INDEX idx_tickets_userId ON support_tickets(userId);
CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_places_category ON places(category);
