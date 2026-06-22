<?php
class AuthModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }

    public function getRoleName() {
        return isset($_SESSION['role_name']) ? $_SESSION['role_name'] : '';
    }

    public function isChiefIT() {
        return $this->getRoleName() === 'Chief IT';
    }

    public function requireLogin() {
        if (!$this->isLoggedIn()) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
    }

    public function requireChiefIT() {
        $this->requireLogin();
        if (!$this->isChiefIT()) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied. Chief IT privileges required.']);
            exit;
        }
    }
}
?>
