-- Migration: Amélioration du module Catalog
-- Purpose: Ajouter colonnes pour recherche avancée et photos

-- ========================================
-- PLACES TABLE IMPROVEMENTS
-- ========================================

-- Ajouter colonnes à la table places existante
ALTER TABLE places ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE places ADD COLUMN IF NOT EXISTS opening_hours JSON;
ALTER TABLE places ADD COLUMN IF NOT EXISTS accessibility BOOLEAN DEFAULT FALSE;
ALTER TABLE places ADD COLUMN IF NOT EXISTS amenities JSON;
ALTER TABLE places ADD COLUMN IF NOT EXISTS reservation_count INT DEFAULT 0;

-- Ajouter index pour optimiser recherches
ALTER TABLE places ADD INDEX idx_category_subcategory (category, subcategory);
ALTER TABLE places ADD INDEX idx_price (average_price);
ALTER TABLE places ADD INDEX idx_rating (rating);
ALTER TABLE places ADD INDEX idx_accessibility (accessibility);
ALTER TABLE places ADD INDEX idx_location_idx (latitude, longitude);
ALTER TABLE places ADD FULLTEXT INDEX ft_search (name, description);

-- ========================================
-- PLACE_PHOTOS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS place_photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  place_id INT NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  photo_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  INDEX idx_place_id (place_id),
  INDEX idx_order (photo_order)
);

-- ========================================
-- REVIEWS TABLE IMPROVEMENTS
-- ========================================

-- Ajouter colonnes si n'existe pas (pour Wilson score)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS unhelpful_count INT DEFAULT 0;

-- Index pour optimiser agrégations
ALTER TABLE reviews ADD INDEX idx_place_rating (place_id, rating);

-- ========================================
-- OPENING_HOURS EXEMPLE (pour documentation)
-- ========================================

-- Exemple de format JSON pour opening_hours:
-- {
--   "monday": {"open": "09:00", "close": "22:00"},
--   "tuesday": {"open": "09:00", "close": "22:00"},
--   "wednesday": {"open": "09:00", "close": "22:00"},
--   "thursday": {"open": "09:00", "close": "22:00"},
--   "friday": {"open": "09:00", "close": "23:00"},
--   "saturday": {"open": "10:00", "close": "23:00"},
--   "sunday": {"open": "10:00", "close": "22:00"},
--   "holidays": {"closed": true}
-- }

-- Exemple de format JSON pour amenities:
-- {
--   "wifi": true,
--   "parking": true,
--   "air_conditioning": true,
--   "wheelchair_accessible": true,
--   "pets_allowed": false,
--   "outdoor_seating": true,
--   "private_room": false
-- }
