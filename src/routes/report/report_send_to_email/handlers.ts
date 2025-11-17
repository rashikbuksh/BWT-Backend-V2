import type { AppRouteHandler } from '@/lib/types';

import { Buffer } from 'node:buffer';
import nodemailer from 'nodemailer';
import * as HSCode from 'stoker/http-status-codes';

import { generateEmailHtmlContent } from '@/lib/email_html_content';
import { generatePdf } from '@/lib/monthly_payment_slip_pdf';
import { createToast } from '@/utils/return';

import type { BulkReportSendToEmailRoute, BulkReportSendToEmailWithoutFormRoute, ReportSendToEmailRoute } from './routes';

import env from './../../../env';

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
      from: `${env.DEPARTMENT_NAME} <${env.SMTP_EMAIL}>`,
      to: userEmail,
      subject: 'Monthly Payment Slip',
      text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
      html: generateEmailHtmlContent(userName, env.SUPPORT_EMAIL),
      attachments: reports,
    });
    console.log('Message sent: %s', info.messageId); // eslint-disable-line no-console
  })();

  return c.json(createToast('sent', 'Monthly Payment slip sent to email successfully'), HSCode.OK);
};

export const bulkReportSendToEmail: AppRouteHandler<BulkReportSendToEmailRoute> = async (c: any) => {
  const formDataObject = await c.req.parseBody();

  // console.log('Received form data for bulk email:', formDataObject);

  // Extract and pair employees with their reports
  const formDataArray = Object.keys(formDataObject)
    .filter(key => key.startsWith('employees'))
    .map((key) => {
      const index = key.match(/\d+/)?.[0]; // Extract the index from the key
      const employee = JSON.parse(formDataObject[key]); // Parse the employee JSON
      const report = formDataObject[`reports[${index}]`]; // Get the corresponding report
      return { ...employee, report }; // Combine employee and report into one object
    });

  // console.log('Prepared form data for bulk email:', formDataArray);

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
        const { email: userEmail, name: userName, report: file } = formData;

        if (!file) {
          throw new Error(`No report file provided for ${userEmail || `unknown-email-${index}`}`);
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const reportAttachment = {
          filename: file.name || 'report.pdf',
          content: buffer,
          contentType: file.type || 'application/pdf',
        };

        const info = await transporter.sendMail({
          from: `${env.DEPARTMENT_NAME} <${env.SMTP_EMAIL}>`,
          to: userEmail,
          subject: 'Monthly Payment Slip',
          text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
          html: generateEmailHtmlContent(userName, env.SUPPORT_EMAIL),
          attachments: [reportAttachment],
        });

        console.log(`Message sent to ${userEmail}: ${info.messageId}`); // eslint-disable-line no-console
        return { success: true, email: userEmail, messageId: info.messageId };
      }
      catch (error: any) {
        console.error(`Failed to send email:`, error);
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

export const bulkReportSendToEmailWithoutForm: AppRouteHandler<BulkReportSendToEmailWithoutFormRoute> = async (c: any) => {
  const requestBody = await c.req.json();

  console.log('Received request body for bulk email without form:', requestBody); // eslint-disable-line no-console

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_EMAIL,
      pass: env.SMTP_PASSWORD,
    },
  });
  await Promise.all(
    requestBody.map(async (item: any) => {
      const { email: userEmail, name: userName, employee_name, start_date, employee_designation_name, employee_department_name, total_salary } = item;
      const pdfBytes = await generatePdf({
        employee_name,
        start_date,
        employee_designation_name,
        employee_department_name,
        total_salary,
      });
      const pdfBuffer: Buffer = Buffer.from(pdfBytes);
      const reportAttachment = {
        filename: `Monthly_Payment_Slip_${employee_name.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      };
      const info = await transporter.sendMail({
        from: `${env.DEPARTMENT_NAME} <${env.SMTP_EMAIL}>`,
        to: userEmail,
        subject: 'Monthly Payment Slip',
        text: `Hello ${userName}, your monthly payment slip has been generated and is attached.`,
        html: generateEmailHtmlContent(userName, env.SUPPORT_EMAIL),
        attachments: [reportAttachment],
      });
      console.log(`Message sent to ${userEmail}: ${info.messageId}`); // eslint-disable-line no-console
    },
    ),
  );

  return c.json(
    createToast(
      'sent',
      `All emails sent successfully.`,
    ),
    HSCode.OK,
  );
};
