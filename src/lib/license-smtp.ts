// src/lib/license-smtp.ts
// License Manager Email Service
// Uses SMTP config from LicenseSettings table (not .env)

import prisma from "./prisma";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

// =============================================================
// GET SMTP CONFIG FROM DB
// =============================================================

async function getSmtpConfig() {
  const settings = await prisma.licenseSettings.findFirst();
  if (!settings || !settings.smtpHost || !settings.smtpUser) {
    throw new Error("SMTP not configured. Please set up SMTP in License Manager.");
  }
  return settings;
}

// =============================================================
// SEND EMAIL
// =============================================================

export async function sendLicenseEmail(options: MailOptions): Promise<void> {
  const settings = await getSmtpConfig();
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

// =============================================================
// TEST SMTP
// =============================================================

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await getSmtpConfig();
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });

    await transporter.verify();
    return { success: true, message: "SMTP connection successful!" };
  } catch (error: any) {
    return { success: false, message: error.message || "SMTP connection failed" };
  }
}

// =============================================================
// EMAIL TEMPLATES
// =============================================================

// Base HTML wrapper
function baseTemplate(content: string, appName = "CallLog SaaS"): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px; }
    .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; font-size: 15px; }
    .otp-box { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 800; color: #1e40af; letter-spacing: 8px; font-family: monospace; }
    .otp-note { color: #6b7280; font-size: 13px; margin-top: 8px; }
    .btn { display: inline-block; background: #2563eb; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .btn:hover { background: #1d4ed8; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer { background: #f9fafb; padding: 24px 40px; text-align: center; }
    .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-number { font-size: 28px; font-weight: 800; color: #111827; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

// 1. Registration Verification Email
export async function sendVerificationEmail(
  to: string,
  name: string,
  otp: string
): Promise<void> {
  const settings = await prisma.licenseSettings.findFirst();
  const appName = settings?.appName || "CallLog SaaS";
  const appUrl = settings?.appUrl || "http://localhost:3000";

  const html = baseTemplate(`
    <div class="header">
      <h1>📞 ${appName}</h1>
      <p>Email Verification</p>
    </div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for registering with ${appName}. Please verify your email address using the OTP below:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-note">⏰ This OTP expires in <strong>10 minutes</strong></div>
      </div>
      <p>Enter this OTP on the verification page to activate your account.</p>
      <hr class="divider">
      <p style="color: #9ca3af; font-size: 13px;">If you did not register for ${appName}, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName} · <a href="${appUrl}" style="color: #6b7280;">${appUrl}</a></p>
    </div>
  `, appName);

  await sendLicenseEmail({
    to,
    subject: `${otp} — Verify your ${appName} account`,
    html,
  });
}

// 2. Forgot Password Email
export async function sendForgotPasswordEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<void> {
  const settings = await prisma.licenseSettings.findFirst();
  const appName = settings?.appName || "CallLog SaaS";
  const appUrl = settings?.appUrl || "http://localhost:3000";
  const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}`;

  const html = baseTemplate(`
    <div class="header">
      <h1>📞 ${appName}</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" class="btn">Reset My Password</a>
      </div>
      <p style="font-size: 13px; color: #6b7280;">Or copy this link:</p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 6px;">${resetLink}</p>
      <p style="color: #ef4444; font-size: 13px;">⏰ This link expires in <strong>1 hour</strong>.</p>
      <hr class="divider">
      <p style="color: #9ca3af; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}</p>
    </div>
  `, appName);

  await sendLicenseEmail({
    to,
    subject: `Reset your ${appName} password`,
    html,
  });
}

// 3. Welcome Email (after verification)
export async function sendWelcomeEmail(
  to: string,
  name: string,
  organizationName: string
): Promise<void> {
  const settings = await prisma.licenseSettings.findFirst();
  const appName = settings?.appName || "CallLog SaaS";
  const appUrl = settings?.appUrl || "http://localhost:3000";
  const supportEmail = settings?.supportEmail || "";

  const html = baseTemplate(`
    <div class="header">
      <h1>🎉 Welcome to ${appName}!</h1>
      <p>Your account is ready</p>
    </div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account has been successfully verified! You're all set to start managing your call logs.</p>
      <p><strong>Organization:</strong> ${organizationName}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${appUrl}/auth/login" class="btn">Login to Dashboard →</a>
      </div>
      <hr class="divider">
      <p><strong>Quick Start:</strong></p>
      <p>📥 Import your existing call logs (CSV/Excel/Android)</p>
      <p>📊 View analytics and insights on the dashboard</p>
      <p>👥 Invite your team members</p>
      <p>📱 Install the mobile app for automatic sync</p>
      ${supportEmail ? `<hr class="divider"><p style="font-size: 13px; color: #6b7280;">Need help? Email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>` : ""}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}</p>
    </div>
  `, appName);

  await sendLicenseEmail({
    to,
    subject: `Welcome to ${appName} — Account Verified!`,
    html,
  });
}

// 4. Daily Report Email (Cron)
export async function sendDailyReportEmail(stats: {
  totalUsers: number;
  newUsersToday: number;
  totalOrganizations: number;
  newOrgsToday: number;
  totalCallLogs: number;
  callLogsSyncedToday: number;
  verifiedUsers: number;
  unverifiedUsers: number;
}): Promise<void> {
  const settings = await prisma.licenseSettings.findFirst();
  if (!settings?.cronReportEmail) return;

  const appName = settings.appName || "CallLog SaaS";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = baseTemplate(`
    <div class="header">
      <h1>📊 Daily Report</h1>
      <p>${today}</p>
    </div>
    <div class="body">
      <p>Here is your daily summary for <strong>${appName}</strong>:</p>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-number">${stats.totalUsers}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #16a34a;">+${stats.newUsersToday}</div>
          <div class="stat-label">New Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.totalOrganizations}</div>
          <div class="stat-label">Organizations</div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-number">${stats.totalCallLogs.toLocaleString()}</div>
          <div class="stat-label">Total Call Logs</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #2563eb;">+${stats.callLogsSyncedToday.toLocaleString()}</div>
          <div class="stat-label">Synced Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #dc2626;">${stats.unverifiedUsers}</div>
          <div class="stat-label">Unverified</div>
        </div>
      </div>

      <hr class="divider">

      <table>
        <tr>
          <th>Metric</th>
          <th>Count</th>
          <th>Status</th>
        </tr>
        <tr>
          <td>Verified Users</td>
          <td>${stats.verifiedUsers}</td>
          <td><span class="badge badge-green">✓ Active</span></td>
        </tr>
        <tr>
          <td>Unverified Users</td>
          <td>${stats.unverifiedUsers}</td>
          <td><span class="badge badge-yellow">⏳ Pending</span></td>
        </tr>
        <tr>
          <td>New Orgs Today</td>
          <td>+${stats.newOrgsToday}</td>
          <td><span class="badge badge-green">✓ New</span></td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated daily report from ${appName} License Manager.</p>
    </div>
  `, appName);

  await sendLicenseEmail({
    to: settings.cronReportEmail,
    subject: `[${appName}] Daily Report — ${new Date().toLocaleDateString("en-IN")}`,
    html,
  });
}

// 5. Invitation Email
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  organizationName: string,
  role: string,
  inviteToken: string
): Promise<void> {
  const settings = await prisma.licenseSettings.findFirst();
  const appName = settings?.appName || "CallLog SaaS";
  const appUrl = settings?.appUrl || "http://localhost:3000";
  const acceptLink = `${appUrl}/auth/accept-invite?token=${inviteToken}`;

  const html = baseTemplate(`
    <div class="header">
      <h1>📞 ${appName}</h1>
      <p>You have been invited!</p>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on ${appName} as a <strong>${role}</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${acceptLink}" class="btn">Accept Invitation →</a>
      </div>
      <p style="font-size: 13px; color: #6b7280;">Or copy this link:</p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 6px;">${acceptLink}</p>
      <p style="color: #ef4444; font-size: 13px;">⏰ This invitation expires in <strong>7 days</strong>.</p>
      <hr class="divider">
      <p style="color: #9ca3af; font-size: 13px;">If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}</p>
    </div>
  `, appName);

  await sendLicenseEmail({
    to,
    subject: `You are invited to join ${organizationName} on ${appName}`,
    html,
  });
}
