import fs from 'fs';
const log = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/ceedd074-0f28-496c-b996-c7f463f6b833/.system_generated/tasks/task-3767.log', 'utf8');
const lines = log.split('\n');
console.log('Last 80 lines of server log:');
console.log(lines.slice(-80).join('\n'));
