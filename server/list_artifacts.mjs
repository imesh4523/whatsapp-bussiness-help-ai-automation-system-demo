import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/Administrator/.gemini/antigravity/brain/ceedd074-0f28-496c-b996-c7f463f6b833';
const files = fs.readdirSync(dir);

console.log('Images in artifact dir:');
for (const file of files) {
  if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    const stats = fs.statSync(path.join(dir, file));
    console.log(`- ${file} (${stats.size} bytes), created at ${stats.birthtime}`);
  }
}
