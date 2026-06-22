<?php
/**
 * MBTV Kenya - Video Assets API Handler
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once(__DIR__ . '/Config.php');
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once(__DIR__ . '/../Models/Auth.php');

$conn = getDbConnection();
$auth = new AuthModel($conn);
$method = $_SERVER['REQUEST_METHOD'];

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST method required']);
    exit;
}

$action = $input['action'] ?? 'list';

switch ($action) {
    case 'list':
        handleList($conn, $auth);
        break;
    case 'create':
        handleCreate($conn, $input, $auth);
        break;
    case 'delete':
        handleDelete($conn, $input, $auth);
        break;
    case 'categories':
        handleListCategories($conn, $auth);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleList($conn, $auth) {
    $auth->requireLogin();
    
    $result = $conn->query("SELECT v.*, c.name as category_name, u.username as creator_name 
                            FROM video_assets v 
                            LEFT JOIN video_categories c ON v.category_id = c.id 
                            LEFT JOIN users u ON v.created_by = u.id 
                            WHERE v.status != 'deleted'
                            ORDER BY v.created_at DESC");
    $videos = [];
    while ($row = $result->fetch_assoc()) {
        $videos[] = $row;
    }
    echo json_encode(['success' => true, 'videos' => $videos]);
}

function handleCreate($conn, $data, $auth) {
    $auth->requireLogin();
    
    $required = ['title', 'code'];
    foreach ($required as $f) {
        if (empty($data[$f])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing $f"]);
            return;
        }
    }
    
    $stmt = $conn->prepare("INSERT INTO video_assets (code, title, description, category_id, status, created_by) VALUES (?, ?, ?, ?, ?, ?)");
    $status = $data['status'] ?? 'draft';
    $createdBy = $_SESSION['user_id'];
    $catId = !empty($data['category_id']) ? (int)$data['category_id'] : null;
    $stmt->bind_param('sssiis', $data['code'], $data['title'], $data['description'], $catId, $status, $createdBy);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleDelete($conn, $data, $auth) {
    $auth->requireChiefIT();
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }
    $stmt = $conn->prepare("UPDATE video_assets SET status = 'deleted' WHERE id = ?");
    $stmt->bind_param('i', $data['id']);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleListCategories($conn, $auth) {
    $auth->requireLogin();
    $result = $conn->query("SELECT id, name FROM video_categories ORDER BY name ASC");
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
    echo json_encode(['success' => true, 'categories' => $categories]);
}

$conn->close();
?>
