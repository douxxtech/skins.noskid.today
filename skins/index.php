<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $currentDir = __DIR__;
    
    $previewDir = dirname(__DIR__) . '/preview';
    
    $svgFiles = [];
    $pngFiles = [];
    $matchedFiles = [];
    
    if (!is_dir($currentDir) || !is_readable($currentDir)) {
        throw new Exception('Current directory is not accessible');
    }
    if (!is_dir($previewDir) || !is_readable($previewDir)) {
        throw new Exception('Preview directory is not accessible');
    }
    
    $svgGlob = glob($currentDir . '/*.svg');
    if ($svgGlob !== false) {
        foreach ($svgGlob as $svgFile) {
            if (is_file($svgFile)) {
                $fileName = pathinfo($svgFile, PATHINFO_FILENAME);
                $svgFiles[$fileName] = $svgFile;
            }
        }
    }
    
    $pngGlob = glob($previewDir . '/*.png');
    if ($pngGlob !== false) {
        foreach ($pngGlob as $pngFile) {
            if (is_file($pngFile)) {
                $fileName = pathinfo($pngFile, PATHINFO_FILENAME);
                $pngFiles[$fileName] = $pngFile;
            }
        }
    }
    
    foreach ($svgFiles as $baseName => $svgPath) {
        if (isset($pngFiles[$baseName])) {
            $matchedFiles[] = $baseName;
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'skins' => $matchedFiles,
            'total_skins' => count($matchedFiles)
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>