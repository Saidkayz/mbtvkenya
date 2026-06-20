<?php
require 'config.php';
$conn = getDbConnection();
$res = $conn->query('SELECT id, name FROM roles ORDER BY id');
if (!$res) {
    echo 'Error: ' . $conn->error . PHP_EOL;
    exit(1);
}
while ($row = $res->fetch_assoc()) {
    echo $row['id'] . ' ' . $row['name'] . PHP_EOL;
}
$conn->close();
?>