-- MBTV Kenya database schema
-- Created for admin users, staff, video assets, equipment, notifications, and reports

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS equipment_checkouts;
DROP TABLE IF EXISTS video_reports;
DROP TABLE IF EXISTS sms_notifications;
DROP TABLE IF EXISTS video_assets;
DROP TABLE IF EXISTS user_verifications;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS sms_settings;
DROP TABLE IF EXISTS video_categories;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_verifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    verification_id VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(80) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    otp VARCHAR(6) NOT NULL,
    otp_expires_at DATETIME NOT NULL,
    verified_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_verification_id (verification_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    status ENUM('active','inactive','suspended','deleted') NOT NULL DEFAULT 'active',
    last_login DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE video_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE video_assets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    category_id INT UNSIGNED DEFAULT NULL,
    duration_seconds INT UNSIGNED DEFAULT NULL,
    format VARCHAR(50) DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    storage_location VARCHAR(255) DEFAULT NULL,
    folder_path VARCHAR(500) DEFAULT NULL,
    shot_date DATE DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    status ENUM('draft','review','published','archived','deleted') NOT NULL DEFAULT 'draft',
    created_by INT UNSIGNED DEFAULT NULL,
    published_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_assets_categories FOREIGN KEY (category_id) REFERENCES video_categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_video_assets_created_by FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE equipment (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    manufacturer VARCHAR(150) DEFAULT NULL,
    model VARCHAR(150) DEFAULT NULL,
    serial_number VARCHAR(150) DEFAULT NULL,
    purchase_date DATE DEFAULT NULL,
    equipment_condition ENUM('new','good','fair','needs_repair','broken') NOT NULL DEFAULT 'good',
    status ENUM('available','checked_out','maintenance','retired') NOT NULL DEFAULT 'available',
    location VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE equipment_checkouts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED DEFAULT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('checked_out','returned','overdue','maintenance') NOT NULL DEFAULT 'checked_out',
    checkout_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME DEFAULT NULL,
    return_date DATETIME DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipment_checkouts_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_equipment_checkouts_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sms_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    sender_id VARCHAR(100) DEFAULT NULL,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sms_notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED DEFAULT NULL,
    phone_number VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending','sent','failed','delivered') NOT NULL DEFAULT 'pending',
    sent_at DATETIME DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sms_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE video_reports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_asset_id INT UNSIGNED DEFAULT NULL,
    user_id INT UNSIGNED DEFAULT NULL,
    report_type VARCHAR(100) NOT NULL,
    export_format VARCHAR(50) NOT NULL DEFAULT 'pdf',
    report_params JSON DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
    generated_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_reports_video_asset FOREIGN KEY (video_asset_id) REFERENCES video_assets(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_video_reports_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default seed data for roles
INSERT INTO roles (name, description) VALUES
('Chief IT', 'Full system access and user management'),
('Senior Editor', 'Content management and review'),
('Camera Man', 'Equipment usage and field tracking'),
('CEO', 'Executive oversight and reporting'),
('Production Manager', 'Media pipeline management'),
('Presenter', 'Program presentation and scheduling');
