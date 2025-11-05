import type { AppRouteHandler } from '@/lib/types';

import { Buffer } from 'node:buffer';
import nodemailer from 'nodemailer';
import * as HSCode from 'stoker/http-status-codes';

import { createToast } from '@/utils/return';

import type { ReportSendToEmailRoute } from './routes';

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
      from: `Breaking Bad👻 ${env.SMTP_EMAIL}`,
      to: userEmail,
      subject: 'Monthly Payment Slip',
      text: `Hello ${userName}!`,
      html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #374151;">
              <p>Dear ${userName},</p>
              
              <p>Your monthly payment slip has been generated and is attached to this email.</p>
              
              <p>This document serves as an official record of your payment for the current period.</p>
              
              <p>For any inquiries, please contact our support team at support@fortunezip.com</p>
              
              <br>
              
              <p>Sincerely,<br>
              <strong>Finance Department</strong><br>
              FortuneZip</p>
            </div>
            `,
      attachments: reports,
    });
    console.log('Message sent: %s', info.messageId);
  })();

  return c.json(createToast('sent', 'Email'), HSCode.OK);
};
