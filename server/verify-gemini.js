import { callGeminiAPI } from './gemini-client.js';
import dotenv from 'dotenv';
dotenv.config();


async function testGemini() {
  console.log('--- TESTING GEMINI API CONNECTIVITY (gemini-2.0-flash) ---');
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Hello! Respond with "Gemini is online and working!" only.' }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: 'You are a helpful assistant.' }
      ]
    }
  };

  try {
    const data = await callGeminiAPI('gemini-3.5-flash', payload);
    console.log('API Response data:', JSON.stringify(data, null, 2));
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Extracted text:', text);
    console.log('--- TEST COMPLETED ---');
  } catch (err) {
    console.error('Gemini test call failed:', err.message);
  }
  process.exit(0);
}

testGemini();
