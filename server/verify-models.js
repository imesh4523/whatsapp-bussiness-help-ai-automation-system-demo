import { getGeminiKeys } from './gemini-client.js';

async function listModels() {
  console.log('--- DIAGNOSTIC: LISTING AVAILABLE GEMINI MODELS ---');
  try {
    const keys = await getGeminiKeys();
    if (keys.length === 0) {
      console.log('No Gemini keys configured.');
      process.exit(0);
    }
    const key = keys[0];
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log('Supported Models:');
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      const txt = await response.text();
      console.error(`Failed to list models (Status ${response.status}):`, txt);
    }
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
  process.exit(0);
}

listModels();
