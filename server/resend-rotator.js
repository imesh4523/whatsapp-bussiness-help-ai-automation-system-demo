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
 * Registers a specific subdomain on Resend and automates Cloudflare DNS record creation.
 */
export async function provisionSubdomainAndDns(keyId, customSubdomain, senderName) {
  console.log(`[Resend Rotator] Provisioning subdomain & DNS for key ID: ${keyId}`);
  try {
    const keyRes = await db.query("SELECT * FROM resend_api_keys WHERE id = $1", [keyId]);
    if (keyRes.rows.length === 0) throw new Error("Key not found.");
    const targetKey = keyRes.rows[0];

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const cfZoneQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_zone_id'");
    const cfTokenQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_api_token'");

    const domain = domainQuery.rows[0]?.value?.trim().toLowerCase();
    const zoneId = cfZoneQuery.rows[0]?.value?.trim();
    const cfToken = cfTokenQuery.rows[0]?.value?.trim();

    if (!domain || !zoneId || !cfToken) {
      throw new Error("Ensure domain, Cloudflare Zone ID, and Cloudflare API Token are configured in settings.");
    }

    // Determine subdomain name
    let fullSubdomain = customSubdomain?.trim().toLowerCase();
    if (!fullSubdomain) {
      fullSubdomain = `mail${keyId}.${domain}`;
    } else if (!fullSubdomain.includes(domain)) {
      fullSubdomain = `${fullSubdomain}.${domain}`;
    }

    // Determine sender email
    const prefix = senderName?.trim() || 'noreply';
    const senderEmail = `${prefix}@${fullSubdomain}`;

    // 1. Add subdomain to Resend
    const resendHeaders = {
      "Authorization": `Bearer ${targetKey.api_key}`,
      "Content-Type": "application/json"
    };

    // First list domains to see if it already exists on this Resend account
    const listRes = await fetch("https://api.resend.com/domains", { headers: resendHeaders });
    let resendDomainId = null;
    let dnsRecordsFromResend = [];

    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = (listData?.data || []).find(d => d.name === fullSubdomain);
      if (existing) {
        resendDomainId = existing.id;
        const getRes = await fetch(`https://api.resend.com/domains/${existing.id}`, { headers: resendHeaders });
        if (getRes.ok) {
          const getData = await getRes.json();
          dnsRecordsFromResend = getData.records || [];
        }
      }
    }

    if (!resendDomainId) {
      console.log(`[Resend Rotator] Registering subdomain domain "${fullSubdomain}" on Resend...`);
      const createRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: resendHeaders,
        body: JSON.stringify({ name: fullSubdomain })
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(`Resend domain creation failed: ${createData.message || JSON.stringify(createData)}`);
      }
      resendDomainId = createData.id;
      dnsRecordsFromResend = createData.records || [];
    }

    // 2. Add DNS records to Cloudflare
    console.log(`[Resend Rotator] Injecting DNS records for subdomain ${fullSubdomain} into Cloudflare...`);
    const cfHeaders = {
      "Authorization": `Bearer ${cfToken}`,
      "Content-Type": "application/json"
    };

    const existingCfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`, {
      headers: cfHeaders
    });
    const existingCfData = await existingCfRes.json();
    if (!existingCfRes.ok) {
      throw new Error(`Cloudflare API error fetching records: ${existingCfData?.errors?.[0]?.message}`);
    }
    const existingRecords = existingCfData?.result || [];

    const addCfRecord = async (type, fullName, content, priority) => {
      const targetName = fullName.toLowerCase();
      const conflicting = existingRecords.filter(r => 
        r.type.toUpperCase() === type.toUpperCase() && 
        r.name.toLowerCase() === targetName
      );

      if (conflicting.length > 0) {
        for (const conf of conflicting) {
          if (conf.content.trim() === content.trim() && (priority === undefined || conf.priority === priority)) {
            // Already exists - skip
            return;
          }
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
      if (!r.ok) {
        const d = await r.json();
        console.error(`[Resend Rotator] Failed to add DNS record ${type} "${fullName}":`, d?.errors?.[0]?.message);
      }
    };

    // Add Resend verification records
    for (const rec of dnsRecordsFromResend) {
      const recType = (rec.type || 'TXT').toUpperCase();
      const recName = rec.name;
      await addCfRecord(recType, recName, rec.value || rec.content || '', rec.priority);
    }

    // Add default SPF and DMARC specifically for the subdomain
    await addCfRecord('TXT', fullSubdomain, 'v=spf1 include:amazonses.com ~all');
    await addCfRecord('TXT', `_dmarc.${fullSubdomain}`, `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; adkim=r; aspf=r`);

    // 3. Trigger Verification
    console.log(`[Resend Rotator] Triggering domain verification...`);
    await fetch(`https://api.resend.com/domains/${resendDomainId}/verify`, {
      method: 'POST',
      headers: resendHeaders
    });

    // 4. Update Database
    await db.query(
      `UPDATE resend_api_keys 
       SET resend_domain_id = $1, 
           subdomain = $2, 
           sender_email = $3, 
           status = 'Active', 
           error_message = NULL 
       WHERE id = $4`,
      [resendDomainId, fullSubdomain, senderEmail, keyId]
    );

    await logAuditEvent('Resend Key Subdomain Provisioned', `Configured subdomain ${fullSubdomain} for key label "${targetKey.label || keyId}"`);
    return { subdomain: fullSubdomain, senderEmail };
  } catch (err) {
    console.error(`[Resend Rotator] Subdomain provisioning failed for key ID ${keyId}:`, err.message);
    await db.query("UPDATE resend_api_keys SET status = 'Error', error_message = $1 WHERE id = $2", [err.message, keyId]);
    throw err;
  }
}

