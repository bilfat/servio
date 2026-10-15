import { execSync } from 'child_process';

const code = `
$user = App\\Models\\User::where('email', 'provider@servio.id')->first();
$controller = app(App\\Http\\Controllers\\Api\\AuthController::class);
$ctx = $controller->buildUserContext($user);
echo json_encode([
  'activeRole' => $ctx['activeRole'] ?? null,
  'active_context' => $ctx['active_context'] ?? null,
  'roles' => $ctx['roles'] ?? null,
  'activeOrganization' => $ctx['activeOrganization'] ?? null,
]);
`;
const cmd = `php artisan tinker --execute="${code.replace(/"/g, '\\"')}"`;
console.log(execSync(cmd, { cwd: 'backend/services/identity-service', encoding: 'utf-8' }));
