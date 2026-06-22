<?php
// MBTV Kenya - Users API Handler
// Handles user registration, login, and OTP verification

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error) {
        http_response_code(500);
        @file_put_contents(__DIR__ . '/api_error_log.txt', date('c') . ' ' . print_r($error, true) . "\n", FILE_APPEND);
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode(['error' => 'Internal server error', 'detail' => $error['message']]);
    }
});

require_once(__DIR__ . '/Config.php');
setCorsHeaders();

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once(__DIR__ . '/../Models/Auth.php');
$conn = getDbConnection();
$auth = new AuthModel($conn);

// Read input data once
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!is_array($input)) {
    $input = [];
}

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : 'unknown');

// Only accept POST requests
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST. Method received: ' . $method . '. Look at browser Network tab ']);
    exit;
}

// Route requests based on action
switch ($action) {
    case 'register':
        handleRegister($conn, $input, $auth);
        break;
    case 'verify-otp':
        handleVerifyOtp($conn, $input);
        break;
    case 'login':
        handleLogin($conn, $input, $auth);
        break;
    case 'list-users':
        handleListUsers($conn, $auth);
        break;
    case 'list-roles':
        handleListRoles($conn, $auth);
        break;
    case 'delete-user':
        handleDeleteUser($conn, $input, $auth);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action: ' . $action . '. Expected: register, verify-otp, login, list-users, or delete-user']);
        break;
}

/**
 * Handle user registration
 */
function handleRegister($conn, $data, $auth) {
    // Validate required fields
    $required = ['full_name', 'username', 'email', 'phone', 'password', 'role'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }

    $fullName = trim($data['full_name']);
    $username = trim($data['username']);
    $email = trim($data['email']);
    $phone = trim($data['phone']);
    $password = $data['password'];
    $role = $data['role'];

    // If there is no admin user yet, make the first registration an admin account.
    $adminCheck = $conn->prepare("SELECT id FROM users WHERE role = 'Chief IT' LIMIT 1");
    $adminCheck->execute();
    $adminResult = $adminCheck->get_result();
    $hasAdmin = $adminResult->num_rows > 0;
    $adminCheck->close();

    if (!$hasAdmin) {
        $role = 'Chief IT';
    } elseif ($role === 'Chief IT') {
        http_response_code(400);
        echo json_encode(['error' => 'Admin accounts must be created by an existing administrator']);
        return;
    }

    // Validate input
    if (strlen($fullName) < 2) {
        http_response_code(400);
        echo json_encode(['error' => 'Full name is required']);
        return;
    }

    // Validate role
    $validRoles = ['Chief IT', 'Senior Editor', 'Camera Man', 'CEO', 'Production Manager', 'Presenter'];
    if (!in_array($role, $validRoles)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid role selected']);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        return;
    }

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters']);
        return;
    }

    // Check if username already exists
    $stmt = $conn->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->bind_param('s', $username);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Username already exists']);
        $stmt->close();
        return;
    }
    $stmt->close();

    // Check if email already exists
    $stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered']);
        $stmt->close();
        return;
    }
    $stmt->close();

    // Generate OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    
    // Check if requester is Chief IT (Direct registration)
    if ($auth->isLoggedIn() && $auth->isChiefIT()) {
        $stmt = $conn->prepare(
            'INSERT INTO users (username, full_name, email, phone, password_hash, role, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->bind_param('ssssss', $username, $fullName, $email, $phone, $hashedPassword, $role);
        
        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'User created successfully by administrator',
                'user_id' => $conn->insert_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create user: ' . $stmt->error]);
        }
        $stmt->close();
        return;
    }

    $verificationId = bin2hex(random_bytes(16));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    // Insert into temporary verification table
    $stmt = $conn->prepare(
        'INSERT INTO user_verifications (verification_id, username, full_name, email, phone, password_hash, role, otp, otp_expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('sssssssss', $verificationId, $username, $fullName, $email, $phone, $hashedPassword, $role, $otp, $expiresAt);

    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'verification_id' => $verificationId,
            'contact_message' => "Verification code sent to $phone"
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed: ' . $stmt->error]);
    }
    $stmt->close();
}

