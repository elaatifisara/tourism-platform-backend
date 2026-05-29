-- Table pour les réservations d'hôtels
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  hotel_id VARCHAR(50) NOT NULL COMMENT 'ID de l\'hôtel Amadeus',
  hotel_name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  rooms INT NOT NULL,
  adults INT NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR' COMMENT 'Code devise ISO 4217',
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  amadeus_booking_ref VARCHAR(100) UNIQUE COMMENT 'Référence de réservation Amadeus',
  payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  payment_id VARCHAR(100) COMMENT 'ID du paiement',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_check_in (check_in),
  INDEX idx_amadeus_ref (amadeus_booking_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour les offres d'hôtels en cache
CREATE TABLE IF NOT EXISTS hotel_offers_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cache_key VARCHAR(255) UNIQUE NOT NULL COMMENT 'Clé de cache: cityCode_checkIn_checkOut_adults_rooms',
  offer_data JSON NOT NULL COMMENT 'Données JSON des offres',
  expires_at TIMESTAMP NOT NULL COMMENT 'Date d\'expiration du cache',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_expires_at (expires_at),
  INDEX idx_cache_key (cache_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour les détails des chambres réservées
CREATE TABLE IF NOT EXISTS hotel_booking_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  room_type VARCHAR(100) NOT NULL COMMENT 'Type de chambre (Single, Double, Suite, etc)',
  rate_code VARCHAR(50),
  bed_type VARCHAR(50) COMMENT 'Type de lit (Twin, Double, etc)',
  meal_plan VARCHAR(100) COMMENT 'Plan de repas (BB, HB, FB, etc)',
  price_per_night DECIMAL(10, 2) NOT NULL,
  number_of_nights INT NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  
  FOREIGN KEY (booking_id) REFERENCES hotel_bookings(id) ON DELETE CASCADE,
  INDEX idx_booking_id (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour les commentaires et avis sur les hôtels
CREATE TABLE IF NOT EXISTS hotel_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  hotel_id VARCHAR(50) NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (booking_id) REFERENCES hotel_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hotel_id (hotel_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajout de colonnes à la table payments existante pour les hôtels
ALTER TABLE payments ADD COLUMN hotel_booking_id INT AFTER rental_id;
ALTER TABLE payments ADD FOREIGN KEY (hotel_booking_id) REFERENCES hotel_bookings(id) ON DELETE CASCADE;
