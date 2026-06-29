import db from './db.js';
import { resetExpiredLimits, rotateResendKey } from './resend-rotator.js';

/**
 * Send a generic HTML email using the Resend email provider configured in settings
 */
export async function sendGenericEmail(toEmail, subject, htmlContent, textContent = '', isCampaign = false, attachments = []) {
  try {
    // Fetch settings from database
    const serviceRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_service'");
    const service = serviceRes.rows.length > 0 ? serviceRes.rows[0].value : 'none';

    if (service !== 'resend') {
      console.log(`[Email Service] Not active (${service}). Suppressing mail to ${toEmail}`);
      return true;
    }

    // Reset expired daily limits
    await resetExpiredLimits();

    let keyRes = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");
    let apiKey = keyRes.rows.length > 0 ? keyRes.rows[0].value?.trim() : null;
    if (!apiKey) {
      throw new Error("Resend API Key is not set in system settings.");
    }

    // Check if the current key has exceeded its daily limit
    let activeKeyObj = null;
    const keyInfoRes = await db.query("SELECT id, daily_sent_count, status, sender_email FROM resend_api_keys WHERE api_key = $1", [apiKey]);
    if (keyInfoRes.rows.length > 0) {
      activeKeyObj = keyInfoRes.rows[0];
      if (activeKeyObj.daily_sent_count >= 100 || activeKeyObj.status === 'LimitReached') {
        console.log(`[Email Service] API Key limit reached (${activeKeyObj.daily_sent_count}/100). Auto-rotating...`);
        try {
          apiKey = await rotateResendKey(apiKey, `Daily limit reached (${activeKeyObj.daily_sent_count}/100)`);
          const newKeyRes = await db.query("SELECT id, daily_sent_count, status, sender_email FROM resend_api_keys WHERE api_key = $1", [apiKey]);
          if (newKeyRes.rows.length > 0) activeKeyObj = newKeyRes.rows[0];
        } catch (rotError) {
          console.error(`[Email Service] Auto-rotation failed, falling back to current key:`, rotError.message);
        }
      }
    }

    let rawFromEmail = activeKeyObj?.sender_email;
    if (!rawFromEmail) {
      const senderRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender'");
      rawFromEmail = senderRes.rows.length > 0 ? senderRes.rows[0].value?.trim() : 'noreply@agentbunny.com';
    }

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

    const requestBody = {
      from: fromEmail,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
      text: textFallback,
      headers: customHeaders
    };

    if (attachments && attachments.length > 0) {
      requestBody.attachments = attachments;
    }

    const doSend = async (currentKey) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${currentKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    };

    let sendRes = await doSend(apiKey);

    // If Resend returns rate limit or daily quota error, auto-rotate and retry once
    const isLimitError = (sendRes.status === 422 || sendRes.status === 429 || 
                          (sendRes.data && (sendRes.data.message?.toLowerCase().includes('limit') || 
                                            sendRes.data.message?.toLowerCase().includes('quota') ||
                                            sendRes.data.message?.toLowerCase().includes('rate_limit'))));
    
    if (!sendRes.ok && isLimitError) {
      const errMsg = sendRes.data?.message || JSON.stringify(sendRes.data);
      console.warn(`[Email Service] Rate limit / Quota exceeded error: ${errMsg}. Rotating...`);
      try {
        apiKey = await rotateResendKey(apiKey, `Quota/Limit Error: ${errMsg}`);
        sendRes = await doSend(apiKey);
      } catch (rotError) {
        console.error(`[Email Service] Rotation retry failed:`, rotError.message);
      }
    }

    if (!sendRes.ok) {
      throw new Error(sendRes.data?.message || JSON.stringify(sendRes.data));
    }

    console.log(`[Email Service] Resend sent successfully. Message ID: ${sendRes.data.id}`);

    // Increment count in database
    await db.query(
      "UPDATE resend_api_keys SET daily_sent_count = daily_sent_count + 1 WHERE api_key = $1",
      [apiKey]
    );

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
    let mainDescription = body;
    let closingContent = '';

    if (body.includes('Best Regards,')) {
      const splitIndex = body.indexOf('Best Regards,');
      let splitAt = splitIndex;
      if (body.includes('If you did not request this,')) {
        splitAt = body.indexOf('If you did not request this,');
      } else if (body.includes('If you did not request this')) {
        splitAt = body.indexOf('If you did not request this');
      }
      
      mainDescription = body.substring(0, splitAt).trim();
      closingContent = body.substring(splitAt).trim();
    }

    let ctaText = '';
    let ctaLink = '';
    let subFeatures = [];
    let attachments = [];

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const domain = domainQuery.rows.length > 0 ? domainQuery.rows[0].value?.trim() : 'www.agent-bunny.com';
    const baseUrl = `https://${domain}`;

    if (key === 'welcome') {
      title = 'Welcome to AgentBunny!';
      ctaText = 'Go to Dashboard';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/rocket.png',
          title: 'Getting Started',
          desc: 'Add your first WhatsApp session in the dashboard and start sending automated replies instantly.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/chat.png',
          title: 'AI Chatbots',
          desc: 'Train your custom AI assistants with your store data using top models like Gemini 3.5 and Claude 3.5.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/help.png',
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
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/lock.png',
          title: 'Secure Link',
          desc: 'This password reset link is valid for 1 hour. Never share it with anyone.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/warning-shield.png',
          title: 'Didn\'t request this?',
          desc: 'If you did not request a password reset, you can safely ignore this email. Your account remains secure.'
        }
      ];
    } else if (key === 'password_reset_success') {
      title = 'Password Changed Successfully';
      ctaText = 'Go to Dashboard';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/lock.png',
          title: 'Secure Update',
          desc: 'Your account login password has been changed. If this wasn\'t you, suspend your account immediately.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/warning-shield.png',
          title: 'Password Best Practices',
          desc: 'We recommend using a strong password with a mix of numbers, letters, and special symbols.'
        }
      ];
    } else if (key === 'plan_upgraded') {
      title = 'Subscription Plan Upgraded!';
      ctaText = 'Explore Dashboard';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/filled-star.png',
          title: 'Tier Unlocked',
          desc: `Your store is now upgraded to the premium ${variables.planName || 'Pro'} package!`
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/rocket.png',
          title: 'Response Quotas Expanded',
          desc: 'Your monthly AI response messages limits have been expanded immediately.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/checked.png',
          title: 'Premium Model Access',
          desc: 'Access top-tier models with low latency and smart training contexts.'
        }
      ];
    } else if (key === 'inactivity_followup') {
      title = 'Connect WhatsApp & Automate Sales';
      ctaText = 'Sync WhatsApp Now';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/phone.png',
          title: '2-Minute QR Sync',
          desc: 'Head to your user dashboard, scan the active QR code, and connect your phone number.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/robot.png',
          title: 'Train Customer Agents',
          desc: 'Feed your store info to our AI bot so it can answer customer inquiries instantly.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/activity.png',
          title: '24/7 Operations',
          desc: 'Capture leads, display products, and collect client order details while you sleep.'
        }
      ];
    } else if (key === 'promotional') {
      title = 'Latest System Announcements';
      ctaText = 'View Details';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/rocket.png',
          title: 'Advanced AI Architectures',
          desc: 'We added support for deep reasoning contexts to resolve customer questions smoothly.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/activity.png',
          title: 'Analytics Dashboard',
          desc: 'Detailed token stats, order maps, and conversion analytics are now live.'
        }
      ];
    } else if (key === 'offer_discount') {
      title = 'Exclusive Onboarding Offer!';
      ctaText = 'Claim Discount';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/sale.png',
          title: 'Promo Code Discount',
          desc: `Enjoy 20% off your package upgrade! Use coupon: ${variables.discountCode || 'PROMO20'}`
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/clock.png',
          title: 'Limited Validity',
          desc: 'This special promo coupon discount is valid only for the next 48 hours.'
        }
      ];
    } else if (key === 'price_update') {
      title = 'Pricing Structure Updates';
      ctaText = 'Manage Subscription';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/wallet.png',
          title: 'Subscription Pricing Changes',
          desc: 'Updating pricing details to add more unlimited AI responses on paid plans.'
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/checked.png',
          title: 'System Upgrades',
          desc: 'We are expanding background server resources for faster WhatsApp webhooks reply speeds.'
        }
      ];
    } else if (key === 'quota_warning_80') {
      title = 'Quota Limit Ending Soon';
      ctaText = 'Upgrade Subscription';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/warning-shield.png',
          title: '80% Usage Alert',
          desc: `You have consumed ${variables.currentCount} out of ${variables.responseLimit} allowed response messages.`
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/rocket.png',
          title: 'Avoid Interruptions',
          desc: 'Upgrade your subscription plan to unlock unlimited response messages and premium Claude models.'
        }
      ];
    } else if (key === 'quota_warning_100') {
      title = 'Message Quota Fully Exceeded';
      ctaText = 'Reactivate Account';
      ctaLink = `${baseUrl}/user/dashboard`;
      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/warning-shield.png',
          title: 'AI Responses Paused',
          desc: `You have exhausted all ${variables.responseLimit} allowed response messages. AI chatbot replies are now paused.`
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/checked.png',
          title: 'Instant Reactivation',
          desc: 'Choose a billing plan in your user portal to restore your WhatsApp AI sales assistants instantly.'
        }
      ];
    } else if (key === 'invoice') {
      title = 'Payment Successful';
      ctaText = 'Manage Subscription';
      ctaLink = `${baseUrl}/user/dashboard`;

      const brand = (variables.cardBrand || 'visa').toLowerCase();
      const last4 = variables.cardLast4 || '4242';

      let cardIcon = 'https://img.icons8.com/color/96/visa.png';
      let brandName = 'Visa';

      if (brand === 'mastercard') {
        cardIcon = 'https://img.icons8.com/color/96/mastercard.png';
        brandName = 'Mastercard';
      } else if (brand === 'amex' || brand === 'american express') {
        cardIcon = 'https://img.icons8.com/color/96/amex.png';
        brandName = 'Amex';
      } else if (brand === 'discover') {
        cardIcon = 'https://img.icons8.com/color/96/discover.png';
        brandName = 'Discover';
      } else if (brand === 'diners' || brand === 'diners club') {
        cardIcon = 'https://img.icons8.com/color/96/diners-club.png';
        brandName = 'Diners Club';
      } else if (brand === 'jcb') {
        cardIcon = 'https://img.icons8.com/color/96/jcb.png';
        brandName = 'JCB';
      }

      subFeatures = [
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/wallet.png',
          title: 'Transaction Details',
          desc: `Plan: ${variables.planName || 'Premium'} • Amount: ${variables.amount || 'LKR 0.00'} • Billing: ${variables.billingCycle || 'Monthly'}`
        },
        {
          iconUrl: cardIcon,
          title: 'Payment Method',
          desc: `${brandName} ending in •••• ${last4}`,
          isBrandIcon: true
        },
        {
          iconUrl: 'https://img.icons8.com/material-outlined/48/00d166/document.png',
          title: 'Invoice Attachment',
          desc: 'A copy of your official PDF invoice has been attached to this email for your records.'
        }
      ];

      try {
        const { generateInvoicePdf } = await import('./invoice-generator.js');
        const pdfBuffer = await generateInvoicePdf({
          fullName: variables.fullName || 'Valued Customer',
          email: toEmail,
          planName: variables.planName || 'Premium Plan',
          amount: variables.amount || 'LKR 0.00',
          billingCycle: variables.billingCycle || 'Monthly'
        });

        attachments.push({
          content: pdfBuffer.toString('base64'),
          filename: `invoice_${Date.now()}.pdf`
        });
      } catch (pdfErr) {
        console.error('[Email Service] Failed to generate invoice PDF attachment:', pdfErr.message);
      }
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
            <td align="center" style="vertical-align: middle;">
              <img src="https://img.icons8.com/ios/96/00d166/rabbit.png" width="36" height="36" style="width: 36px; height: 36px; vertical-align: middle; display: inline-block; margin-right: 8px; border: 0;" />
              <span style="font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; vertical-align: middle; display: inline-block; line-height: 36px;">agent<span style="color: #00d166;">bunny</span></span>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; padding: 40px 32px;">
          <tr>
            <td>
              <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px; display: flex; align-items: center; justify-content: center;">
                ${title}
                ${key === 'invoice' ? `<img src="https://img.icons8.com/color/96/verified-badge.png" width="22" height="22" style="width: 22px; height: 22px; vertical-align: middle; display: inline-block; margin-left: 6px; border: 0;" />` : ''}
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${mainDescription.replace(/\n/g, '<br />')}</p>

              ${ctaText && ctaLink ? `
              <!-- Button -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px auto; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" target="_blank" style="display: inline-block; background-color: #00d166; color: #ffffff; text-decoration: none; border-radius: 30px; padding: 14px 40px; font-size: 15px; font-weight: 600; border: 1px solid #00d166; text-align: center; box-shadow: 0 4px 12px rgba(0, 209, 102, 0.15);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${closingContent ? `
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${closingContent.replace(/\n/g, '<br />')}</p>
              ` : ''}

              ${subFeatures.length > 0 ? `
              <!-- Features / Sub-items -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f1f5f9; padding-top: 28px; margin-top: 12px;">
                ${subFeatures.map(feat => `
                <tr>
                  <td style="vertical-align: top; width: 44px; padding-bottom: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: ${feat.isBrandIcon ? '#f8fafc' : '#f0fdf4'}; border-radius: 12px; width: 36px; height: 36px;">
                      <tr>
                        <td align="center" style="vertical-align: middle; height: 36px; width: 36px; padding: 0;">
                          <img src="${feat.iconUrl}" width="${feat.isBrandIcon ? '24' : '20'}" height="${feat.isBrandIcon ? '24' : '20'}" style="width: ${feat.isBrandIcon ? '24px' : '20px'}; height: ${feat.isBrandIcon ? '24px' : '20px'}; display: block; margin: 0 auto; border: 0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align: top; padding-bottom: 20px; padding-left: 8px;">
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

    const success = await sendGenericEmail(toEmail, subject, htmlContent, '', false, attachments);
    return success;
  } catch (err) {
    console.error(`[Email Service] sendTemplatedEmail failed for key: ${key}`, err.message);
    return false;
  }
}
