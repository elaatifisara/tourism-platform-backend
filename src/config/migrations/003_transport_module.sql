-- Migration: 003_transport_module.sql
-- Tables: fare_config, transport_bookings, drivers

CREATE TABLE IF NOT EXISTS fare_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_type VARCHAR(50) NOT NULL UNIQUE,
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
  per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
  baggage_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  vehicle_type VARCHAR(50),
  available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  driver_id INT DEFAULT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  origin_address VARCHAR(500),
  origin_lat DECIMAL(10,7),
  origin_lng DECIMAL(10,7),
  dest_address VARCHAR(500),
  dest_lat DECIMAL(10,7),
  dest_lng DECIMAL(10,7),
  distance_meters INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  fare_amount DECIMAL(10,2) DEFAULT 0,
  fare_breakdown JSON,
  status VARCHAR(50) DEFAULT 'confirmed',
  cancelled_at TIMESTAMP NULL,
  cancelled_reason VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Seed default fare configs
INSERT IGNORE INTO fare_config (vehicle_type, base_fare, per_km, baggage_fee)
VALUES
('taxi', 20.00, 4.00, 10.00),
('vtc', 30.00, 5.50, 15.00),
('chauffeur', 50.00, 8.00, 20.00);
