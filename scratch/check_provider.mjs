import { execSync } from 'child_process';

const code = `$p = App\\Models\\User::where('email', 'provider@servio.id')->first(); echo 'status: ' . $p->status . ', pass: ' . (Illuminate\\Support\\Facades\\Hash::check('12345678', $p->password_hash) ? 'VALID' : 'INVALID');`;
const cmd = `php artisan tinker --execute="${code.replace(/"/g, '\\"')}"`;
console.log(execSync(cmd, { cwd: 'backend/services/identity-service', encoding: 'utf-8' }));
