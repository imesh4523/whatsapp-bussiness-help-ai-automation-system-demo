import fs from 'fs';
const data = JSON.parse(fs.readFileSync('c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/src/data/dashboardPages.json', 'utf8'));
const body = data.subscription_index.body;
const idx = body.indexOf('plan_recurring');
console.log(body.substring(idx - 200, idx + 400));
