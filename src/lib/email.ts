// Email Service for FluffyChats
// Supports: 2FA OTP, Team Invitations, Password Reset, etc.

import nodemailer from 'nodemailer';

// Email configuration - uses environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'FluffyChats <noreply@fluffychats.com>';
const APP_NAME = 'FluffyChats';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(EMAIL_CONFIG);
};

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send 2FA OTP Email
export async function send2FAOTP(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <span style="font-size: 24px; font-weight: bold; color: #ffffff;">${APP_NAME}</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                Your Verification Code
              </h1>
              <p style="margin: 0 0 30px; font-size: 16px; color: #666666; line-height: 1.5; text-align: center;">
                ${userName ? `Hi ${userName},<br><br>` : ''}
                Use the following code to verify your identity:
              </p>

              <!-- OTP Code -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%); border: 2px dashed #667eea; border-radius: 12px;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; font-family: 'Monaco', 'Menlo', monospace;">${otp}</span>
                </div>
              </div>

              <p style="margin: 30px 0 0; font-size: 14px; color: #999999; text-align: center;">
                This code expires in <strong>10 minutes</strong>.
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #999999; text-align: center;">
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This email was sent by ${APP_NAME}.<br>
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
${APP_NAME} - Verification Code

${userName ? `Hi ${userName},` : ''}

Your verification code is: ${otp}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.

- ${APP_NAME} Team
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `${otp} is your ${APP_NAME} verification code`,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send 2FA OTP:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// Send Team Invitation Email
export async function sendTeamInvitation(
  email: string,
  inviterName: string,
  organizationName: string,
  role: string,
  inviteToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();
    const inviteUrl = `${APP_URL}/invite/${inviteToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <span style="font-size: 24px; font-weight: bold; color: #ffffff;">${APP_NAME}</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                You're Invited!
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.5; text-align: center;">
                <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on ${APP_NAME} as ${role === 'admin' ? 'an' : 'a'} <strong>${role}</strong>.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; color: #999999; text-align: center;">
                This invitation expires in <strong>7 days</strong>.
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #999999; text-align: center;">
                If you don't want to join, you can safely ignore this email.
              </p>

              <div style="margin: 30px 0; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #666666;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This email was sent by ${APP_NAME}.<br>
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
You're Invited to ${organizationName}!

${inviterName} has invited you to join ${organizationName} on ${APP_NAME} as ${role === 'admin' ? 'an' : 'a'} ${role}.

Accept the invitation by visiting:
${inviteUrl}

This invitation expires in 7 days.

If you don't want to join, you can safely ignore this email.

- ${APP_NAME} Team
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `${inviterName} invited you to join ${organizationName} on ${APP_NAME}`,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send team invitation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// Send Password Reset Email
export async function sendPasswordReset(
  email: string,
  resetToken: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();
    const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <span style="font-size: 24px; font-weight: bold; color: #ffffff;">${APP_NAME}</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                Reset Your Password
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.5; text-align: center;">
                ${userName ? `Hi ${userName},<br><br>` : ''}
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  Reset Password
                </a>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; color: #999999; text-align: center;">
                This link expires in <strong>1 hour</strong>.
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #999999; text-align: center;">
                If you didn't request a password reset, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This email was sent by ${APP_NAME}.<br>
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Reset Your Password

${userName ? `Hi ${userName},` : ''}

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, please ignore this email.

- ${APP_NAME} Team
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// Send Welcome Email
export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <span style="font-size: 24px; font-weight: bold; color: #ffffff;">${APP_NAME}</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                Welcome, ${userName}!
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.5; text-align: center;">
                Thanks for signing up for ${APP_NAME}! We're excited to have you on board.
              </p>

              <p style="margin: 20px 0; font-size: 16px; color: #666666; line-height: 1.5;">
                With ${APP_NAME}, you can:
              </p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #666666;">
                <li style="margin: 8px 0;">Upload and analyze WhatsApp conversations</li>
                <li style="margin: 8px 0;">Extract lead intelligence automatically</li>
                <li style="margin: 8px 0;">Sync leads to your CRM</li>
                <li style="margin: 8px 0;">Track team performance</li>
              </ul>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This email was sent by ${APP_NAME}.<br>
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Welcome to ${APP_NAME}, ${userName}!

Thanks for signing up! We're excited to have you on board.

With ${APP_NAME}, you can:
- Upload and analyze WhatsApp conversations
- Extract lead intelligence automatically
- Sync leads to your CRM
- Track team performance

Get started: ${APP_URL}/dashboard

- ${APP_NAME} Team
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${APP_NAME}!`,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// Send Security Alert Email
export async function sendSecurityAlert(
  email: string,
  userName: string,
  alertType: 'new_login' | 'password_changed' | '2fa_enabled' | '2fa_disabled',
  details?: { ip?: string; device?: string; location?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    const alertMessages = {
      new_login: 'New login to your account',
      password_changed: 'Your password was changed',
      '2fa_enabled': 'Two-factor authentication enabled',
      '2fa_disabled': 'Two-factor authentication disabled',
    };

    const subject = `Security Alert: ${alertMessages[alertType]}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px;">
                <span style="font-size: 24px; font-weight: bold; color: #ffffff;">Security Alert</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                ${alertMessages[alertType]}
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.5; text-align: center;">
                Hi ${userName},<br><br>
                We detected the following activity on your account:
              </p>

              <div style="margin: 20px 0; padding: 15px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>Activity:</strong> ${alertMessages[alertType]}<br>
                  <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                  ${details?.ip ? `<strong>IP Address:</strong> ${details.ip}<br>` : ''}
                  ${details?.device ? `<strong>Device:</strong> ${details.device}<br>` : ''}
                  ${details?.location ? `<strong>Location:</strong> ${details.location}` : ''}
                </p>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; color: #999999; text-align: center;">
                If this was you, you can safely ignore this email.<br>
                If you didn't perform this action, please secure your account immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This email was sent by ${APP_NAME}.<br>
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Security Alert: ${alertMessages[alertType]}

Hi ${userName},

We detected the following activity on your account:

Activity: ${alertMessages[alertType]}
Time: ${new Date().toLocaleString()}
${details?.ip ? `IP Address: ${details.ip}` : ''}
${details?.device ? `Device: ${details.device}` : ''}
${details?.location ? `Location: ${details.location}` : ''}

If this was you, you can safely ignore this email.
If you didn't perform this action, please secure your account immediately.

- ${APP_NAME} Security Team
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send security alert:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}
