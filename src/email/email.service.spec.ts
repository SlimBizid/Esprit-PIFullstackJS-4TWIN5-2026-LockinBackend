import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

describe('EmailService', () => {
  const originalEnv = process.env;
  let service: EmailService;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EMAIL_SERVICE: 'gmail',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASSWORD: 'secret',
      FRONTEND_URL: 'http://localhost:3000',
    };

    service = new EmailService();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a transporter during construction', () => {
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });
});
