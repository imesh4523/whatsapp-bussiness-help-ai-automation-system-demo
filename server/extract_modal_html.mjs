import fs from 'fs';
const data = JSON.parse(fs.readFileSync('c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/src/data/dashboardPages.json', 'utf8'));
const body = data.subscription_index.body;

// Find the index of "Select Recurring Type"
const idx = body.indexOf('Select Recurring Type');
if (idx !== -1) {
  console.log('--- FOUND PART OF THE MODAL ---');
  console.log(body.substring(idx - 500, idx + 1500));
} else {
  console.log('Not found');
}
