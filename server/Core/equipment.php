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
    case 'return':
        handleReturn($conn, $input, $auth);
        break;
    case 'checkouts':
        handleListCheckouts($conn, $auth);
        break;
    case 'list_staff':
        handleListStaff($conn, $auth);
        break;
    case 'logistics_stats':
        handleLogisticsStats($conn, $auth);
        break;
    case 'trend_data':
        handleTrendData($conn, $auth);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleTrendData($conn, $auth) {
    $auth->requireLogin();
    
    // Get last 7 days of transactions (checkouts vs returns)
    $trends = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        
        $res = $conn->query("SELECT SUM(quantity) as checkouts FROM equipment_checkouts WHERE DATE(checkout_date) = '$date'");
        $checkouts = (int)($res->fetch_assoc()['checkouts'] ?? 0);
        
        $res = $conn->query("SELECT SUM(quantity) as returns FROM equipment_checkouts WHERE DATE(return_date) = '$date'");
        $returns = (int)($res->fetch_assoc()['returns'] ?? 0);
        
        $trends[] = [
            'date' => date('D', strtotime($date)),
            'checkouts' => $checkouts,
            'returns' => $returns
        ];
    }
    
    // Get Category Distribution
    $categories = [];
    $res = $conn->query("SELECT category, COUNT(*) as count FROM equipment WHERE status != 'retired' GROUP BY category");
    while ($row = $res->fetch_assoc()) {
        $categories[] = $row;
    }
    
    echo json_encode([
        'success' => true, 
        'trends' => $trends,
        'categories' => $categories
    ]);
}

function handleLogisticsStats($conn, $auth) {
    $auth->requireLogin();
    
    // 1. Utilization = (Total Checked Out / Total Quantity) * 100
    $res = $conn->query("SELECT SUM(total_quantity) as total FROM equipment WHERE status != 'retired'");
    $total = (int)($res->fetch_assoc()['total'] ?? 0);
    
    $res = $conn->query("SELECT SUM(quantity) as checked_out FROM equipment_checkouts WHERE status = 'checked_out'");
    $checkedOut = (int)($res->fetch_assoc()['checked_out'] ?? 0);
    
    $utilization = $total > 0 ? round(($checkedOut / $total) * 100) : 0;
    
    // 2. Pending Returns (Overdue)
    // For now, let's just count records that are either explicitly 'overdue' or 'checked_out' past their due_date
    $res = $conn->query("SELECT COUNT(*) as cnt FROM equipment_checkouts WHERE status = 'overdue' OR (status = 'checked_out' AND due_date < NOW())");
    $overdue = (int)($res->fetch_assoc()['cnt'] ?? 0);
    
    echo json_encode([
        'success' => true,
        'utilization' => $utilization,
        'overdue_count' => $overdue
    ]);
}

function handleList($conn, $auth) {
    $auth->requireLogin();
    // Calculate available quantity: total_quantity - sum of checked_out in equipment_checkouts
    $query = "
        SELECT e.*, 
        (e.total_quantity - IFNULL((SELECT SUM(ec.quantity) FROM equipment_checkouts ec WHERE ec.equipment_id = e.id AND ec.status = 'checked_out'), 0)) as available_quantity
        FROM equipment e 
        WHERE e.status != 'retired'
    ";
    $result = $conn->query($query);
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

    $stmt = $conn->prepare("INSERT INTO equipment (item_code, name, category, total_quantity, status) VALUES (?, ?, ?, ?, 'available')");
    $category = $data['category'] ?? 'General';
    $totalQty = isset($data['total_quantity']) ? (int)$data['total_quantity'] : 1;
    $stmt->bind_param('sssi', $data['item_code'], $data['name'], $category, $totalQty);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleCheckout($conn, $data, $auth) {
    $auth->requireLogin();
    if (empty($data['equipment_id']) || empty($data['user_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'equipment_id and user_id are required']);
        return;
    }

    $equipmentId = (int)$data['equipment_id'];
    $targetUserId = (int)$data['user_id']; // The staff member getting the gear
    $qty = isset($data['quantity']) ? (int)$data['quantity'] : 1;
    $adminId = (int)$_SESSION['user_id']; // The admin performing the action
    $notes = isset($data['notes']) ? trim($data['notes']) : '';
    $dueDate = !empty($data['due_date']) ? $data['due_date'] : null;

    // 1. Check Availability
    $stmt = $conn->prepare("
        SELECT total_quantity, 
        (total_quantity - IFNULL((SELECT SUM(quantity) FROM equipment_checkouts WHERE equipment_id = ? AND status = 'checked_out'), 0)) as available
        FROM equipment WHERE id = ?
    ");
    $stmt->bind_param('ii', $equipmentId, $equipmentId);
    $stmt->execute();
    $eq = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$eq) {
        http_response_code(404);
        echo json_encode(['error' => 'Equipment not found']);
        return;
    }

    if ($eq['available'] < $qty) {
        http_response_code(400);
        echo json_encode(['error' => "Insufficient stock. Only {$eq['available']} units available."]);
        return;
    }

    // 2. Insert Record
    $stmt = $conn->prepare(
        "INSERT INTO equipment_checkouts (equipment_id, user_id, admin_id, quantity, status, checkout_date, due_date, notes)
         VALUES (?, ?, ?, ?, 'checked_out', NOW(), ?, ?)"
    );
    $stmt->bind_param('iiiiss', $equipmentId, $targetUserId, $adminId, $qty, $dueDate, $notes);
    
    if ($stmt->execute()) {
        // Update equipment status if it was 'available' and now fully booked? 
        // Or just let the availability query handle it. 
        // For simplicity, we'll just insert the checkout.
        echo json_encode(['success' => true, 'checkout_id' => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleReturn($conn, $data, $auth) {
    $auth->requireLogin();
    if (empty($data['checkout_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'checkout_id required']);
        return;
    }

    $checkoutId = (int)$data['checkout_id'];
    $stmt = $conn->prepare("UPDATE equipment_checkouts SET status = 'returned', return_date = NOW() WHERE id = ? AND status = 'checked_out'");
    $stmt->bind_param('i', $checkoutId);
    
    if ($stmt->execute()) {
        if ($conn->affected_rows > 0) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Active checkout record not found or already returned']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleListCheckouts($conn, $auth) {
    $auth->requireLogin();
    $result = $conn->query(
        "SELECT ec.*, e.name AS equipment_name, e.item_code, u.full_name AS recipient_name, u.username AS recipient_username, a.full_name AS admin_name
         FROM equipment_checkouts ec
         JOIN equipment e ON ec.equipment_id = e.id
         LEFT JOIN users u ON ec.user_id = u.id
         LEFT JOIN users a ON ec.admin_id = a.id
         ORDER BY ec.checkout_date DESC
         LIMIT 100"
    );
    $checkouts = [];
    while ($row = $result->fetch_assoc()) {
        $checkouts[] = $row;
    }
    echo json_encode(['success' => true, 'checkouts' => $checkouts]);
}

function handleListStaff($conn, $auth) {
    $auth->requireLogin();
    $result = $conn->query("SELECT id, full_name, username FROM users WHERE status = 'active' ORDER BY full_name ASC");
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    echo json_encode(['success' => true, 'users' => $users]);
}


$conn->close();
?>
