<?php
class Video {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        $result = $this->conn->query('SELECT v.*, c.name as category_name, u.full_name as creator_name 
                                    FROM video_assets v 
                                    LEFT JOIN video_categories c ON v.category_id = c.id 
                                    LEFT JOIN users u ON v.created_by = u.id 
                                    ORDER BY v.created_at DESC');
        $videos = [];
        while ($row = $result->fetch_assoc()) {
            $videos[] = $row;
        }
        return $videos;
    }

    public function create($data) {
        $stmt = $this->conn->prepare('INSERT INTO video_assets (code, title, description, category_id, status, created_by) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->bind_param('sssis i', $data['code'], $data['title'], $data['description'], $data['category_id'], $data['status'], $data['created_by']);
        return $stmt->execute();
    }

    public function getCategories() {
        $result = $this->conn->query('SELECT * FROM video_categories');
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
        return $categories;
    }
}
?>
