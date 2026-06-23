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
    case 'update':
        handleUpdate($conn, $input, $auth);
        break;
    case 'categories':
        handleListCategories($conn);
        break;
    case 'helpers':
        handleHelpers($conn, $auth);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleList($conn, $auth) {
    $auth->requireLogin();
    
    $result = $conn->query("SELECT * FROM video_assets ORDER BY created_at DESC");
    $videos = [];
    while($row = $result->fetch_assoc()) {
        $videos[] = $row;
    }
    echo json_encode(['success' => true, 'videos' => $videos]);
}

function handleCreate($conn, $data, $auth) {
    $auth->requireLogin();
    
    if (empty($data['title'])) {
        http_response_code(400);
        echo json_encode(['error' => "Title is required"]);
        return;
    }
    
    // Generate a unique reference code if not provided
    $code = !empty($data['code']) ? $data['code'] : 'VID-' . strtoupper(substr(uniqid(), -6));
    
    $title = trim($data['title']);
    $category = trim($data['category'] ?? 'General');
    $video_date = $data['video_date'] ?? date('Y-m-d');
    $location = $data['location'] ?? null;
    $cameraNumber = $data['camera_number'] ?? null;
    $cameraOperator = $data['camera_operator'] ?? null;
    $memoryCard = $data['memory_card'] ?? null;
    $resolution = $data['resolution'] ?? '4K 25fps';
    $speaker = $data['speaker'] ?? null;
    $numClips = !empty($data['num_clips']) ? (int)$data['num_clips'] : 0;
    $totalDuration = $data['total_duration'] ?? null;
    $backupStatus = $data['backup_status'] ?? null;
    $notes = $data['notes'] ?? null;
    $editorAssigned = $data['editor_assigned'] ?? null;
    $status = $data['status'] ?? 'Pending';
    
    $stmt = $conn->prepare(
        "INSERT INTO video_assets (title, category, video_date, location, camera_number, camera_operator, memory_card, resolution, speaker, num_clips, total_duration, backup_status, notes, editor_assigned, status, code, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $conn->error]);
        return;
    }
    
    $stmt->bind_param("sssssssssissssss", $title, $category, $video_date, $location, $cameraNumber, $cameraOperator, $memoryCard, $resolution, $speaker, $numClips, $totalDuration, $backupStatus, $notes, $editorAssigned, $status, $code);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id, 'code' => $code]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleUpdate($conn, $data, $auth) {
    $auth->requireLogin();
    
    if (empty($data['id']) || empty($data['title'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID and Title are required']);
        return;
    }
    
    $sql = "UPDATE video_assets SET 
                title = ?, category = ?, video_date = ?, location = ?, 
                camera_number = ?, camera_operator = ?, memory_card = ?, resolution = ?, 
                speaker = ?, num_clips = ?, total_duration = ?, backup_status = ?, 
                editor_assigned = ?, notes = ?, status = ?
            WHERE id = ?";
            
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $conn->error]);
        return;
    }
    
    $id = (int)$data['id'];
    $title = trim($data['title']);
    $category = trim($data['category'] ?? 'General');
    $numClips = !empty($data['num_clips']) ? (int)$data['num_clips'] : 0;
    
    $videoDate = $data['video_date'] ?? null;
    $location = $data['location'] ?? null;
    $camNum = $data['camera_number'] ?? null;
    $camOp = $data['camera_operator'] ?? null;
    $memCard = $data['memory_card'] ?? null;
    $res = $data['resolution'] ?? '4K 25fps';
    $speaker = $data['speaker'] ?? null;
    $duration = $data['total_duration'] ?? null;
    $backup = $data['backup_status'] ?? null;
    $editor = $data['editor_assigned'] ?? null;
    $notes = $data['notes'] ?? null;
    $status = $data['status'] ?? 'Pending';

    $stmt->bind_param('sssssssssisssssi', 
        $title, 
        $category, 
        $videoDate, 
        $location,
        $camNum, 
        $camOp, 
        $memCard, 
        $res,
        $speaker, 
        $numClips, 
        $duration, 
        $backup,
        $editor, 
        $notes, 
        $status, 
        $id
    );
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
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
    $stmt = $conn->prepare("DELETE FROM video_assets WHERE id = ?");
    $stmt->bind_param('i', $data['id']);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

function handleListCategories($conn) {
    $categories = [
        ['id' => 'Podcast', 'name' => 'Podcast'],
        ['id' => 'Friday Khutbah', 'name' => 'Friday Khutbah'],
        ['id' => 'Darsa', 'name' => 'Darsa'],
        ['id' => 'Daawa tour', 'name' => 'Daawa tour'],
        ['id' => 'Documentary', 'name' => 'Documentary']
    ];
    echo json_encode(['success' => true, 'categories' => $categories]);
}


function handleHelpers($conn, $auth) {
    if (!$auth->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    // 1. Fetch Cameras from equipment
    $cameras = [];
    $res = $conn->query("SELECT item_code, name FROM equipment WHERE category = 'Camera' AND status = 'available'");
    while ($row = $res->fetch_assoc()) {
        $cameras[] = $row;
    }

    // 2. Fetch Active Users
    $operators = [];
    $res = $conn->query("SELECT id, full_name FROM users WHERE status = 'active' ORDER BY full_name ASC");
    while ($row = $res->fetch_assoc()) {
        $operators[] = $row;
    }

    echo json_encode([
        'success' => true,
        'cameras' => $cameras,
        'operators' => $operators
    ]);
}

$conn->close();
?>
