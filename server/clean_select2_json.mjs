import fs from 'fs';

const filePath = 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/src/data/dashboardPages.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let body = data.subscription_index.body;

// Locate the select2 element inside the purchase preview modal
const selectStart = body.indexOf('<select class="form--control select2 select2-hidden-accessible"');
// The ending tag of the select2 container span is followed by </div>
const spanEndMarker = '</span></span></div>';
const selectEnd = body.indexOf(spanEndMarker, selectStart);

if (selectStart !== -1 && selectEnd !== -1) {
  const fullMatch = body.substring(selectStart, selectEnd + spanEndMarker.length);
  console.log('Found full match:');
  console.log(fullMatch);
  
  const replacement = `<select class="form--control" name="plan_recurring" required="" id="plan_recurring" style="display: block !important; width: 100%; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; background: #ffffff; color: #1e293b; font-size: 14px; appearance: auto; cursor: pointer;">
                            <option value="1">Monthly</option>
                            <option value="2">Yearly</option>
                        </select></div>`;
                        
  data.subscription_index.body = body.replace(fullMatch, replacement);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Replaced select2 successfully with a clean custom styled select dropdown!');
} else {
  console.log('Failed to find start or end index.');
}
