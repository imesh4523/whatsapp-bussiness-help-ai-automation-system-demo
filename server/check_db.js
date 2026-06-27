import fs from 'fs';
const content = fs.readFileSync('c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/server/index.js', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('getDynamicStripe')) {
    console.log(i + 1, ':', l.trim());
    console.log(lines.slice(i - 1, i + 10).join('\n'));
  }
});
process.exit(0);
