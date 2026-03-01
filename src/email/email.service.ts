import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!process.env.EMAIL_SERVICE) {
      throw new Error('EMAIL_SERVICE is not defined');
    }

    if (!process.env.EMAIL_USER) {
      throw new Error('EMAIL_USER is not defined');
    }

    if (!process.env.EMAIL_PASSWORD) {
      throw new Error('EMAIL_PASSWORD is not defined');
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error('FRONTEND_URL is not defined');
    }
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
