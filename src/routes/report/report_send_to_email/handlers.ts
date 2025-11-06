import type { AppRouteHandler } from '@/lib/types';

import { Buffer } from 'node:buffer';
import nodemailer from 'nodemailer';
import * as HSCode from 'stoker/http-status-codes';

import { createToast } from '@/utils/return';

import type { BulkReportSendToEmailRoute, ReportSendToEmailRoute } from './routes';

import env from './../../../env';

// async function sendPaymentSlipEmail(
//   transporter: nodemailer.Transporter,
//   userName: string,
//   userEmail: string,
//   file: File,
// ) {
//   try {
//     // 1. Convert file to buffer
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     const reportAttachment = {
//       filename: file.name || 'report.pdf',
//       content: buffer,
//       contentType: file.type || 'application/pdf',
//     };

//     // 2. Define mail options
//     const mailOptions = {
//       from: `BWT Finance Department <${env.SMTP_EMAIL}>`,
//       to: userEmail,
//       subject: 'Monthly Payment Slip',
//       text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
//       html: `
//         <!DOCTYPE html>
//         <html lang="en">
//           <head>
//             <meta charset="UTF-8" />
//             <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//             <title>Monthly Payment Slip</title>
//           </head>
//           <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: system-ui, -apple-system, sans-serif;">
//             <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6f8; padding:40px 0;">
//               <tr>
//                 <td align="center">
//                   <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
//                     <tr>
//                       <td align="center" style="background-color:#004aad; padding:20px 0;">
//                         <h1 style="color:#ffffff; font-size:20px; margin:0; font-weight:600;">BWT Finance Department</h1>
//                       </td>
//                     </tr>
//                     <tr>
//                       <td style="padding:30px; color:#374151; font-size:16px; line-height:1.6;">
//                         <p>Dear <strong>${userName}</strong>,</p>
//                         <p>Your monthly payment slip has been generated and is attached to this email.</p>
//                         <p>This document serves as an official record of your payment for the current period.</p>
//                         <p>If you have any questions, please contact our support team at
//                           <a href="mailto:support@bwt.com" style="color:#004aad; text-decoration:none; font-weight:500;">support@bwt.com</a>.
//                         </p>
//                         <br>
//                         <p>Sincerely,<br>
//                         <strong>Finance Department</strong><br>
//                         BWT</p>
//                       </td>
//                     </tr>
//                     <tr>
//                       <td align="center" style="background-color:#f9fafb; color:#6b7280; font-size:13px; padding:15px 20px; border-top:1px solid #e5e7eb;">
//                         © ${new Date().getFullYear()} BWT. All rights reserved.
//                       </td>
//                     </tr>
//                   </table>
//                 </td>
//               </tr>
//             </table>
//           </body>
//         </html>
//       `,
//       attachments: [reportAttachment],
//     };

//     // 3. Send mail
//     const info = await transporter.sendMail(mailOptions);
//     console.log(`Message sent to ${userEmail}: ${info.messageId}`);
//     return { success: true, email: userEmail, messageId: info.messageId };
//   }
//   catch (error: any) {
//     console.error(`Failed to send email to ${userEmail}:`, error);
//     return { success: false, email: userEmail, error: error.message };
//   }
// }

export const reportSendToEmail: AppRouteHandler<ReportSendToEmailRoute> = async (c: any) => {
  const formData = await c.req.parseBody();

  const userEmail = formData.email;
  const userName = formData.name;
  const file = formData.report;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_EMAIL,
      pass: env.SMTP_PASSWORD,
    },
  });

  let reports: any = [];

  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    reports = [{
      filename: file.name || 'report.pdf',
      content: buffer,
      contentType: file.type || 'application/pdf',
    }];
  }

  (async () => {
    const info = await transporter.sendMail({
      from: `BWT Finance Department <${env.SMTP_EMAIL}>`,
      to: userEmail,
      subject: 'Monthly Payment Slip',
      text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
      html: `
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
                          <a href="mailto:support@bwt.com" style="color:#004aad; text-decoration:none; font-weight:500;">support@bwt.com</a>.
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
        `,
      attachments: reports,
    });
    console.log('Message sent: %s', info.messageId);
  })();

  return c.json(createToast('sent', 'Monthly Payment slip sent to email successfully'), HSCode.OK);
};

// export const bulkReportSendToEmail: AppRouteHandler<BulkReportSendToEmailRoute> = async (c: any) => {
//   const formDataObject = await c.req.parseBody();

//   console.log('Raw form data object received:', formDataObject);

//   // Convert the parsed body into an array of plain objects
//   const formDataArray = Array.isArray(formDataObject)
//     ? formDataObject.map(parseFormData)
//     : Object.values(formDataObject).map(parseFormData);

//   console.log('Parsed bulk form data:', formDataArray);

