<?php
class User {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function findByUsername($username) {
        $stmt = $this->conn->prepare('SELECT id, username, email, password_hash, role_id FROM users WHERE username = ? LIMIT 1');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function create($data) {
        $stmt = $this->conn->prepare('INSERT INTO users (username, full_name, email, phone, password_hash, role_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
        $stmt->bind_param('sssssi', $data['username'], $data['full_name'], $data['email'], $data['phone'], $data['password_hash'], $data['role_id']);
        return $stmt->execute();
    }

    public function getAll() {
        $result = $this->conn->query('SELECT u.id, u.username, u.email, u.full_name, u.phone, u.status, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id');
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        return $users;
    }

    public function delete($id) {
        $stmt = $this->conn->prepare('DELETE FROM users WHERE id = ?');
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }
}
?>
