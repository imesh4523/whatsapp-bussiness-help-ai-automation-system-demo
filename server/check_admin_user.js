import fs from 'fs';
const content = fs.readFileSync('c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/src/pages/AdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('handleDeleteUserCard')) {
    console.log(i + 1, ':', l.trim());
  }
});
process.exit(0);
