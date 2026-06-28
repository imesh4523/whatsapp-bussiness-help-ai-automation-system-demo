import db from './db.js';

/**
 * Send a generic HTML email using the Resend email provider configured in settings
 */
export async function sendGenericEmail(toEmail, subject, htmlContent, textContent = '', isCampaign = false) {
  try {
    // Fetch settings from database
    const serviceRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_service'");
    const service = serviceRes.rows.length > 0 ? serviceRes.rows[0].value : 'none';

    if (service !== 'resend') {
      console.log(`[Email Service] Not active (${service}). Suppressing mail to ${toEmail}`);
      return true;
    }

    const keyRes = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");
    const apiKey = keyRes.rows.length > 0 ? keyRes.rows[0].value?.trim() : null;
    if (!apiKey) {
      throw new Error("Resend API Key is not set in system settings.");
    }

    const senderRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender'");
    const rawFromEmail = senderRes.rows.length > 0 ? senderRes.rows[0].value?.trim() : 'noreply@agentbunny.com';

    const senderNameRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender_name'");
    const senderDisplayName = senderNameRes.rows.length > 0 ? senderNameRes.rows[0].value?.trim() : 'AgentBunny';

    const fromEmail = `${senderDisplayName} <${rawFromEmail}>`;

    // Strip HTML for fallback text content
    const textFallback = textContent || htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const customHeaders = {
      "X-Mailer": "AgentBunny Mailer",
      "X-Auto-Response-Suppress": "All"
    };

    if (isCampaign) {
      customHeaders["Precedence"] = "bulk";
    }

    console.log(`[Email Service] Sending email to ${toEmail} via Resend...`);

    const res = await fetch("https://api.resend.com/emails", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: subject,
        html: htmlContent,
        text: textFallback,
        headers: customHeaders
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }

    console.log(`[Email Service] Resend sent successfully. Message ID: ${data.id}`);
    return true;
  } catch (err) {
    console.error(`[Email Service] Error sending email to ${toEmail}:`, err.message);
    return false;
  }
}
