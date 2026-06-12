<?php
// Database Configuration for MBTV Kenya Application

function getDbConnection() {
    $dbHost = 'localhost';
    $dbUser = 'root';
    $dbPass = '';
    $dbName = 'mbtvkenya';

    // Create connection
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);

    // Check connection
    if ($conn->connect_error) {
        http_response_code(500);
        die(json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]));
    }

    // Set charset
    $conn->set_charset('utf8mb4');

    return $conn;
}

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors directly, let PHP handle them
?>
