<?php
require_once __DIR__ . '/../Models/Video.php';

class VideoController {
    private $videoModel;

    public function __construct($db) {
        $this->videoModel = new Video($db);
    }

    public function listAll() {
        return $this->videoModel->getAll();
    }

    public function createAsset($data) {
        // Business logic for asset validation
        return $this->videoModel->create($data);
    }

    public function getCategories() {
        return $this->videoModel->getCategories();
    }
}
?>
