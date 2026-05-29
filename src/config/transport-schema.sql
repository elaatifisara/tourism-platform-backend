-- Configuration tarifaire pour les types de véhicules
CREATE TABLE IF NOT EXISTS fare_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_type VARCHAR(50) NOT NULL UNIQUE COMMENT 'taxi, vtc, chauffeur',
  base_fare DECIMAL(10, 2) NOT NULL COMMENT 'Tarif de base en DH',
  price_per_km DECIMAL(10, 2) NOT NULL COMMENT 'Tarif par kilomètre en DH',
  price_per_minute DECIMAL(10, 2) NOT NULL COMMENT 'Tarif par minute en DH',
  min_fare DECIMAL(10, 2) NOT NULL COMMENT 'Tarif minimum en DH',
  luggage_surcharge DECIMAL(10, 2) DEFAULT 5 COMMENT 'Supplément par valise au-delà de 2',
  night_surcharge_percent INT DEFAULT 25 COMMENT 'Majoration nocturne en %',
  weekend_surcharge_percent INT DEFAULT 10 COMMENT 'Majoration weekend en %',
  seasonal_surcharge_percent INT DEFAULT 15 COMMENT 'Majoration saisonnière en %',
  max_distance_km INT DEFAULT 50 COMMENT 'Distance maximale de service',
  active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_vehicle_type (vehicle_type),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réservations de transport
CREATE TABLE IF NOT EXISTS transport_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT 'ID utilisateur',
  driver_id INT COMMENT 'ID du chauffeur assigné',
  vehicle_type VARCHAR(50) NOT NULL COMMENT 'taxi, vtc, chauffeur',
  pickup_address VARCHAR(255) NOT NULL COMMENT 'Adresse de départ',
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  destination_address VARCHAR(255) NOT NULL COMMENT 'Adresse de destination',
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  scheduled_time DATETIME NOT NULL COMMENT 'Heure de départ prévue',
  passengers INT DEFAULT 1,
  luggage INT DEFAULT 0 COMMENT 'Nombre de valises',
  distance_km DECIMAL(10, 2) COMMENT 'Distance réelle en km',
  estimated_duration INT COMMENT 'Durée estimée en minutes',
  actual_duration INT COMMENT 'Durée réelle en minutes',
  base_fare DECIMAL(10, 2) NOT NULL,
  distance_fare DECIMAL(10, 2) COMMENT 'Tarif distance',
  time_fare DECIMAL(10, 2) COMMENT 'Tarif temps',
  night_surcharge DECIMAL(10, 2) DEFAULT 0,
  weekend_surcharge DECIMAL(10, 2) DEFAULT 0,
  seasonal_surcharge DECIMAL(10, 2) DEFAULT 0,
  luggage_surcharge DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2) COMMENT 'TVA 20%',
  total_fare DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MAD' COMMENT 'Devise (Dirham marocain)',
  status ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  payment_id VARCHAR(100) COMMENT 'ID du paiement (Stripe, etc)',
  rating INT COMMENT 'Note 1-5 donnée par le client',
  review TEXT COMMENT 'Avis du client',
  booking_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de réservation',
  assigned_at DATETIME COMMENT 'Date d\'assignation du chauffeur',
  start_time DATETIME COMMENT 'Heure réelle du démarrage',
  end_time DATETIME COMMENT 'Heure réelle de fin',
  completed_at DATETIME COMMENT 'Date de completion',
  cancellation_reason VARCHAR(255),
  cancelled_at DATETIME,
  notes TEXT COMMENT 'Notes additionnelles du chauffeur/client',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_driver_id (driver_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_scheduled_time (scheduled_time),
  INDEX idx_booking_date (booking_date),
  INDEX idx_vehicle_type (vehicle_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des chauffeurs
CREATE TABLE IF NOT EXISTS drivers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  id_number VARCHAR(20) UNIQUE NOT NULL COMMENT 'Numéro ID/passeport',
  license_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Numéro de permis',
  license_expiry DATE NOT NULL COMMENT 'Date d\'expiration du permis',
  vehicle_type VARCHAR(50) NOT NULL COMMENT 'taxi, vtc, chauffeur',
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vehicle_brand VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_color VARCHAR(50),
  vehicle_registration_number VARCHAR(50),
  vehicle_registration_expiry DATE,
  insurance_company VARCHAR(100),
  insurance_expiry DATE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  rating DECIMAL(3, 2) DEFAULT 5 COMMENT 'Note moyenne 1-5',
  total_trips INT DEFAULT 0,
  completed_trips INT DEFAULT 0,
  cancelled_trips INT DEFAULT 0,
  status ENUM('available', 'busy', 'offline') DEFAULT 'offline',
  verified BOOLEAN DEFAULT 0 COMMENT 'Vérifié par admin',
  active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  background_check BOOLEAN DEFAULT 0,
  documents_verified BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_vehicle_type (vehicle_type),
  INDEX idx_status (status),
  INDEX idx_verified (verified),
  INDEX idx_active (active),
  INDEX idx_location (latitude, longitude),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historique des évaluations/avis
CREATE TABLE IF NOT EXISTS driver_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  driver_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL COMMENT 'Note 1-5',
  comment TEXT,
  cleanliness_rating INT COMMENT 'Propreté 1-5',
  safety_rating INT COMMENT 'Sécurité 1-5',
  communication_rating INT COMMENT 'Communication 1-5',
  would_book_again BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (booking_id) REFERENCES transport_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cache des trajets courants
CREATE TABLE IF NOT EXISTS route_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  origin_address VARCHAR(255) NOT NULL,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  destination_address VARCHAR(255) NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  distance_km DECIMAL(10, 2),
  duration_minutes INT,
  vehicle_type VARCHAR(50),
  average_fare DECIMAL(10, 2),
  last_used DATETIME,
  usage_count INT DEFAULT 1,
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_route (origin_address, destination_address),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promotions et codes
CREATE TABLE IF NOT EXISTS transport_promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type ENUM('percentage', 'fixed') COMMENT 'Pourcentage ou montant fixe',
  discount_value DECIMAL(10, 2),
  max_discount DECIMAL(10, 2) COMMENT 'Remise maximale',
  min_trip_fare DECIMAL(10, 2) COMMENT 'Montant minimum du trajet pour appliquer',
  vehicle_types VARCHAR(100) COMMENT 'Types de véhicules acceptés (comma-separated)',
  max_uses INT COMMENT 'Nombre d\'utilisations max du code',
  uses_count INT DEFAULT 0,
  per_user_limit INT DEFAULT 1 COMMENT 'Nombre de fois par utilisateur',
  valid_from DATE,
  valid_until DATE,
  active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_active (active),
  INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incidents/Réclamations
CREATE TABLE IF NOT EXISTS transport_incidents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  reporter_type ENUM('driver', 'customer') NOT NULL COMMENT 'Qui signale',
  description TEXT NOT NULL,
  severity ENUM('low', 'medium', 'high') DEFAULT 'low',
  status ENUM('open', 'in_progress', 'resolved', 'dismissed') DEFAULT 'open',
  evidence_url VARCHAR(500) COMMENT 'Photo/vidéo de preuve',
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (booking_id) REFERENCES transport_bookings(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertion de données de configuration tarifaire par défaut
INSERT INTO fare_config (vehicle_type, base_fare, price_per_km, price_per_minute, min_fare) VALUES
('taxi', 15, 10, 0.50, 30),
('vtc', 25, 12, 0.75, 50),
('chauffeur', 35, 14, 1.00, 70);