/**
 * Handle OTP verification
 */
function handleVerifyOtp($conn, $data) {
    if (empty($data['verification_id']) || empty($data['otp'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing verification_id or otp']);
        return;
    }

    $verificationId = $data['verification_id'];
    $otp = trim($data['otp']);

    // Retrieve pending verification
    $stmt = $conn->prepare(
        'SELECT id, username, full_name, email, phone, password_hash, role, otp, otp_expires_at 
         FROM user_verifications 
         WHERE verification_id = ? AND verified_at IS NULL'
    );
    $stmt->bind_param('s', $verificationId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Verification not found or already completed']);
        $stmt->close();
        return;
    }

    $verification = $result->fetch_assoc();
    $stmt->close();

    // Check OTP expiry
    if (strtotime($verification['otp_expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(['error' => 'OTP has expired']);
        return;
    }

    // Verify OTP
    if ($verification['otp'] !== $otp) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid OTP']);
        return;
    }

    // Create user account
    $stmt = $conn->prepare(
        'INSERT INTO users (username, full_name, email, phone, password_hash, role, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->bind_param(
        'ssssss',
        $verification['username'],
        $verification['full_name'],
        $verification['email'],
        $verification['phone'],
        $verification['password_hash'],
        $verification['role']
    );

    if ($stmt->execute()) {
        $userId = $conn->insert_id;
        
        // Mark verification as complete
        $updateStmt = $conn->prepare(
            'UPDATE user_verifications SET verified_at = NOW() WHERE verification_id = ?'
        );
        $updateStmt->bind_param('s', $verificationId);
        $updateStmt->execute();
        $updateStmt->close();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Account verified successfully. You can now log in.',
            'user_id' => $userId
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create user account: ' . $stmt->error]);
    }
    $stmt->close();
}

/**
 * Handle user login
 */
function handleLogin($conn, $data, $auth) {
    if (empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing username or password']);
        return;
    }

    $username = trim($data['username']);
    $password = $data['password'];

    // Get user by username
    $stmt = $conn->prepare(
        'SELECT id, username, email, full_name, password_hash, role FROM users WHERE username = ? LIMIT 1'
    );
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username or password']);
        $stmt->close();
        return;
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username or password']);
        return;
    }

    // Start session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role_name'] = $user['role'];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'role_name' => $user['role']
        ]
    ]);
}

/**
 * List all users (Chief IT only)
 */
function handleListUsers($conn, $auth) {
    $auth->requireChiefIT();
    
    $result = $conn->query('SELECT id, username, email, full_name, phone, role FROM users');
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
}

/**
 * List all roles
 */
function handleListRoles($conn, $auth) {
    $auth->requireLogin();
    
    $roles = [
        ['id' => 'Chief IT', 'name' => 'Chief IT'],
        ['id' => 'Senior Editor', 'name' => 'Senior Editor'],
        ['id' => 'Camera Man', 'name' => 'Camera Man'],
        ['id' => 'CEO', 'name' => 'CEO'],
        ['id' => 'Production Manager', 'name' => 'Production Manager'],
        ['id' => 'Presenter', 'name' => 'Presenter']
    ];
    
    echo json_encode(['success' => true, 'roles' => $roles]);
}

/**
 * Delete a user (Chief IT only)
 */
function handleDeleteUser($conn, $data, $auth) {
    $auth->requireChiefIT();
    
    if (empty($data['user_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required']);
        return;
    }

    $userId = (int)$data['user_id'];
    
    // Cannot delete yourself
    if ($userId === (int)$_SESSION['user_id']) {
        http_response_code(400);
        echo json_encode(['error' => 'You cannot delete your own account']);
        return;
    }

    $stmt = $conn->prepare('DELETE FROM users WHERE id = ?');
    $stmt->bind_param('i', $userId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete user: ' . $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
?>
