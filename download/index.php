<?php
DEFINE('DISCORD_WEBHOOK_URL', '');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

$skin = $_GET['skin'] ?? '';
$key = $_GET['key'] ?? '';

if (empty($skin)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parameter "skin" is required']);
    exit;
}

if (empty($key)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parameter "key" is required']);
    exit;
}

$skinPath = "../skins/{$skin}.svg";
if (!file_exists($skinPath)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Skin not found']);
    exit;
}

$certData = verifyCertificate($key);
if (!$certData) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired certificate key']);
    exit;
}

try {
    generateCustomCertificate($skinPath, $certData, $skin, $key);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error generating certificate: ' . $e->getMessage()]);
}

function verifyCertificate($key) {
    $apiUrl = "https://check.noskid.today/?key=" . urlencode($key);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_HTTPHEADER => [
            'User-Agent: skins.noskid.today/1.0'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false || !empty($curlError)) {
        error_log('Certificate verification failed: cURL error - ' . $curlError);
        return false;
    }
    
    if ($httpCode !== 200) {
        error_log('Certificate verification failed: HTTP ' . $httpCode);
        return false;
    }
    
    $result = json_decode($response, true);
    
    if ($result === null) {
        error_log('Certificate verification failed: Invalid JSON response');
        return false;
    }
    
    if (!isset($result['success']) || !$result['success']) {
        error_log('Certificate verification failed: ' . ($result['message'] ?? 'Unknown error'));
        return false;
    }
    
    return $result['data'] ?? false;
}

function generateCustomCertificate($skinPath, $certData, $skinName, $originalKey) {
    if (!file_exists($skinPath)) {
        throw new Exception('SVG skin template not found');
    }
    
    $svgContent = file_get_contents($skinPath);
    if ($svgContent === false) {
        throw new Exception('Failed to read SVG skin template');
    }
    
    $date = date('Y-m-d', strtotime($certData['creationDate']));
    $certNumber = $certData['certificate_number'];
    $percentage = $certData['percentage'];
    $username = $certData['nickname'];
    
    $replacements = [
        '{{DATE}}' => $date,
        '{{CERTNB}}' => $certNumber,
        '{{PERCENT}}' => $percentage,
        '{{USER}}' => htmlspecialchars($username, ENT_XML1, 'UTF-8')
    ];
    
    $svgContent = str_replace(array_keys($replacements), array_values($replacements), $svgContent);
    
    $tempSvgPath = tempnam(sys_get_temp_dir(), 'cert_skin_') . '.svg';
    if (file_put_contents($tempSvgPath, $svgContent) === false) {
        throw new Exception('Failed to create temporary SVG file');
    }
    
    $pngPath = tempnam(sys_get_temp_dir(), 'cert_skin_') . '.png';
    $command = "rsvg-convert -o " . escapeshellarg($pngPath) . " " . escapeshellarg($tempSvgPath);
    exec($command, $output, $return_var);
    
    if ($return_var !== 0) {
        unlink($tempSvgPath);
        throw new Exception('Error converting SVG to PNG: ' . implode("\n", $output));
    }
    
    if (!file_exists($pngPath) || filesize($pngPath) === 0) {
        unlink($tempSvgPath);
        throw new Exception('PNG conversion failed - output file is empty or missing');
    }
    
    try {
        appendVerificationKeyToPng($pngPath, $originalKey, $certData);
    } catch (Exception $e) {
        error_log('Warning: Failed to embed verification key: ' . $e->getMessage());
    }
    
    if (defined('DISCORD_WEBHOOK_URL') && !empty(DISCORD_WEBHOOK_URL)) {
        
        
        sendDiscordNotification($certNumber, $username, $pngPath, $skinName, $percentage);
    }
    
    $filename = "cert_{$certNumber}_{$skinName}.png";
    header('Content-Type: image/png');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($pngPath));
    
    readfile($pngPath);
    
    unlink($tempSvgPath);
    unlink($pngPath);
    
    exit;
}

function createTextChunk($keyword, $text) {
    $data = $keyword . "\0" . $text;
    $length = pack('N', strlen($data));
    $chunkType = 'tEXt';
    $crc = pack('N', crc32($chunkType . $data));
    return $length . $chunkType . $data . $crc;
}

