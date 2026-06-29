import fs from 'fs';
const log = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/ceedd074-0f28-496c-b996-c7f463f6b833/.system_generated/tasks/task-3767.log', 'utf8');
const lines = log.split('\n');
console.log('Searching log for save or error:');
for (const line of lines) {
  if (line.includes('save') || line.includes('error') || line.includes('Declined') || line.includes('fail') || line.includes('379')) {
    console.log(line);
  }
}
