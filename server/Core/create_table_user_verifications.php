<?php
require 'config.php';
$conn = getDbConnection();

$sql = "CREATE TABLE IF NOT EXISTS user_verifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    verification_id VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(80) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if ($conn->query($sql) === TRUE) {
    echo "user_verifications table created or already exists.\n";
} else {
    echo "Error creating user_verifications table: " . $conn->error . "\n";
}
$conn->close();
?>