<?php
require 'backend/services/category-service/vendor/autoload.php';
$app = require_once 'backend/services/category-service/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();
$m = App\Models\CategoryMaster::where('code', 'PRODUK')->first();
if (!$m) {
    echo "Master PRODUK not found\n";
    exit;
}
$cats = App\Models\Category::where('master_id', $m->id)->with('subcategories')->get();
foreach ($cats as $c) {
    echo $c->name . " (" . $c->subcategories->count() . " subs)\n";
    foreach ($c->subcategories as $s) {
        echo "  - " . $s->name . "\n";
    }
}
