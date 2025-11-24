import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendCertificate(certificateData, requesterEmail, certificatePath) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER || 'noreply@vitalevents.gov.et',
        to: requesterEmail,
        subject: `Your ${certificateData.type} is Ready`,
        html: this.generateEmailTemplate(certificateData),
        attachments: [
          {
            filename: `${certificateData.certificateId}.pdf`,
            path: certificatePath,
            contentType: 'application/pdf'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Certificate email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending certificate email:', error);
      throw error;
    }
  }

  generateEmailTemplate(certificateData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Certificate Ready</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background-color: #f4f4f4;
                padding: 20px;
                text-align: center;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .content {
                padding: 20px;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            .footer {
                margin-top: 20px;
                padding: 10px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .certificate-info {
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Federal Democratic Republic of Ethiopia</h1>
            <h2>Vital Events Registration</h2>
        </div>
        
        <div class="content">
            <h3>Your Certificate is Ready!</h3>
            
            <p>Dear ${certificateData.requesterName},</p>
            
            <p>We are pleased to inform you that your ${certificateData.type} has been successfully generated and is ready for download.</p>
            
            <div class="certificate-info">
                <h4>Certificate Details:</h4>
                <ul>
                    <li><strong>Certificate ID:</strong> ${certificateData.certificateId}</li>
                    <li><strong>Type:</strong> ${certificateData.type}</li>
                    <li><strong>Registration Number:</strong> ${certificateData.registrationNumber}</li>
                    <li><strong>Issue Date:</strong> ${certificateData.issueDate}</li>
                    <li><strong>Registrar:</strong> ${certificateData.registrarName}</li>
                </ul>
            </div>
            
            <p>Your certificate is attached to this email as a PDF file. Please save it securely as it is an official document.</p>
            
            <p><strong>Important Notes:</strong></p>
            <ul>
                <li>This certificate contains a QR code for verification purposes</li>
                <li>Keep this document safe as it may be required for official purposes</li>
                <li>If you have any questions, please contact our support team</li>
            </ul>
            
            <p>Thank you for using our Vital Events Registration system.</p>
            
            <p>Best regards,<br>
            Vital Events Registration Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>Federal Democratic Republic of Ethiopia - Vital Events Registration</p>
        </div>
    </body>
    </html>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export default EmailService;
