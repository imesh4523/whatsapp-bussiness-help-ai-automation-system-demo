import db from './db.js';
import crypto from 'crypto';

const saTokenCache = {}; // key: client_email -> { token, expiresAt }

async function getSAToken(sa) {
  const cached = saTokenCache[sa.client_email];
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt > now + 60) {
    return cached.token;
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64url = (strOrBuf) => {
    const buf = Buffer.isBuffer(strOrBuf) ? strOrBuf : Buffer.from(strOrBuf);
    return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedPayload}`);
  const signature = sign.sign(sa.private_key);
  const encodedSignature = base64url(signature);

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  }

  const token = data.access_token;
  if (!token) {
    throw new Error(`OAuth server response did not include access_token: ${JSON.stringify(data)}`);
  }

  saTokenCache[sa.client_email] = {
    token,
    expiresAt: now + (data.expires_in || 3600)
  };
  return token;
}

/**
 * Retrieves all configured Gemini API keys or service accounts.
 * Deduplicates and returns an array of keys/credentials.
 */
export async function getGeminiKeys() {
  let rawKeys = [];
  
  // 1. Check process.env
  if (process.env.GEMINI_API_KEY) {
    rawKeys.push(process.env.GEMINI_API_KEY.trim());
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
                rawKeys.push(k.trim());
              }
            });
          }
        } catch (e) {
          rawKeys.push(val);
        }
      } else {
        rawKeys.push(val);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Gemini API keys from db:', err.message);
  }

  // Deduplicate and filter empty
  rawKeys = [...new Set(rawKeys)].filter(Boolean);

  const keys = [];
  for (const raw of rawKeys) {
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
          keys.push(parsed);
          continue;
        }
      } catch (e) {
        // Fallback to plain string key
      }
    }
    keys.push(raw);
  }
  return keys;
}

/**
 * Rotates through Gemini keys/service accounts and calls the official REST API.
 * If all fail, throws an error.
 */
export async function callGeminiAPI(endpointModel, payload) {
  const keys = await getGeminiKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys or service accounts are configured.');
  }

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const keyItem = keys[i];
    const isServiceAccount = typeof keyItem === 'object' && keyItem !== null;

    try {
      let url;
      let headers = {
        'Content-Type': 'application/json'
      };

      if (isServiceAccount) {
        console.log(`Attempting Gemini API request using Service Account #${i + 1}/${keys.length} (${keyItem.client_email}) via Vertex AI...`);
        const token = await getSAToken(keyItem);
        const projectId = keyItem.project_id || 'ai-support-501313';
        const region = 'us-central1';
        
        let vertexModel = endpointModel;
        if (vertexModel.includes('1.5') || vertexModel.includes('2.0') || vertexModel.includes('3.5') || vertexModel.includes('3.1')) {
          if (vertexModel.includes('lite')) {
            vertexModel = 'gemini-2.5-flash-lite';
          } else {
            vertexModel = 'gemini-2.5-flash';
          }
        }
        
        url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${vertexModel}:generateContent`;
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log(`Attempting Gemini API request with Key #${i + 1}/${keys.length}...`);
        url = `https://generativelanguage.googleapis.com/v1beta/models/${endpointModel}:generateContent?key=${keyItem}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      const errText = await response.text();
      const identifier = isServiceAccount ? keyItem.client_email : `Key #${i + 1}`;
      console.warn(`Gemini API with ${identifier} returned status ${response.status}: ${errText}`);
      lastError = new Error(`Gemini API with ${identifier} failed (${response.status}): ${errText}`);
    } catch (err) {
      const identifier = isServiceAccount ? keyItem.client_email : `Key #${i + 1}`;
      console.warn(`Gemini API with ${identifier} connection error:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini API keys and service accounts failed.');
}
