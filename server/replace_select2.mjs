import fs from 'fs';

const filePath = 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/src/data/dashboardPages.json';
let content = fs.readFileSync(filePath, 'utf8');

// Target string containing select2 classes and the dummy span overlay
const target = `<select class=\\"form--control select2 select2-hidden-accessible\\" data-minimum-results-for-search=\\"-1\\" name=\\"plan_recurring\\" required=\\"\\" id=\\"plan_recurring\\" data-select2-id=\\"select2-data-plan_recurring\\" tabindex=\\"-1\\" aria-hidden=\\"true\\">\\n                            <option value=\\"\\" disabled=\\"\\">Select Recurring Type</option>\\n                            <option value=\\"1\\" selected=\\"\\" data-select2-id=\\"select2-data-4-f8uf\\">Monthly</option>\\n                            <option value=\\"2\\">Yearly</option>\\n                        </select><span class=\\"select2 select2-container select2-container--default\\" dir=\\"ltr\\" data-select2-id=\\\"select2-data-3-6trx\\" style=\\"width: auto;\\"><span class=\\"selection\\"><span class=\\"select2-selection select2-selection--single\\" role=\\"combobox\\" aria-haspopup=\\"true\\" aria-expanded=\\"false\\" tabindex=\\"0\\" aria-disabled=\\"false\\" aria-labelledby=\\"select2-plan_recurring-container\\"><span class=\\"select2-selection__rendered\\" id=\\"select2-plan_recurring-container\\" role=\\"textbox\\" aria-readonly=\\"true\\" title=\\"Monthly\\">Monthly</span><span class=\\"select2-selection__arrow\\" role=\\"presentation\\"><b role=\\"presentation\\"></b></span></span></span><span class=\\"dropdown-wrapper\\" aria-hidden=\\"true\\"></span></span>`;

// Simple clean browser select element
const replacement = `<select class=\\"form--control\\" name=\\"plan_recurring\\" required=\\"\\" id=\\"plan_recurring\\">\\n                            <option value=\\"1\\" selected=\\"\\">Monthly</option>\\n                            <option value=\\"2\\">Yearly</option>\\n                        </select>`;

if (content.includes('plan_recurring')) {
  console.log('File contains plan_recurring');
  
  // Let's do a substring locate to make sure we match it precisely regardless of minor backslash variations
  const startIdx = content.indexOf('<select class=\\"form--control select2 select2-hidden-accessible\\"');
  const endMarker = '</span></span></span><span class=\\"dropdown-wrapper\\" aria-hidden=\\"true\\"></span></span>';
  const endIdx = content.indexOf(endMarker, startIdx);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const fullMatch = content.substring(startIdx, endIdx + endMarker.length);
    console.log('Matched string of length:', fullMatch.length);
    content = content.replace(fullMatch, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced select2 dropdown with clean native select dropdown!');
  } else {
    console.log('Unable to locate precise index for substring match.');
  }
} else {
  console.log('plan_recurring not found in file!');
}
