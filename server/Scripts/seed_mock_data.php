<?php
include_once __DIR__ . '/../Core/Config.php';

$conn = getDbConnection();

// Clear existing test data if needed (optional, but good for clean state)
echo "Seeding mock data for MBTV Kenya...\n";

// 1. Ensure we have some roles and users (Chief IT at least)
$checkRole = $conn->query("SELECT id FROM roles WHERE name = 'Chief IT'");
if ($checkRole->num_rows === 0) {
    $conn->query("INSERT INTO roles (name, description) VALUES ('Chief IT', 'Full system access')");
}
$roleId = $conn->query("SELECT id FROM roles WHERE name = 'Chief IT'")->fetch_assoc()['id'];

$password = password_hash('admin123', PASSWORD_DEFAULT);
$conn->query("INSERT IGNORE INTO users (role_id, username, email, password_hash, full_name, status) 
              VALUES ($roleId, 'admin', 'admin@mbtv.co.ke', '$password', 'System Admin', 'active')");
$userId = $conn->query("SELECT id FROM users WHERE username = 'admin'")->fetch_assoc()['id'];

// 2. Mock Equipment
$conn->query("INSERT IGNORE INTO equipment (item_code, name, category, equipment_condition, status) VALUES 
('CAM-001', 'Sony FX6 Cinema Camera', 'Camera', 'good', 'checked_out'),
('CAM-002', 'Sony A7S III', 'Camera', 'good', 'available'),
('SD-032', 'SanDisk 128GB V90 SD Card', 'Storage', 'needs_repair', 'available'),
('SD-033', 'SanDisk 128GB V90 SD Card', 'Storage', 'broken', 'available'),
('MIC-001', 'Sennheiser MKH 416', 'Audio', 'good', 'checked_out'),
('TRP-005', 'Manfrotto 504X Tripod', 'Support', 'fair', 'available')");

$camId = $conn->query("SELECT id FROM equipment WHERE item_code = 'CAM-001'")->fetch_assoc()['id'];
$micId = $conn->query("SELECT id FROM equipment WHERE item_code = 'MIC-001'")->fetch_assoc()['id'];

// 3. Mock Overdue Checkouts
$yesterday = date('Y-m-d H:i:s', strtotime('-1 day'));
$lastWeek = date('Y-m-d H:i:s', strtotime('-7 days'));

$conn->query("INSERT IGNORE INTO equipment_checkouts (equipment_id, user_id, status, checkout_date, due_date) VALUES 
($camId, $userId, 'overdue', '$lastWeek', '$yesterday'),
($micId, $userId, 'checked_out', '$yesterday', '$yesterday')");

// 4. Mock Video Assets
$conn->query("INSERT IGNORE INTO video_categories (name) VALUES ('Documentary'), ('Sermon'), ('News')");
$catId = $conn->query("SELECT id FROM video_categories LIMIT 1")->fetch_assoc()['id'];

$conn->query("INSERT IGNORE INTO video_assets (code, title, category_id, status, created_by) VALUES 
('VID-2023-001', 'The History of Lamu', $catId, 'published', $userId),
('VID-2023-002', 'Friday Khutbah - June 15', $catId, 'review', $userId),
('VID-2023-003', 'Ramazan Special - Ep 1', $catId, 'draft', $userId)");

echo "Seeding completed successfully!\n";
?>
