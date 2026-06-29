import fs from 'fs';
const log = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/ceedd074-0f28-496c-b996-c7f463f6b833/.system_generated/tasks/task-3767.log', 'utf8');
const lines = log.split('\n');
console.log('Filtered server logs (actual API logs):');
for (const line of lines) {
  const clean = line.trim();
  if (!clean) continue;
  if (clean.includes('PostgreSQL connection') || clean.includes('subscription renewal') || clean.includes('Warning:')) {
    continue;
  }
  console.log(line);
}
