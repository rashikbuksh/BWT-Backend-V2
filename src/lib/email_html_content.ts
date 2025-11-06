export function generateEmailHtmlContent(userName: string, supportEmail: string): string {
  return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Monthly Payment Slip</title>
                </head>
                <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: system-ui, -apple-system, sans-serif;">

                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6f8; padding:40px 0;">
                    <tr>
                        <td align="center">
                        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                            
                            <!-- Header -->
                            <tr>
                            <td align="center" style="background-color:#004aad; padding:20px 0;">
                                <h1 style="color:#ffffff; font-size:20px; margin:0; font-weight:600;">BWT Finance Department</h1>
                            </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                            <td style="padding:30px; color:#374151; font-size:16px; line-height:1.6;">
                                <p>Dear <strong>${userName}</strong>,</p>

                                <p>Your monthly payment slip has been generated and is attached to this email.</p>

                                <p>This document serves as an official record of your payment for the current period.</p>

                                <p>If you have any questions, please contact our support team at 
                                <a href="mailto:${supportEmail}" style="color:#004aad; text-decoration:none; font-weight:500;">${supportEmail}</a>.
                                </p>

                                <br>

                                <p>Sincerely,<br>
                                <strong>Finance Department</strong><br>
                                BWT</p>
                            </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                            <td align="center" style="background-color:#f9fafb; color:#6b7280; font-size:13px; padding:15px 20px; border-top:1px solid #e5e7eb;">
                                © ${new Date().getFullYear()} BWT. All rights reserved.
                            </td>
                            </tr>

                        </table>
                        </td>
                    </tr>
                    </table>
                </body>
                </html>
                `;
}
