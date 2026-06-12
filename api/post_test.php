<?php
$data = [
    'action' => 'register',
    'full_name' => 'Test User',
    'username' => 'testuser_' . uniqid(),
    'email' => 'test' . uniqid() . '@example.com',
    'phone' => '0712345678',
    'password' => 'secret123',
    'role_id' => 2,
];
$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data),
        'ignore_errors' => true,
    ],
];
$context  = stream_context_create($options);
$response = file_get_contents('http://localhost/MBTVKENYA/api/users.php', false, $context);
var_dump($http_response_header);
echo "\nResponse:\n";
echo $response;
?>