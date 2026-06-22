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
                                    WHERE v.status != "deleted"
                                    ORDER BY v.created_at DESC');
        $videos = [];
        while ($row = $result->fetch_assoc()) {
            $videos[] = $row;
        }
        return $videos;
    }

    public function create($data) {
        $sql = "INSERT INTO video_assets (
            code, title, category_id, video_date, location, 
            camera_number, camera_operator, speaker, memory_card, 
            num_clips, total_duration, resolution, backup_status, 
            editor_assigned, status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('ssissssssissssssi', 
            $data['code'], $data['title'], $data['category_id'], $data['video_date'], $data['location'],
            $data['camera_number'], $data['camera_operator'], $data['speaker'], $data['memory_card'],
            $data['num_clips'], $data['total_duration'], $data['resolution'], $data['backup_status'],
            $data['editor_assigned'], $data['status'], $data['notes'], $data['created_by']
        );
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