//   const transporter = nodemailer.createTransport({
//     host: env.SMTP_HOST,
//     port: env.SMTP_PORT,
//     secure: false,
//     auth: {
//       user: env.SMTP_EMAIL,
//       pass: env.SMTP_PASSWORD,
//     },
//   });

//   const results = await Promise.all(
//     formDataArray.map(async (formData: any, index: number) => {
//       try {
//         const userEmail = formData.email;
//         const userName = formData.name;
//         const file = formData.report;

//         if (!file) {
//           throw new Error(`No report file provided for ${userEmail || `unknown-email-${index}`}`);
//         }

//         console.log(`Processing email for ${userEmail}`);
//         console.log('File received:', file.name);

//         const arrayBuffer = await file.arrayBuffer();
//         const buffer = Buffer.from(arrayBuffer);

//         const reportAttachment = {
//           filename: file.name || 'report.pdf',
//           content: buffer,
//           contentType: file.type || 'application/pdf',
//         };

//         console.log(`Sending email to ${userEmail} with attachment ${reportAttachment.filename}`);

//         const info = await transporter.sendMail({
//           from: `BWT Finance Department <${env.SMTP_EMAIL}>`,
//           to: userEmail,
//           subject: 'Monthly Payment Slip',
//           text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
//           html: `... (HTML content here) ...`,
//           attachments: [reportAttachment],
//         });

//         console.log(`Message sent to ${userEmail}: ${info.messageId}`);
//         return { success: true, email: userEmail, messageId: info.messageId };
//       }
//       catch (error: any) {
//         console.error(`Failed to send email:`, error);
//         return { success: false, error: error.message };
//       }
//     }),
//   );

//   const successCount = results.filter(result => result.success).length;
//   const failureCount = results.length - successCount;

//   return c.json(
//     createToast(
//       'sent',
//       `${successCount} emails sent successfully, ${failureCount} failed.`,
//     ),
//     HSCode.OK,
//   );
// };
// // Helper function to parse FormData into plain objects
// function parseFormData(formData: any): any {
//   const plainObject: any = {};
//   if (typeof formData === 'object' && formData !== null) {
//     for (const key in formData) {
//       if (Object.prototype.hasOwnProperty.call(formData, key)) {
//         plainObject[key] = formData[key];
//       }
//     }
//   }
//   return plainObject;
// }

export const bulkReportSendToEmail: AppRouteHandler<BulkReportSendToEmailRoute> = async (c: any) => {
  const formData = await c.req.formData(); // Use formData() instead of parseBody()

  console.log('Raw form data entries:');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }

  // Group form data by index
  const entries: Record<string, Record<string, any>> = {}; // Explicitly define the type
  for (const [key, value] of formData.entries()) {
    const match = key.match(/(\d+)\.(.+)/);
    if (match) {
      const index = match[1];
      const field = match[2];
      if (!entries[index])
        entries[index] = {};
      entries[index][field] = value;
    }
  }

  const formDataArray = Object.values(entries);
  console.log('Processed form data array:', formDataArray);

  // Rest of your email sending logic...
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_EMAIL,
      pass: env.SMTP_PASSWORD,
    },
  });

  const results = await Promise.all(
    formDataArray.map(async (formData: any, index: number) => {
      try {
        const userEmail = formData.email;
        const userName = formData.name;
        const file = formData.report;

        if (!file) {
          throw new Error(`No report file provided for ${userEmail || `unknown-email-${index}`}`);
        }

        console.log(`Processing email for ${userEmail}`);

        // Handle file conversion
        let buffer;
        if (file instanceof File || file.arrayBuffer) {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
        else if (file.buffer) {
          buffer = file.buffer;
        }
        else {
          throw new Error('Invalid file format');
        }

        const reportAttachment = {
          filename: file.name || 'report.pdf',
          content: buffer,
          contentType: file.type || 'application/pdf',
        };

        console.log(`Sending email to ${userEmail} with attachment ${reportAttachment.filename}`);

        const info = await transporter.sendMail({
          from: `BWT Finance Department <${env.SMTP_EMAIL}>`,
          to: userEmail,
          subject: 'Monthly Payment Slip',
          text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
          html: `... (HTML content here) ...`,
          attachments: [reportAttachment],
        });

        console.log(`Message sent to ${userEmail}: ${info.messageId}`);
        return { success: true, email: userEmail, messageId: info.messageId };
      }
      catch (error: any) {
        console.error(`Failed to send email to index ${index}:`, error);
        return { success: false, error: error.message };
      }
    }),
  );

  const successCount = results.filter(result => result.success).length;
  const failureCount = results.length - successCount;

  return c.json(
    createToast(
      'sent',
      `${successCount} emails sent successfully, ${failureCount} failed.`,
    ),
    HSCode.OK,
  );
};
