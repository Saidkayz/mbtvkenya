<?php
require 'config.php';
$c = getDbConnection();
$res = $c->query('SHOW TABLES');
if (!$res) {
    echo 'ERROR: ' . $c->error;
    exit(1);
}
while ($row = $res->fetch_row()) {
    echo $row[0] . PHP_EOL;
}
$c->close();
?>