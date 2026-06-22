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

/**
 * Set CORS headers. Uses the request origin (or falls back to localhost)
 * so that credentials: 'include' works correctly.
 */
function setCorsHeaders() {
    $allowed = ['http://localhost', 'http://127.0.0.1'];
    $origin  = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    // Strip trailing port to do a base-origin match
    if ($origin && (in_array($origin, $allowed) || strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: http://localhost");
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
}

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);
?>
