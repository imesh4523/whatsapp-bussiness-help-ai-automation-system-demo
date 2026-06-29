import db from './db.js';

/**
 * Retrieves the OpenRouter API key from DB or env.
 */
export async function getOpenRouterKey() {
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY.trim();
  }
  try {
    const res = await db.query("SELECT value FROM system_settings WHERE key = 'openrouter_api_key'");
    if (res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value.trim();
    }
  } catch (err) {
    console.warn('Failed to fetch OpenRouter API key from db:', err.message);
  }
  return null;
}

/**
 * Get the selected OpenRouter model from DB.
 */
export async function getOpenRouterModel() {
  try {
    const res = await db.query("SELECT value FROM system_settings WHERE key = 'openrouter_model'");
    if (res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value.trim();
    }
  } catch (err) {
    console.warn('Failed to fetch OpenRouter model from db:', err.message);
  }
  return 'google/gemini-2.0-flash-exp:free';
}

/**
 * Get the selected AI provider from DB. Returns 'gemini' or 'openrouter'
 */
export async function getAIProvider() {
  try {
    const res = await db.query("SELECT value FROM system_settings WHERE key = 'ai_provider'");
    if (res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value.trim();
    }
  } catch (err) {
    console.warn('Failed to fetch AI provider from db:', err.message);
  }
  return 'gemini';
}

/**
 * Call OpenRouter API with OpenAI-compatible format.
 */
export async function callOpenRouterAPI(model, messages, options = {}) {
  const key = await getOpenRouterKey();
  if (!key) {
    throw new Error('No OpenRouter API key is configured. Please add it in the Admin Dashboard.');
  }

  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.max_tokens ?? 500
  };

  console.log(`Calling OpenRouter API with model: ${model}`);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://agentbunny.com',
      'X-Title': 'AgentBunny WhatsApp AI'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from OpenRouter.');
  }
  return {
    text: text.trim(),
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}
