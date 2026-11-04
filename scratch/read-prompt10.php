<?php
$f = fopen("C:/Users/ASUS/.gemini/antigravity/brain/df5d3b06-4c62-4715-aee5-c15000e35ca9/.system_generated/logs/transcript_full.jsonl", "r");
while ($line = fgets($f)) {
    $obj = json_decode($line, true);
    if (isset($obj['step_index']) && $obj['step_index'] === 17168) {
        file_put_contents("C:/Users/ASUS/.gemini/antigravity/brain/df5d3b06-4c62-4715-aee5-c15000e35ca9/prompt_rekap.txt", $obj['content']);
        echo "Found and saved prompt_rekap.txt\n";
        break;
    }
}
fclose($f);

