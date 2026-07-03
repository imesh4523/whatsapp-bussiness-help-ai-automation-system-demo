import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import db from './db.js';

let backupTimer = null;

// Base64url encoding helper for JWT
function base64url(stringOrBuffer) {
  const buf = Buffer.isBuffer(stringOrBuffer) ? stringOrBuffer : Buffer.from(stringOrBuffer);
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Generate Google API OAuth token using Service Account JSON
async function getDriveAccessToken(saJsonString) {
  const sa = JSON.parse(saJsonString);
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
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
    throw new Error(`Google OAuth failure: ${data.error_description || data.error || JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Send telegram bot notifications
async function sendTelegramAlert(token, chatId, message) {
  if (!token || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Failed to send Telegram backup alert:', err.message);
  }
}

// Generate portable SQL backup text from PostgreSQL Database
export async function generateSqlDump() {
  console.log('Generating database SQL dump...');
  let dump = `-- PostgreSQL Database Backup\n-- Generated At: ${new Date().toISOString()}\n\n`;

  // Get public tables
  const tablesRes = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
  );
  const tableNames = tablesRes.rows.map(r => r.table_name);

  for (const tableName of tableNames) {
    // Skip backup_logs to avoid dumping the backup logs history inside the backup itself
    if (tableName === 'backup_logs') continue;

    dump += `\n-- Table: ${tableName}\n`;
    dump += `DROP TABLE IF EXISTS ${tableName} CASCADE;\n`;

    // Fetch column metadata to construct CREATE TABLE statement
    const colsRes = await db.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position`,
      [tableName]
    );

    const colsSql = colsRes.rows.map(col => {
      let def = `${col.column_name} ${col.data_type.toUpperCase()}`;
      if (col.is_nullable === 'NO') def += ' NOT NULL';
      if (col.column_default && !col.column_default.includes('nextval')) {
        def += ` DEFAULT ${col.column_default}`;
      }
      return def;
    });

    dump += `CREATE TABLE ${tableName} (\n  ${colsSql.join(',\n  ')}\n);\n\n`;

    // Fetch all rows
    const dataRes = await db.query(`SELECT * FROM ${tableName}`);
    if (dataRes.rows.length > 0) {
      dump += `-- Data for ${tableName}\n`;
      for (const row of dataRes.rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return val;
        });

        dump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
    }
  }

  return dump;
}

// Upload backup file buffer to Google Drive Target Folder
async function uploadToGoogleDrive(token, folderId, fileName, fileBuffer) {
  console.log(`Uploading ${fileName} to Google Drive folder ${folderId}...`);
  const metadata = {
    name: fileName,
    parents: [folderId]
  };

  const boundary = 'xx_backup_boundary_xx';
  
  // Construct RFC 2387 Multipart body
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
  const mediaHeader = 'Content-Type: application/gzip\r\n\r\n';

  const payload = Buffer.concat([
    Buffer.from(delimiter + metadataPart + delimiter + mediaHeader),
    fileBuffer,
    Buffer.from(closeDelimiter)
  ]);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': payload.length.toString()
    },
    body: payload
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google Drive upload failed: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data.id;
}

// Clear backups older than retention policy
async function cleanOldBackups(token, folderId, retentionDays) {
  if (!retentionDays || retentionDays <= 0) return;
  console.log(`Checking for Google Drive backups older than ${retentionDays} days...`);
  
  const q = `'${folderId}' in parents and name contains 'db_backup_' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const err = await res.json();
    console.error('Failed to list GDrive files for cleaning:', err);
    return;
  }

  const { files } = await res.json();
  if (!files || files.length === 0) return;

  const now = Date.now();
  const thresholdMs = retentionDays * 24 * 60 * 60 * 1000;

  for (const file of files) {
    const fileTime = new Date(file.createdTime).getTime();
    if (now - fileTime > thresholdMs) {
      console.log(`Deleting old backup: ${file.name} (${file.id})...`);
      const deleteUrl = `https://www.googleapis.com/drive/v3/files/${file.id}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  }
}

// Fetch backup configurations
export async function getBackupConfig() {
  const keys = [
    'backup_enabled',
    'backup_interval_hours',
    'backup_retention_days',
    'backup_gdrive_folder_id',
    'backup_telegram_token',
    'backup_telegram_chat_id'
  ];

  const res = await db.query(
    "SELECT key, value FROM system_settings WHERE key = ANY($1)",
    [keys]
  );

  const config = {
    enabled: false,
    intervalHours: 24,
    retentionDays: 7,
    folderId: '',
    telegramToken: '',
    telegramChatId: ''
  };

  for (const row of res.rows) {
    if (row.key === 'backup_enabled') config.enabled = row.value === 'true';
    if (row.key === 'backup_interval_hours') config.intervalHours = parseInt(row.value, 10) || 24;
    if (row.key === 'backup_retention_days') config.retentionDays = parseInt(row.value, 10) || 7;
    if (row.key === 'backup_gdrive_folder_id') config.folderId = row.value || '';
    if (row.key === 'backup_telegram_token') config.telegramToken = row.value || '';
    if (row.key === 'backup_telegram_chat_id') config.telegramChatId = row.value || '';
  }

  return config;
}

