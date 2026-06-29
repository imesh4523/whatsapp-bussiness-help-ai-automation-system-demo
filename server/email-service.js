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

/**
 * Send a templated HTML email matching Stripe Link visual styles (vibrant green, curved corners, bunny logo)
 */
export async function sendTemplatedEmail(toEmail, key, variables = {}) {
  try {
    // 1. Fetch template from DB
    const res = await db.query("SELECT subject, body FROM email_templates WHERE key = $1", [key]);
    if (res.rows.length === 0) {
      throw new Error(`Email template not found for key: ${key}`);
    }
    let { subject, body } = res.rows[0];

    // 2. Replace placeholders in subject and body
    for (const [vKey, vVal] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${vKey}\\s*}}`, 'g');
      subject = subject.replace(regex, vVal);
      body = body.replace(regex, vVal);
    }

    // 3. Construct premium Link-style HTML body
    let title = subject;
    let mainDescription = body.replace(/\n/g, '<br />');
    let ctaText = '';
    let ctaLink = '';
    let subFeatures = [];

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const domain = domainQuery.rows.length > 0 ? domainQuery.rows[0].value?.trim() : 'agent-bunny.com';
    const baseUrl = `https://${domain}`;

    if (key === 'welcome') {
      title = 'Welcome to AgentBunny! 🐰';
      ctaText = 'Go to Dashboard';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          emoji: '🚀',
          title: 'Getting Started',
          desc: 'Add your first WhatsApp session in the dashboard and start sending automated replies instantly.'
        },
        {
          emoji: '🤖',
          title: 'AI Chatbots',
          desc: 'Train your custom AI assistants with your store data using top models like Gemini 1.5.'
        },
        {
          emoji: '💬',
          title: 'Need support?',
          desc: 'Our customer success agents are available around the clock. Contact us anytime.'
        }
      ];
    } else if (key === 'reset_password') {
      title = 'Confirm it\'s you';
      ctaText = 'Reset password';
      ctaLink = variables.resetLink || `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          emoji: '🔒',
          title: 'Secure Link',
          desc: 'This password reset link is valid for 1 hour. Never share it with anyone.'
        },
        {
          emoji: '⚠️',
          title: 'Didn\'t request this?',
          desc: 'If you did not request a password reset, you can safely ignore this email. Your account remains secure.'
        }
      ];
    } else if (key === 'invoice') {
      title = 'Payment Successful ✅';
      ctaText = 'Manage Subscription';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          emoji: '💳',
          title: 'Transaction Details',
          desc: `Plan: ${variables.planName || 'Premium'} • Amount: ${variables.amount || 'LKR 0.00'} • Billing: ${variables.billingCycle || 'Monthly'}`
        },
        {
          emoji: '📄',
          title: 'Invoice History',
          desc: 'You can download the full PDF invoice history directly from your Billing dashboard.'
        }
      ];
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="display: inline-block; background-color: #00d166; border-radius: 50%; width: 36px; height: 36px; line-height: 36px; text-align: center; font-size: 20px;">🐰</span>
              <span style="font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">agent<span style="color: #00d166;">bunny</span></span>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; padding: 40px 32px;">
          <tr>
            <td>
              <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">${title}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${mainDescription}</p>

              ${ctaText && ctaLink ? `
              <!-- Button -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 36px auto; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" target="_blank" style="display: inline-block; background-color: #00d166; color: #ffffff; text-decoration: none; border-radius: 30px; padding: 14px 40px; font-size: 15px; font-weight: 600; border: 1px solid #00d166; text-align: center; box-shadow: 0 4px 12px rgba(0, 209, 102, 0.15);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${subFeatures.length > 0 ? `
              <!-- Features / Sub-items -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f1f5f9; padding-top: 28px; margin-top: 12px;">
                ${subFeatures.map(feat => `
                <tr>
                  <td style="vertical-align: top; width: 44px; padding-bottom: 20px;">
                    <div style="background-color: #f0fdf4; border-radius: 12px; width: 34px; height: 34px; line-height: 34px; text-align: center; font-size: 16px;">
                      ${feat.emoji}
                    </div>
                  </td>
                  <td style="vertical-align: top; padding-bottom: 20px; padding-left: 2px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${feat.title}</h4>
                    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${feat.desc}</p>
                  </td>
                </tr>
                `).join('')}
              </table>
              ` : ''}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px; max-width: 500px;">
          <tr>
            <td align="center" style="font-size: 12px; color: #94a3b8; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #64748b;">${domain}</p>
              <p style="margin: 0;">You received this automated email notification because you are a registered user of AgentBunny. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const success = await sendGenericEmail(toEmail, subject, htmlContent);
    return success;
  } catch (err) {
    console.error(`[Email Service] sendTemplatedEmail failed for key: ${key}`, err.message);
    return false;
  }
}