function appendVerificationKeyToPng($pngPath, $verificationKey, $certData) {
    $randomChars = $verificationKey;
    
    $certNumber = $certData['certificate_number'];
    $username = $certData['nickname'];
    $certNumberData = "CERT-" . str_pad($certNumber, 5, '0', STR_PAD_LEFT) . "-" . $username;
    $certBasedChars = base64_encode($certNumberData);
    $certBasedChars = str_pad($certBasedChars, 64, '=', STR_PAD_RIGHT);
    $certBasedChars = substr($certBasedChars, 0, 64);
    
    $creationDate = $certData['creationDate'];
    $timestamp = strtotime($creationDate);
    $dateTime = gmdate('Y-m-d H:i:s', $timestamp);
    $timeData = "CREATED-" . $dateTime;
    $timeBasedChars = base64_encode($timeData);
    $timeBasedChars = str_pad($timeBasedChars, 64, '=', STR_PAD_RIGHT);
    $timeBasedChars = substr($timeBasedChars, 0, 64);
    
    $verificationText = "-----BEGIN NOSKID KEY-----\n";
    $verificationText .= $randomChars . "\n";
    $verificationText .= $certBasedChars . "\n";
    $verificationText .= $timeBasedChars . "\n";
    $verificationText .= "-----END NOSKID KEY-----";

    $pngData = file_get_contents($pngPath);

    if (substr($pngData, 0, 8) !== "\x89PNG\x0D\x0A\x1A\x0A") {
        throw new Exception("Not a valid PNG file.");
    }

    $pos = 8;
    $chunks = [];

    while ($pos < strlen($pngData)) {
        if ($pos + 4 > strlen($pngData)) {
            break;
        }
        
        $length = unpack('N', substr($pngData, $pos, 4))[1];
        
        if ($pos + 8 > strlen($pngData)) {
            break;
        }
        
        $type = substr($pngData, $pos + 4, 4);
        
        if ($pos + 8 + $length > strlen($pngData)) {
            break;
        }
        
        $data = substr($pngData, $pos + 8, $length);
        $crc = substr($pngData, $pos + 8 + $length, 4);

        if ($type === 'IEND') {
            $textChunk = createTextChunk('noskid-key', $verificationText);
            $chunks[] = $textChunk;
        }

        $chunk = substr($pngData, $pos, 12 + $length);
        $chunks[] = $chunk;

        $pos += 12 + $length;
    }

    $newData = substr($pngData, 0, 8) . implode('', $chunks);
    
    if (file_put_contents($pngPath, $newData) === false) {
        throw new Exception("Failed to write PNG file with embedded key");
    }
}

function getCountryEmoji($countryCode) {
    if ($countryCode == 'XX' || strlen($countryCode) != 2) {
        return '❔';
    }

    $firstLetter = ord(strtoupper($countryCode[0])) - ord('A') + 0x1F1E6;
    $secondLetter = ord(strtoupper($countryCode[1])) - ord('A') + 0x1F1E6;

    $emoji = mb_convert_encoding('&#' . $firstLetter . ';&#' . $secondLetter . ';', 'UTF-8', 'HTML-ENTITIES');

    return $emoji;
}

function sendDiscordNotification($certNumber, $username, $pngPath, $skinName, $percentage) {
    $webhookUrl = DISCORD_WEBHOOK_URL;

    $message = [
        'content' => "New custom certificate generated!",
        'embeds' => [
            [
                'title' => 'Custom Certificate Details',
                'color' => 0xf9f7f0,
                'fields' => [
                    [
                        'name' => 'Certificate Number',
                        'value' => '#' . str_pad($certNumber, 5, '0', STR_PAD_LEFT),
                        'inline' => true
                    ],
                    [
                        'name' => 'User',
                        'value' => $username,
                        'inline' => true
                    ],
                    [
                        'name' => 'Skin Used',
                        'value' => $skinName,
                        'inline' => true
                    ],
                    [
                        'name' => 'Score',
                        'value' => $percentage . '%',
                        'inline' => true
                    ]
                ],
                'timestamp' => gmdate('c')
            ]
        ]
    ];

    $boundary = '----WebKitFormBoundary' . md5(microtime());

    $payload = '';
    $payload .= '--' . $boundary . "\r\n";
    $payload .= 'Content-Disposition: form-data; name="payload_json"' . "\r\n";
    $payload .= 'Content-Type: application/json' . "\r\n\r\n";
    $payload .= json_encode($message) . "\r\n";

    if (file_exists($pngPath)) {
        $fileContent = file_get_contents($pngPath);
        $filename = "cert_" . str_pad($certNumber, 5, '0', STR_PAD_LEFT) . "_" . $skinName . ".png";

        $payload .= '--' . $boundary . "\r\n";
        $payload .= 'Content-Disposition: form-data; name="file"; filename="' . $filename . '"' . "\r\n";
        $payload .= 'Content-Type: image/png' . "\r\n\r\n";
        $payload .= $fileContent . "\r\n";
    }

    $payload .= '--' . $boundary . '--';

    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: multipart/form-data; boundary=' . $boundary,
        'Content-Length: ' . strlen($payload)
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($error) {
        error_log('Discord webhook error: ' . $error);
    } elseif ($httpCode >= 400) {
        error_log('Discord webhook HTTP error: ' . $httpCode . ' - ' . $response);
    }
}
?>