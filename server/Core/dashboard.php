<?php
/**
 * MBTV Kenya – Dashboard Stats API
 * Returns aggregate counts for the admin dashboard summary cards.
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error) {
        http_response_code(500);
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode(['error' => 'Internal server error', 'detail' => $error['message']]);
    }
});

require_once(__DIR__ . '/Config.php');
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once(__DIR__ . '/../Models/Auth.php');

$conn = getDbConnection();
$auth = new AuthModel($conn);

// Require an authenticated session
$auth->requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST method required']);
    exit;
}

$rawInput = file_get_contents('php://input');
$input    = json_decode($rawInput, true) ?? [];
$action   = $input['action'] ?? 'stats';

switch ($action) {
    case 'stats':
        handleStats($conn);
        break;
    case 'alerts':
        handleAlerts($conn);
        break;
    case 'chart-data':
        handleChartData($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

/**
 * Return summary counts for videos, equipment (total & available),
 */
function handleStats($conn) {
    // Total non-deleted videos
    $videoTotal = 0;
    $r = $conn->query("SELECT COUNT(*) AS cnt FROM video_assets WHERE status != 'deleted'");
    if ($r) $videoTotal = (int)$r->fetch_assoc()['cnt'];

    $videoPending = 0;
    $r = $conn->query("SELECT COUNT(*) AS cnt FROM video_assets WHERE status = 'Pending'");
    if ($r) $videoPending = (int)$r->fetch_assoc()['cnt'];

    // Equipment stats
    $equipTotal = 0;
    $r = $conn->query("SELECT COUNT(*) AS cnt FROM equipment WHERE status != 'retired'");
    if ($r) $equipTotal = (int)$r->fetch_assoc()['cnt'];

    $equipAvailable = 0;
    $r = $conn->query("SELECT COUNT(*) AS cnt FROM equipment WHERE status = 'available'");
    if ($r) $equipAvailable = (int)$r->fetch_assoc()['cnt'];

    // Total active users
    $userTotal = 0;
    $r = $conn->query("SELECT COUNT(*) AS cnt FROM users WHERE status != 'deleted'");
    if ($r) $userTotal = (int)$r->fetch_assoc()['cnt'];

    // Pending Returns (Checkouts that are not yet returned)
    $pendingReturns = 0;
    $r = $conn->query("SELECT COUNT(*) AS cnt FROM equipment_checkouts WHERE status = 'checked_out'");
    if ($r) $pendingReturns = (int)$r->fetch_assoc()['cnt'];

    // Mock storage utilization for demo
    $storageUsedGb = 450; 
    $storageTotalGb = 1024;
    $storagePct = round(($storageUsedGb / $storageTotalGb) * 100);

    echo json_encode([
        'success'            => true,
        'total_videos'       => $videoTotal,
        'video_pending'      => $videoPending,
        'total_equipment'    => $equipTotal,
        'available_equipment'=> $equipAvailable,
        'total_users'        => $userTotal,
        'pending_returns'    => $pendingReturns,
        'availability_pct'   => $equipTotal > 0 ? round(($equipAvailable / $equipTotal) * 100) : 0,
        'storage_used_gb'    => $storageUsedGb,
        'storage_total_gb'   => $storageTotalGb,
        'storage_pct'        => $storagePct
    ]);
}

/**
 * Return system alerts: overdue equipment and damaged items.
 */
function handleAlerts($conn) {
    $alerts = [];

    // 1. Overdue Equipment
    $sql = "SELECT e.name, c.due_date, u.full_name 
            FROM equipment_checkouts c
            JOIN equipment e ON c.equipment_id = e.id
            JOIN users u ON c.user_id = u.id
            WHERE c.status = 'overdue' OR (c.status = 'checked_out' AND c.due_date < NOW())
            ORDER BY c.due_date ASC";
    $res = $conn->query($sql);
    while ($row = $res->fetch_assoc()) {
        $alerts[] = [
            'type' => 'overdue',
            'title' => 'Equipment Overdue',
            'message' => $row['name'] . ' was due on ' . date('M d', strtotime($row['due_date'])),
            'user' => $row['full_name'],
            'priority' => 'high'
        ];
    }

    // 2. Damaged/Low Stock (Condition check)
    $sql = "SELECT item_code, name, equipment_condition 
            FROM equipment 
            WHERE equipment_condition IN ('needs_repair', 'broken')
            LIMIT 5";
    $res = $conn->query($sql);
    while ($row = $res->fetch_assoc()) {
        $alerts[] = [
            'type' => 'damaged',
            'title' => 'Hardware Issue',
            'message' => $row['name'] . ' (' . $row['item_code'] . ') marked as ' . $row['equipment_condition'],
            'priority' => 'medium'
        ];
    }

    echo json_encode([
        'success' => true,
        'alerts' => $alerts
    ]);
}

/**
 * Provides data for the Doughnut and Line charts.
 */
function handleChartData($conn) {
    // 1. Equipment distribution by status
    $dist = [];
    $res = $conn->query("SELECT status, COUNT(*) as cnt FROM equipment GROUP BY status");
    while ($row = $res->fetch_assoc()) {
        $dist[$row['status']] = (int)$row['cnt'];
    }

    // 2. Video upload trend (Last 7 days)
    $trend = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $res = $conn->query("SELECT COUNT(*) as cnt FROM video_assets WHERE DATE(created_at) = '$date'");
        $cnt = $res ? (int)$res->fetch_assoc()['cnt'] : 0;
        $trend[] = ['date' => date('D', strtotime($date)), 'count' => $cnt];
    }

    echo json_encode([
        'success' => true,
        'equipment_dist' => $dist,
        'video_trend' => $trend
    ]);
}

$conn->close();
?>
