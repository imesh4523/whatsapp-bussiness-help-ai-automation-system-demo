import db from './db.js';

// Helper to log audit events
async function logAuditEvent(action, details) {
  try {
    await db.query(
      "INSERT INTO audit_logs (action, details) VALUES ($1, $2)",
      [action, details]
    );
  } catch (err) {
    console.error('[Rotator] Failed to log audit event:', err.message);
  }
}

/**
 * Resets daily email count to 0 for keys where 24 hours have elapsed since last_reset_time.
 */
export async function resetExpiredLimits() {
  try {
    const expiredRes = await db.query(
      "SELECT id, label FROM resend_api_keys WHERE last_reset_time < NOW() - INTERVAL '24 hours'"
    );
    for (const row of expiredRes.rows) {
      await db.query(
        "UPDATE resend_api_keys SET daily_sent_count = 0, last_reset_time = CURRENT_TIMESTAMP, status = 'Active' WHERE id = $1",
        [row.id]
      );
      console.log(`[Resend Rotator] Daily sent limit reset to 0 for key: ${row.label || row.id}`);
    }
  } catch (err) {
    console.error('[Resend Rotator] Error resetting expired limits:', err.message);
  }
}

/**
 * Perform domain and Cloudflare DNS configuration transition from old Resend account to new Resend account.
 */
async function transitionDomainAndDns(oldApiKey, newApiKey, nextKeyObj, domain, zoneId, cfToken) {
  const newResendHeaders = {
    "Authorization": `Bearer ${newApiKey}`,
    "Content-Type": "application/json"
  };

  // 1. Delete domain from the old Resend account to prevent conflict
  if (oldApiKey) {
    try {
      const oldResendHeaders = {
        "Authorization": `Bearer ${oldApiKey}`,
        "Content-Type": "application/json"
      };
      const listRes = await fetch("https://api.resend.com/domains", { headers: oldResendHeaders });
      if (listRes.ok) {
        const listData = await listRes.json();
        const oldDomain = (listData?.data || []).find(d => d.name === domain);
        if (oldDomain) {
          await fetch(`https://api.resend.com/domains/${oldDomain.id}`, {
            method: 'DELETE',
            headers: oldResendHeaders
          });
          console.log(`[Resend Rotator] Successfully deleted domain ${domain} from old Resend account.`);
        }
      }
    } catch (e) {
      console.warn(`[Resend Rotator] Warning: Failed to clean up domain on old Resend account:`, e.message);
    }
  }

  // 2. Add domain to the new Resend account
  console.log(`[Resend Rotator] Adding domain "${domain}" to new Resend account...`);
  const createRes = await fetch("https://api.resend.com/domains", {
    method: "POST",
    headers: newResendHeaders,
    body: JSON.stringify({ name: domain })
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    await db.query(
      "UPDATE resend_api_keys SET status = 'Error', error_message = $1 WHERE id = $2",
      [createData.message || 'Failed to add domain to new Resend account.', nextKeyObj.id]
    );
    throw new Error(`Resend domain creation failed: ${createData.message || JSON.stringify(createData)}`);
  }
  const newDomainId = createData.id;
  const dnsRecordsFromResend = createData.records || [];
  console.log(`[Resend Rotator] Domain added to new Resend (id: ${newDomainId})`);

  // Update new Resend Domain ID in database
  await db.query(
    "UPDATE resend_api_keys SET resend_domain_id = $1, error_message = NULL WHERE id = $2",
    [newDomainId, nextKeyObj.id]
  );

  // 3. Update Cloudflare DNS Records
  console.log(`[Resend Rotator] Updating Cloudflare DNS records for Zone ${zoneId}...`);
  const cfHeaders = {
    "Authorization": `Bearer ${cfToken}`,
    "Content-Type": "application/json"
  };

  const existingCfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`, {
    headers: cfHeaders
  });
  const existingCfData = await existingCfRes.json();
  if (!existingCfRes.ok) {
    throw new Error(`Cloudflare API error fetching existing records: ${existingCfData?.errors?.[0]?.message}`);
  }
  const existingRecords = existingCfData?.result || [];

  // Helper to add/replace Cloudflare records
  const addCfRecord = async (type, name, content, priority) => {
    const fullName = name === '@' ? domain : `${name}.${domain}`;
    const targetName = fullName.toLowerCase();

    // Find conflicting (same type and name but different values)
    const conflicting = existingRecords.filter(r => 
      r.type.toUpperCase() === type.toUpperCase() && 
      r.name.toLowerCase() === targetName
    );

    if (conflicting.length > 0) {
      for (const conf of conflicting) {
        if (conf.content.trim() === content.trim() && (priority === undefined || conf.priority === priority)) {
          // Record already exists with exact same value - skip
          return;
        }
        // Delete conflicting record
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${conf.id}`, {
          method: 'DELETE',
          headers: cfHeaders
        });
      }
    }

    const body = { type, name: fullName, content, ttl: 1 };
    if (priority !== undefined) body.priority = priority;

    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (!r.ok) {
      console.error(`[Resend Rotator] Failed to add DNS record ${type} "${fullName}":`, d?.errors?.[0]?.message);
    }
  };

  // Add all DNS records returned by new Resend config
  for (const rec of dnsRecordsFromResend) {
    const recType = (rec.type || 'TXT').toUpperCase();
    let recName = rec.name || '@';
    if (recName.toLowerCase().endsWith('.' + domain.toLowerCase())) {
      recName = recName.slice(0, -(domain.length + 1));
    } else if (recName.toLowerCase() === domain.toLowerCase()) {
      recName = '@';
    }
    await addCfRecord(recType, recName, rec.value || rec.content || '', rec.priority);
  }

  // Ensure SPF and DMARC exist
  const hasSPF = existingRecords.some(r => r.type === 'TXT' && r.name.toLowerCase() === domain.toLowerCase() && r.content.includes('v=spf1'));
  if (!hasSPF) {
    await addCfRecord('TXT', '@', 'v=spf1 include:amazonses.com ~all');
  }
  await addCfRecord('TXT', '_dmarc', `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; adkim=r; aspf=r`);

  // 4. Trigger Resend Verification
  console.log(`[Resend Rotator] Triggering verification on new Resend account...`);
  await fetch(`https://api.resend.com/domains/${newDomainId}/verify`, {
    method: 'POST',
    headers: newResendHeaders
  });

  // 5. Update main system settings with new key
  await db.query(
    "INSERT INTO system_settings (key, value) VALUES ('resend_api_key', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
    [newApiKey]
  );
}