// Run single backup task flow
export async function runBackup() {
  const startTime = Date.now();
  let status = 'Success';
  let fileName = `db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`;
  let fileSizeBytes = 0;
  let logMessage = '';

  let config = null;
  let saJson = null;

  try {
    // 1. Fetch configs and credentials
    config = await getBackupConfig();
    
    const saQuery = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    if (saQuery.rows.length === 0) {
      throw new Error('Service Account credentials (gemini_api_key) not found in system settings.');
    }
    
    // Parse key array
    const keys = JSON.parse(saQuery.rows[0].value);
    saJson = typeof keys[0] === 'string' && keys[0].trim().startsWith('{') ? keys[0] : null;
    
    if (!saJson) {
      throw new Error('Valid Google Cloud Service Account credentials are required for Google Drive backup.');
    }

    if (!config.folderId) {
      throw new Error('Google Drive Target Folder ID is not configured.');
    }

    // 2. Generate SQL Dump and Gzip compress
    const sqlText = await generateSqlDump();
    const compressed = zlib.gzipSync(Buffer.from(sqlText, 'utf8'));
    fileSizeBytes = compressed.length;

    // 3. Connect to GDrive and upload
    const token = await getDriveAccessToken(saJson);
    const fileId = await uploadToGoogleDrive(token, config.folderId, fileName, compressed);

    // 4. Delete old backups
    await cleanOldBackups(token, config.folderId, config.retentionDays);

    logMessage = `Backup successfully generated and uploaded to Google Drive. File ID: ${fileId}`;
    console.log(`[BACKUP SUCCESS]: ${fileName} uploaded.`);

    // 5. Send Telegram Success Alert
    const sizeStr = (fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
    const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
    const tgMsg = `<b>✅ DATABASE BACKUP SUCCESSFUL</b>\n\n` +
                  `<b>File:</b> <code>${fileName}</code>\n` +
                  `<b>Size:</b> ${sizeStr}\n` +
                  `<b>Duration:</b> ${duration}\n` +
                  `<b>Destination Folder ID:</b> <code>${config.folderId}</code>`;
    await sendTelegramAlert(config.telegramToken, config.telegramChatId, tgMsg);

  } catch (err) {
    status = 'Failed';
    logMessage = err.message;
    console.error(`[BACKUP FAILURE]:`, err.message);

    // Send Telegram Failure Alert
    if (config) {
      const tgMsg = `<b>❌ DATABASE BACKUP FAILED</b>\n\n` +
                    `<b>Error:</b> <code>${err.message}</code>\n` +
                    `<b>Timestamp:</b> ${new Date().toISOString()}`;
      await sendTelegramAlert(config.telegramToken, config.telegramChatId, tgMsg);
    }
  }

  // 6. Record to backup logs
  const durationMs = Date.now() - startTime;
  const sizeStr = (fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
  try {
    await db.query(
      `INSERT INTO backup_logs (status, file_name, file_size, duration_ms, log_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [status, fileName, sizeStr, durationMs, logMessage]
    );
  } catch (dbErr) {
    console.error('Failed to log backup status in DB:', dbErr.message);
  }
}

// Schedule future backup intervals dynamically
export async function scheduleBackups() {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }

  try {
    const config = await getBackupConfig();
    if (!config.enabled) {
      console.log('Automated backups are currently disabled.');
      return;
    }

    // Get time of last successful backup
    const lastBackupQuery = await db.query(
      "SELECT timestamp FROM backup_logs WHERE status = 'Success' ORDER BY timestamp DESC LIMIT 1"
    );

    const intervalMs = config.intervalHours * 60 * 60 * 1000;
    let nextDelay = intervalMs;

    if (lastBackupQuery.rows.length > 0) {
      const lastBackupTime = new Date(lastBackupQuery.rows[0].timestamp).getTime();
      const timeSinceLast = Date.now() - lastBackupTime;
      nextDelay = Math.max(0, intervalMs - timeSinceLast);
    }

    console.log(`Next automated backup scheduled in ${(nextDelay / (60 * 1000)).toFixed(2)} minutes.`);

    backupTimer = setTimeout(async () => {
      await runBackup();
      scheduleBackups(); // reschedule next run
    }, nextDelay);

  } catch (err) {
    console.error('Failed to schedule automated backups:', err.message);
  }
}
