import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'KNHS Guidance <noreply@knhs.edu.ph>';

let transporter: nodemailer.Transporter | null = null;

console.log(`[Email Config] EMAIL_USER: ${EMAIL_USER ? EMAIL_USER.substring(0, 5) + '***' : 'NOT SET'}`);
console.log(`[Email Config] EMAIL_PASSWORD: ${EMAIL_PASSWORD ? '***configured***' : 'NOT SET'}`);
console.log(`[Email Config] EMAIL_FROM: ${EMAIL_FROM}`);

function getTransporter(): nodemailer.Transporter | null {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    console.log("[Email] Email credentials not configured");
    return null;
  }

  if (!transporter) {
    console.log("[Email] Creating Gmail transporter...");
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
    console.log("[Email] Gmail transporter created successfully");
  }

  return transporter;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    const transport = getTransporter();

    if (!transport) {
      console.log("Email not configured. Email not sent.");
      console.log(`Would send to ${to}: ${subject}`);
      return false;
    }

    const result = await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (result.messageId) {
      console.log(`✓ Email sent to ${to}: ${result.messageId}`);
      return true;
    } else {
      console.error(`✗ Email failed to ${to}`);
      return false;
    }
  } catch (error: any) {
    console.error("Email sending error:", error.message || error);
    return false;
  }
}

export function createAttendanceEmail(studentName: string, arrivalTime: string, grade: string, section: string, status: string): string {
  const statusColor = status === 'present' ? '#22c55e' : status === 'late' ? '#f59e0b' : '#ef4444';
  const statusText = status === 'present' ? 'On Time' : status === 'late' ? 'Late' : 'Absent';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Attendance Notification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Kaysuyo National High School</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">Guidance & Attendance System</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1e3a5f; margin-top: 0;">Attendance Notification</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">
              <strong style="color: #1e3a5f;">${studentName}</strong> has been marked:
            </p>
            <div style="display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">
              ${statusText}
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Time of Arrival:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #1e3a5f; font-weight: bold; text-align: right;">${arrivalTime}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Grade Level:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #1e3a5f; font-weight: bold; text-align: right;">Grade ${grade}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666;">Section:</td>
              <td style="padding: 10px 0; color: #1e3a5f; font-weight: bold; text-align: right;">${section}</td>
            </tr>
          </table>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #1e3a5f; margin-top: 20px;">
            <p style="margin: 0; color: #1e3a5f; font-size: 14px;">
              <strong>Reminder:</strong> Classes start at 7:00 AM. Students should arrive by 6:45 AM.
            </p>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated message from KNHS Guidance & Attendance System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
