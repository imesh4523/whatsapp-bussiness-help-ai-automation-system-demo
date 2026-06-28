import db from './db.js';

/**
 * Retrieves all configured Gemini API keys.
 * Deduplicates and returns an array of keys.
 */
export async function getGeminiKeys() {
  let keys = [];
  
  // 1. Check process.env
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }

  // 2. Fetch from database system_settings
  try {
    const dbKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    if (dbKeyRes.rows.length > 0 && dbKeyRes.rows[0].value) {
      const val = dbKeyRes.rows[0].value.trim();
      
      // Check if it is a JSON array string
      if (val.startsWith('[') && val.endsWith(']')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach(k => {
              if (k && typeof k === 'string' && k.trim()) {
                keys.push(k.trim());
              }
            });
          }
        } catch (e) {
          keys.push(val);
        }
      } else {
        keys.push(val);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Gemini API keys from db:', err.message);
  }

  // Deduplicate and filter empty
  keys = [...new Set(keys)].filter(Boolean);
  return keys;
}

/**
 * Rotates through Gemini keys and calls the official REST API.
 * If all keys fail, throws an error.
 */
export async function callGeminiAPI(endpointModel, payload) {
  const keys = await getGeminiKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys are configured.');
  }

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // Strip model if the endpoint has double model path prefix
    const url = `https://generativelanguage.googleapis.com/v1/models/${endpointModel}:generateContent?key=${key}`;
    try {
      console.log(`Attempting Gemini API request with Key #${i + 1}/${keys.length}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      const errText = await response.text();
      console.warn(`Gemini Key #${i + 1} returned status ${response.status}: ${errText}`);
      lastError = new Error(`Gemini API key #${i + 1} failed (${response.status}): ${errText}`);
    } catch (err) {
      console.warn(`Gemini Key #${i + 1} connection error:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini API keys failed.');
}
