import fs from 'fs';

const content = fs.readFileSync('src/app/(executive)/ceo/internal-team/page.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('password') || line.toLowerCase().includes('sandi') || line.toLowerCase().includes('belum dibuat') || line.toLowerCase().includes('salin')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
