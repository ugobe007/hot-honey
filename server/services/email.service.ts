import { Resend } from 'resend';

// Initialize Resend only if API key is present
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions) {
  if (!resend) {
    console.warn('⚠️ Resend not configured. Set RESEND_API_KEY to enable emails.');
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: options.from || 'Hot Money Honey <notifications@hotmoneyhoney.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Email sent successfully:', data?.id);
    return data;
  } catch (error: any) {
    console.error('❌ Email service error:', error);
    throw error;
  }
}

/**
 * Send stage advancement notification to YES voters
 */
export async function sendStageAdvancementEmail(
  recipientEmail: string,
  startupName: string,
  oldStage: number,
  newStage: number,
  startupId: string
) {
  const stageNames: Record<number, string> = {
    1: 'Initial Review',
    2: 'Due Diligence',
    3: 'Final Review',
    4: 'Deal Closed',
  };

  const subject = `🚀 ${startupName} advanced to ${stageNames[newStage]}!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🍯 Hot Money Honey
              </h1>
              <p style="margin: 12px 0 0 0; color: #fed7aa; font-size: 14px; font-weight: 500;">
                Deal Progress Update
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; line-height: 64px; font-size: 32px;">
                  🚀
                </div>
              </div>
              
              <!-- Main Message -->
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 700; text-align: center;">
                Great News!
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                <strong style="color: #111827; font-size: 18px;">${startupName}</strong> has advanced from 
                <span style="color: #6b7280;">Stage ${oldStage}: ${stageNames[oldStage]}</span> to 
                <span style="color: #16a34a; font-weight: 600;">Stage ${newStage}: ${stageNames[newStage]}</span>
              </p>
              
              <!-- Progress Bar -->
              <div style="margin: 32px 0; background-color: #f3f4f6; border-radius: 9999px; height: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #f97316 0%, #ea580c 100%); height: 100%; width: ${(newStage / 4) * 100}%; border-radius: 9999px;"></div>
              </div>
              
              <!-- Info Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong style="color: #78350f;">What this means:</strong><br>
                  ${newStage === 4 
                    ? 'This deal is now closed! The startup has completed the investment process.' 
                    : 'More investors have shown interest. Keep an eye on this opportunity!'}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://hot-honey.fly.dev/startup/${startupId}" 
                   style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                  View ${startupName} →
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                You're receiving this because you voted YES on ${startupName}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © 2025 Hot Money Honey. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * Send weekly digest email with portfolio updates
 */
export async function sendWeeklyDigestEmail(
  recipientEmail: string,
  startups: Array<{ name: string; stage: number; yesVotes: number; id: string }>
) {
  const subject = '📊 Your Weekly Portfolio Digest - Hot Money Honey';
  
  const startupsHtml = startups.map(s => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${s.name}</div>
        <div style="font-size: 14px; color: #6b7280;">Stage ${s.stage} • ${s.yesVotes} YES votes</div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        <a href="https://hot-honey.fly.dev/startup/${s.id}" style="color: #f97316; text-decoration: none; font-weight: 500; font-size: 14px;">
          View →
        </a>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🍯 Hot Money Honey
              </h1>
              <p style="margin: 12px 0 0 0; color: #fed7aa; font-size: 14px; font-weight: 500;">
                Your Weekly Portfolio Digest
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; font-weight: 700;">
                📊 Your Portfolio This Week
              </h2>
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                Here's what's happening with the ${startups.length} startups you're tracking:
              </p>
              
              <!-- Startups Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                ${startupsHtml}
              </table>
              
              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 0 0;">
                <a href="https://hot-honey.fly.dev/portfolio" 
                   style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Full Portfolio →
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © 2025 Hot Money Honey. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}
