import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // Do not fail on invalid certificates or self-signed certs
    rejectUnauthorized: false,
  },
});

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Fifa Prediction" <noreply@example.com>',
    to: email,
    subject: "Reset your password — WC26 Predict",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <div style="background: linear-gradient(135deg, rgba(0, 198, 255, 0.1) 0%, rgba(0, 114, 255, 0.1) 100%); border-radius: 16px; padding: 16px; display: inline-block; border: 1px solid rgba(0, 198, 255, 0.15);">
                      <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/26wc-logo.png" height="48" alt="WC26 Predict Logo" style="display: block; width: auto;">
                    </div>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td align="center" style="padding: 0 40px 30px 40px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Password Reset</h1>
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #475569;">
                      You recently requested to reset the password for your <strong>26WC Prediction</strong> account. Click the button below to securely set a new password.
                    </p>
                    
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(90deg, #00c6ff 0%, #0072ff 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(0, 198, 255, 0.25);">
                      Reset My Password
                    </a>
                    
                    <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 20px; color: #64748b;">
                      If you didn't request a password reset, you can safely ignore this email. This link will expire in exactly 1 hour.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      &copy; ${new Date().getFullYear()} WC26 Predict
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    console.log(`[Email] Attempting to send password reset email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Successfully sent email. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email] Failed to send email to ${email}:`, error);
    throw error;
  }
};
