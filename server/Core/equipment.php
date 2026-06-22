<?php
/**
 * MBTV Kenya - Equipment API Handler
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
    case 'checkout':
        handleCheckout($conn, $input, $auth);
        break;
    case 'checkouts':
        handleListCheckouts($conn, $auth);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleList($conn, $auth) {
    $auth->requireLogin();
    $result = $conn->query("SELECT * FROM equipment WHERE status != 'retired'");
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    echo json_encode(['success' => true, 'equipment' => $items]);
}

function handleCreate($conn, $data, $auth) {
    $auth->requireChiefIT();
    
    if (empty($data['item_code']) || empty($data['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    $stmt = $conn->prepare("INSERT INTO equipment (item_code, name, category, status) VALUES (?, ?, ?, 'available')");
    $category = $data['category'] ?? 'General';
    $stmt->bind_param('sss', $data['item_code'], $data['name'], $category);
    
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
    $stmt = $conn->prepare("UPDATE equipment SET status = 'retired' WHERE id = ?");
    $stmt->bind_param('i', $data['id']);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleCheckout($conn, $data, $auth) {
    $auth->requireLogin();
    if (empty($data['equipment_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'equipment_id required']);
        return;
    }
    $equipmentId = (int)$data['equipment_id'];
    $userId = (int)$_SESSION['user_id'];
    $personnel = isset($data['personnel']) ? trim($data['personnel']) : '';
    $notes = $personnel ?: null;

    $stmt = $conn->prepare(
        "INSERT INTO equipment_checkouts (equipment_id, user_id, quantity, status, checkout_date, notes)
         VALUES (?, ?, 1, 'checked_out', NOW(), ?)"
    );
    $stmt->bind_param('iis', $equipmentId, $userId, $notes);
    if ($stmt->execute()) {
        // mark equipment as checked out
        $upd = $conn->prepare("UPDATE equipment SET status = 'checked_out' WHERE id = ?");
        $upd->bind_param('i', $equipmentId);
        $upd->execute();
        $upd->close();
        echo json_encode(['success' => true, 'checkout_id' => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleListCheckouts($conn, $auth) {
    $auth->requireLogin();
    $result = $conn->query(
        "SELECT ec.*, e.name AS equipment_name, e.item_code, u.full_name AS user_name
         FROM equipment_checkouts ec
         JOIN equipment e ON ec.equipment_id = e.id
         LEFT JOIN users u ON ec.user_id = u.id
         ORDER BY ec.checkout_date DESC
         LIMIT 50"
    );
    $checkouts = [];
    while ($row = $result->fetch_assoc()) {
        $checkouts[] = $row;
    }
    echo json_encode(['success' => true, 'checkouts' => $checkouts]);
}

$conn->close();
?>
