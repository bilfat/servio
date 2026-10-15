import { execSync } from 'child_process';

const count = execSync('php artisan tinker --execute="echo App\\Models\\User::count();"', {
  cwd: 'D:/website latihan/servio_web_13/backend/services/identity-service',
  encoding: 'utf-8',
});
console.log('User count from tinker:', count.trim());
