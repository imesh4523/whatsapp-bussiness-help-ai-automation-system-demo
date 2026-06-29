import fs from 'fs';
const data = JSON.parse(fs.readFileSync('c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/src/data/dashboardPages.json', 'utf8'));

for (const key of Object.keys(data)) {
  const body = data[key].body;
  if (body && body.includes('plan_recurring')) {
    console.log(`Key "${key}" contains plan_recurring.`);
    
    // Find index of plan_recurring
    let idx = body.indexOf('plan_recurring');
    while (idx !== -1) {
      console.log(`  Occurrence at index ${idx}:`);
      console.log('  ' + body.substring(idx - 150, idx + 400));
      idx = body.indexOf('plan_recurring', idx + 1);
    }
  }
}
