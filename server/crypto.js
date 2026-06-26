import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure we have a valid 32-byte key derived from ENCRYPTION_KEY
const encSecret = process.env.ENCRYPTION_KEY || 'default_super_secret_whatsray_key_2026';
const key = crypto.createHash('sha256').update(encSecret).digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is standard for GCM

export function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv_hex:auth_tag_hex:encrypted_hex
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format. Expected 3 parts.');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}