/**
 * Automates rotation to the next active Resend key.
 */
export async function rotateResendKey(oldApiKey, reason) {
  console.log(`[Resend Rotator] Initiating key rotation due to: ${reason}`);
  try {
    await resetExpiredLimits();

    if (oldApiKey) {
      const statusToSet = (reason.includes('limit') || reason.includes('422') || reason.includes('100') || reason.includes('rate_limit')) ? 'LimitReached' : 'Error';
      await db.query(
        "UPDATE resend_api_keys SET status = $1, error_message = $2 WHERE api_key = $3",
        [statusToSet, reason, oldApiKey]
      );
    }

    // Find next active key from the pool that has a valid sender_email configured
    const nextKeyRes = await db.query(
      `SELECT * FROM resend_api_keys 
       WHERE status = 'Active' 
         AND daily_sent_count < 100 
         AND api_key != $1 
         AND sender_email IS NOT NULL 
       ORDER BY id ASC LIMIT 1`,
      [oldApiKey || '']
    );

    if (nextKeyRes.rows.length === 0) {
      throw new Error("No other active Resend API keys found with remaining daily limits and verified subdomains.");
    }

    const nextKey = nextKeyRes.rows[0];

    // Simply switch pointer settings (Instant rotation with zero DNS change lag)
    await db.query(
      "INSERT INTO system_settings (key, value) VALUES ('resend_api_key', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [nextKey.api_key]
    );
    await db.query(
      "INSERT INTO system_settings (key, value) VALUES ('email_sender', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [nextKey.sender_email]
    );

    await logAuditEvent(
      'Resend Key Rotated',
      `Automatically rotated Resend key to "${nextKey.label || nextKey.id}" using sender: ${nextKey.sender_email} (Reason: ${reason})`
    );

    console.log(`[Resend Rotator] Rotation successful. Active sender: ${nextKey.sender_email}`);
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

    // Automatically provision subdomain and DNS if not yet done
    if (!targetKey.sender_email || !targetKey.subdomain) {
      await provisionSubdomainAndDns(keyId, targetKey.subdomain || `mail${keyId}`, 'noreply');
    }

    // Refetch to get updated values
    const refetchedKeyRes = await db.query("SELECT * FROM resend_api_keys WHERE id = $1", [keyId]);
    const nextKey = refetchedKeyRes.rows[0];

    // Activate in settings
    await db.query("UPDATE resend_api_keys SET status = 'Active', error_message = NULL WHERE id = $1", [keyId]);
    await db.query(
      "INSERT INTO system_settings (key, value) VALUES ('resend_api_key', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [nextKey.api_key]
    );
    await db.query(
      "INSERT INTO system_settings (key, value) VALUES ('email_sender', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [nextKey.sender_email]
    );

    await logAuditEvent(
      'Resend Key Activated Manually',
      `Admin manually activated Resend API Key: "${nextKey.label || nextKey.id}" using sender: ${nextKey.sender_email}`
    );

    return nextKey;
  } catch (err) {
    console.error(`[Resend Rotator] Manual activation failed:`, err.message);
    await db.query("UPDATE resend_api_keys SET status = 'Error', error_message = $1 WHERE id = $2", [err.message, keyId]);
    await logAuditEvent('Resend Key Manual Activation Error', `Manual activation failed for key ID ${keyId}: ${err.message}`);
    throw err;
  }
}

/**
 * Fetch the active Resend key and sender email matching the requested purpose/type category.
 * Falls back to 'All' or system settings if no specific active key is found.
 */
export async function getActiveResendKeyForType(emailType) {
  try {
    await resetExpiredLimits();

    // 1. Find key matching the exact purpose (e.g. Transactional, Marketing, Billing)
    let res = await db.query(
      `SELECT * FROM resend_api_keys 
       WHERE status = 'Active' 
         AND daily_sent_count < 100 
         AND email_type = $1 
         AND sender_email IS NOT NULL 
       ORDER BY id ASC LIMIT 1`,
      [emailType]
    );
    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // 2. Fallback to 'All' general type keys
    if (emailType !== 'All') {
      res = await db.query(
        `SELECT * FROM resend_api_keys 
         WHERE status = 'Active' 
           AND daily_sent_count < 100 
           AND email_type = 'All' 
           AND sender_email IS NOT NULL 
         ORDER BY id ASC LIMIT 1`
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    }

    // 3. Fallback to global setting values
    const globalKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");
    const globalSenderRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender'");
    
    const apiKey = globalKeyRes.rows[0]?.value?.trim();
    const senderEmail = globalSenderRes.rows[0]?.value?.trim();

    if (apiKey) {
      return { api_key: apiKey, sender_email: senderEmail || 'noreply@agentbunny.com', isFallback: true };
    }
    return null;
  } catch (err) {
    console.error('[Resend Rotator] Error resolving active key for type:', err.message);
    return null;
  }
}
