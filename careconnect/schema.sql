-- CareConnect NGO Donation Management System
-- Import this file in MySQL Workbench or XAMPP phpMyAdmin

CREATE DATABASE IF NOT EXISTS careconnect;
USE careconnect;

-- Admin users
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predefined admins (passwords: admin123 / admin456)
INSERT INTO admins (username, email, password) VALUES
('admin1', 'admin@careconnect.org',  '$2a$10$HuQZW9la6fXwM/MtKmy/r.iN1o5GfVVkMZz2J0M.Kxp4I97MNVT/K'),
('admin2', 'admin2@careconnect.org', '$2a$10$kaY0m0PKvv3mYDNW4s/aqe25/6pxm0vZ.IOb4ZhP5eqe2wLUvbhLm');

-- NGOs
CREATE TABLE ngos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  description TEXT,
  phone VARCHAR(20),
  website VARCHAR(255),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  totalDonations DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preloaded NGOs (password: ngo123)
INSERT INTO ngos (name, email, password, description, status, totalDonations) VALUES
('Helping Hands',  'help@ngo.com',  '$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG', 'Empowering children through quality education and nutritional support.', 'approved', 18500.00),
('Green Earth',    'green@ngo.com', '$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG', 'Environmental conservation and clean energy awareness programs.',        'pending',  0.00),
('Clean Waters',   'clean@ngo.com', '$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG', 'Providing clean drinking water to rural communities.',                    'approved', 9200.00),
('Hope Foundation','hope@ngo.com',  '$2b$10$EOdYplQ63eyAbRyo6m9p4ezRXu4bqE3Q2ZvLDg.Z5RcOAoQkpQ4zG', 'Healthcare access and medical support for underprivileged families.',     'pending',  0.00);

-- NGO Requirements / Funding Needs
CREATE TABLE requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ngo_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('active','completed','cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE
);

INSERT INTO requirements (ngo_id, title, description, goal_amount, current_amount) VALUES
(1, 'Food Supplies',       'Monthly groceries for 50 children in our care.',       30000.00, 18000.00),
(1, 'Education Materials', 'Books, stationery and uniforms for 100 students.',      15000.00,  9500.00),
(1, 'Medical Equipment',   'First-aid kits and basic diagnostics for health camp.', 25000.00,     0.00),
(3, 'Water Purifiers',     '10 RO purifiers for 10 villages in Rajasthan.',         50000.00, 22000.00),
(3, 'Pipeline Repair',     'Repair damaged water pipelines in 3 districts.',        40000.00,  5000.00);

-- Donations
CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ngo_id INT NOT NULL,
  requirement_id INT DEFAULT NULL,
  donor_name VARCHAR(255) NOT NULL,
  donor_email VARCHAR(255) NOT NULL,
  donor_phone VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ngo_id) REFERENCES ngos(id),
  FOREIGN KEY (requirement_id) REFERENCES requirements(id)
);

-- Sample donations
INSERT INTO donations (ngo_id, requirement_id, donor_name, donor_email, amount, status, razorpay_payment_id) VALUES
(1, 1, 'Rahul Sharma',  'rahul@example.com',  2000.00, 'completed', 'pay_test_001'),
(1, 2, 'Priya Agarwal', 'priya@example.com',  5000.00, 'completed', 'pay_test_002'),
(3, 4, 'Arjun Kumar',   'arjun@example.com',  1500.00, 'completed', 'pay_test_003'),
(3, NULL,'Sneha Mehta', 'sneha@example.com',  8000.00, 'completed', 'pay_test_004'),
(1, NULL,'Vikram Rao',  'vikram@example.com', 2500.00, 'completed', 'pay_test_005');

-- Trigger: auto-update requirement current_amount on new donation
DELIMITER $$
CREATE TRIGGER after_donation_insert
AFTER INSERT ON donations
FOR EACH ROW
BEGIN
  IF NEW.requirement_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE requirements SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.requirement_id;
  END IF;
  IF NEW.status = 'completed' THEN
    UPDATE ngos SET totalDonations = totalDonations + NEW.amount
    WHERE id = NEW.ngo_id;
  END IF;
END$$
DELIMITER ;


