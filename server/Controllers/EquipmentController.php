<?php
require_once __DIR__ . '/../Models/Equipment.php';

class EquipmentController {
    private $equipmentModel;

    public function __construct($db) {
        $this->equipmentModel = new Equipment($db);
    }

    public function listAll() {
        return $this->equipmentModel->getAll();
    }

    public function requestCheckout($data) {
        // Business logic for checking availability could go here
        return $this->equipmentModel->updateStatus($data['id'], 'checked_out');
    }

    public function addEquipment($data) {
        return $this->equipmentModel->create($data);
    }
}
?>
