import fs from 'fs';

const src = 'C:/Users/Administrator/.gemini/antigravity/brain/ceedd074-0f28-496c-b996-c7f463f6b833/media__1782713123673.png';
const dest = 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/public/verified-badge.png';

try {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied verified badge image to public directory!');
} catch (err) {
  console.error('Failed to copy image:', err.message);
}
