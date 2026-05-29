const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const sendEmailViaSendGrid = async (to, subject, htmlContent) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      html: htmlContent,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, message: error.message };
  }
};

const sendSMSViaTwilio = async (phoneNumber, message) => {
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, message: error.message };
  }
};

const generateInvoiceHTML = (invoiceData) => {
  const { invoiceNumber, date, items, subtotal, tax, total, customerName } = invoiceData;

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: #f5f5f5; padding: 20px; }
          .items { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; }
          .total { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice</h1>
          <p>Invoice #${invoiceNumber}</p>
          <p>Date: ${date}</p>
        </div>
        
        <p>Dear ${customerName},</p>
        
        <div class="items">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice}</td>
                  <td>$${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="text-align: right; margin-top: 20px;">
          <p>Subtotal: $${subtotal}</p>
          <p>Tax: $${tax}</p>
          <p class="total">Total: $${total}</p>
        </div>
        
        <p>Thank you for your business!</p>
      </body>
    </html>
  `;
};

module.exports = {
  sendEmailViaSendGrid,
  sendSMSViaTwilio,
  generateInvoiceHTML,
};
