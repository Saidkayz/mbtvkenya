<?php
class Equipment {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        $result = $this->conn->query('SELECT * FROM equipment ORDER BY created_at DESC');
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        return $items;
    }

    public function findByCode($code) {
        $stmt = $this->conn->prepare('SELECT * FROM equipment WHERE item_code = ? LIMIT 1');
        $stmt->bind_param('s', $code);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function create($data) {
        $stmt = $this->conn->prepare('INSERT INTO equipment (item_code, name, category, description, status) VALUES (?, ?, ?, ?, ?)');
        $stmt->bind_param('sssss', $data['item_code'], $data['name'], $data['category'], $data['description'], $data['status']);
        return $stmt->execute();
    }

    public function updateStatus($id, $status) {
        $stmt = $this->conn->prepare('UPDATE equipment SET status = ? WHERE id = ?');
        $stmt->bind_param('si', $status, $id);
        return $stmt->execute();
    }
}
?>