/**
 * Automates rotation to the next active Resend key.
 */
export async function rotateResendKey(oldApiKey, reason) {
  console.log(`[Resend Rotator] Initiating key rotation due to: ${reason}`);
  try {
    // Check and reset expired limits
    await resetExpiredLimits();

    // Mark old key status accordingly in db
    if (oldApiKey) {
      const statusToSet = (reason.includes('limit') || reason.includes('422') || reason.includes('100') || reason.includes('rate_limit')) ? 'LimitReached' : 'Error';
      await db.query(
        "UPDATE resend_api_keys SET status = $1, error_message = $2 WHERE api_key = $3",
        [statusToSet, reason, oldApiKey]
      );
    }

    // Fetch domain and Cloudflare configs
    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const cfZoneQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_zone_id'");
    const cfTokenQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_api_token'");

    const domain = domainQuery.rows[0]?.value?.trim().toLowerCase();
    const zoneId = cfZoneQuery.rows[0]?.value?.trim();
    const cfToken = cfTokenQuery.rows[0]?.value?.trim();

    if (!domain || !zoneId || !cfToken) {
      throw new Error("Domain name, Cloudflare Zone ID, or Cloudflare API Token is missing from settings.");
    }

    // Find the next available active key
    const nextKeyRes = await db.query(
      "SELECT * FROM resend_api_keys WHERE status = 'Active' AND daily_sent_count < 100 AND api_key != $1 ORDER BY id ASC LIMIT 1",
      [oldApiKey || '']
    );

    if (nextKeyRes.rows.length === 0) {
      throw new Error("No other active Resend API keys found with remaining daily limits.");
    }

    const nextKey = nextKeyRes.rows[0];
    
    // Transition domain configuration to new key
    await transitionDomainAndDns(oldApiKey, nextKey.api_key, nextKey, domain, zoneId, cfToken);

    await logAuditEvent(
      'Resend Key Rotated',
      `Automatically rotated Resend key to "${nextKey.label || nextKey.id}" because: ${reason}`
    );

    console.log(`[Resend Rotator] Rotation successful. Active key is now: ${nextKey.label || nextKey.id}`);
    return nextKey.api_key;
  } catch (err) {
    console.error(`[Resend Rotator] Automatic key rotation failed:`, err.message);
    await logAuditEvent('Resend Key Rotation Error', `Rotation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Manually activates a specific key by id.
 */
export async function manuallyActivateKey(keyId) {
  console.log(`[Resend Rotator] Manually activating key ID: ${keyId}`);
  try {
    const keyRes = await db.query("SELECT * FROM resend_api_keys WHERE id = $1", [keyId]);
    if (keyRes.rows.length === 0) throw new Error("Key not found.");

    const targetKey = keyRes.rows[0];

    // Fetch current key from system_settings to clean up
    const currentKeyQuery = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");
    const currentApiKey = currentKeyQuery.rows[0]?.value;

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const cfZoneQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_zone_id'");
    const cfTokenQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_api_token'");

    const domain = domainQuery.rows[0]?.value?.trim().toLowerCase();
    const zoneId = cfZoneQuery.rows[0]?.value?.trim();
    const cfToken = cfTokenQuery.rows[0]?.value?.trim();

    if (!domain || !zoneId || !cfToken) {
      throw new Error("Ensure domain and Cloudflare DNS settings are saved before manual activation.");
    }

    // Reset status back to active if manually clicked
    await db.query("UPDATE resend_api_keys SET status = 'Active', error_message = NULL WHERE id = $1", [keyId]);

    // Transition domain configuration to target key
    await transitionDomainAndDns(currentApiKey, targetKey.api_key, targetKey, domain, zoneId, cfToken);

    await logAuditEvent(
      'Resend Key Activated Manually',
      `Admin manually activated Resend API Key: "${targetKey.label || targetKey.id}"`
    );

    return targetKey;
  } catch (err) {
    console.error(`[Resend Rotator] Manual activation failed:`, err.message);
    await db.query("UPDATE resend_api_keys SET status = 'Error', error_message = $1 WHERE id = $2", [err.message, keyId]);
    await logAuditEvent('Resend Key Manual Activation Error', `Manual activation failed for key ID ${keyId}: ${err.message}`);
    throw err;
  }
}
