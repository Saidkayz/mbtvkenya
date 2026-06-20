<?php
require_once __DIR__ . '/../Models/User.php';

class UserController {
    private $db;
    private $userModel;

    public function __construct($db) {
        $this->db = $db;
        $this->userModel = new User($db);
    }

    public function login($username, $password) {
        $user = $this->userModel->findByUsername($username);
        if ($user && password_verify($password, $user['password_hash'])) {
            session_start();
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role_id'] = $user['role_id'];
            // role name fetch logic would go here or be part of model
            return $user;
        }
        return false;
    }

    public function listUsers() {
        return $this->userModel->getAll();
    }

    public function deleteUser($userId) {
        return $this->userModel->delete($userId);
    }
}
?>
