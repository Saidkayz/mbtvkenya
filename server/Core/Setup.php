<?php
/**
 * MBTV Kenya - Database Setup Script
 */

$dbHost = 'localhost';
$dbUser = 'root';
$dbPass = '';
$dbName = 'mbtvkenya';

// 1. Create connection without DB selected
$conn = new mysqli($dbHost, $dbUser, $dbPass);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 2. Create database if not exists
if ($conn->query("CREATE DATABASE IF NOT EXISTS $dbName")) {
    echo "✓ Database '$dbName' ready\n";
} else {
    die("Error creating database: " . $conn->error);
}

$conn->select_db($dbName);

// 3. Read and execute schema
$schemaFile = __DIR__ . '/../mbtvkenya_schema.sql';
if (!file_exists($schemaFile)) {
    die("Schema file not found: $schemaFile");
}

$schemaSql = file_get_contents($schemaFile);
if ($conn->multi_query($schemaSql)) {
    do {
        if ($result = $conn->store_result()) { $result->free(); }
    } while ($conn->next_result());
    echo "✓ Schema applied\n";
} else {
    echo "Error applying schema: " . $conn->error . "\n";
}

// 4. Seed Roles (Overwrite/Update)
$conn->query("DELETE FROM roles");
$rolesInsert = "INSERT INTO roles (id, name, description) VALUES 
    (1, 'Chief IT', 'Full system access and user management'),
    (2, 'Senior Editor', 'Content management and review'),
    (3, 'Camera Man', 'Equipment usage and field tracking'),
    (4, 'CEO', 'Executive oversight and reporting'),
    (5, 'Production Manager', 'Media pipeline management'),
    (6, 'Presenter', 'Program presentation and scheduling')";

if ($conn->query($rolesInsert)) {
    echo "✓ Roles updated successfully\n";
} else {
    echo "Error updating roles: " . $conn->error . "\n";
}

// 5. Seed Categories
$categoriesInsert = "INSERT IGNORE INTO video_categories (name, description) VALUES 
    ('News', 'News and current affairs'),
    ('Sports', 'Sports and athletics'),
    ('Religious', 'Religious content'),
    ('Educational', 'Educational programs'),
    ('Entertainment', 'Entertainment and events')";
$conn->query($categoriesInsert);
echo "✓ Categories seeded\n";

// 6. Seed default Chief IT User
$itEmail = 'kassimaly34@gmail.com';
$itPass = password_hash('pass1234', PASSWORD_DEFAULT);
$itEmailCheck = $conn->query("SELECT id FROM users WHERE email = '$itEmail'");

if ($itEmailCheck->num_rows === 0) {
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, full_name, role_id, status) VALUES (?, ?, ?, ?, ?, ?)");
    $username = 'chief_it';
    $fullName = 'Chief IT Admin';
    $roleId = 1;
    $status = 'active';
    $stmt->bind_param('ssssis', $username, $itEmail, $itPass, $fullName, $roleId, $status);
    
    if ($stmt->execute()) {
        echo "✓ Chief IT user created: $itEmail\n";
    } else {
        echo "Error creating Chief IT user: " . $stmt->error . "\n";
    }
} else {
    echo "✓ Chief IT user already exists\n";
}

$conn->close();
echo "\n✓ Setup complete!\n";
?>
