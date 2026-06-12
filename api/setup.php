<?php
/**
 * MBTV Kenya - Database Setup Script
 * Run this once to initialize the database and seed initial data
 */

require_once('config.php');
$conn = getDbConnection();

// Read and execute schema
$schemaFile = dirname(__DIR__) . '/mbtvkenya_schema.sql';
if (!file_exists($schemaFile)) {
    die('Schema file not found: ' . $schemaFile);
}

$schemaSql = file_get_contents($schemaFile);

// Split by semicolon and execute each statement
$statements = array_filter(array_map('trim', explode(';', $schemaSql)));
$executed = 0;

foreach ($statements as $statement) {
    if (empty($statement)) continue;
    
    if (mysqli_multi_query($conn, $statement)) {
        $executed++;
        // Clear results
        while (mysqli_more_results($conn)) {
            mysqli_next_result($conn);
        }
    } else {
        echo "Error executing statement: " . mysqli_error($conn) . "\n";
        echo "Statement: $statement\n\n";
    }
}

echo "Schema setup complete. Executed $executed statements.\n\n";

// Seed initial roles
$rolesInsert = "INSERT INTO roles (name, description) VALUES 
    ('Admin', 'Administrator with full access'),
    ('Editor', 'Content editor'),
    ('Staff', 'General staff member')";

if ($conn->query($rolesInsert)) {
    echo "✓ Roles inserted successfully\n";
} else {
    echo "Note: Roles may already exist. Error: " . $conn->error . "\n";
}

// Seed video categories
$categoriesInsert = "INSERT INTO video_categories (name, description) VALUES 
    ('News', 'News and current affairs'),
    ('Sports', 'Sports and athletics'),
    ('Religious', 'Religious content'),
    ('Educational', 'Educational programs'),
    ('Entertainment', 'Entertainment and events')";

if ($conn->query($categoriesInsert)) {
    echo "✓ Video categories inserted successfully\n";
} else {
    echo "Note: Categories may already exist. Error: " . $conn->error . "\n";
}

echo "\n✓ Database setup complete! You can now:\n";
echo "  1. Visit http://localhost/MBTVKENYA/login.html\n";
echo "  2. Create a new account via Sign Up\n";
echo "  3. Login with your credentials\n";

$conn->close();
?>
