// PDF Invoice Generation
// Uses PDFKit for generating professional invoices

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
  /**
   * Generate PDF invoice
   * @param {Object} data - Invoice data
   * @param {String} outputPath - Path to save PDF
   */
  static generateInvoice(data, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        // Create directory if it doesn't exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Create PDF document
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Header
        doc.fontSize(25).font('Helvetica-Bold').text('INVOICE', 50, 50);
        doc.fontSize(10).font('Helvetica').text(`Invoice #${data.invoiceNumber}`, 50, 85);
        doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 50, 100);

        // Company info (left side)
        doc.fontSize(12).font('Helvetica-Bold').text('MarocVoyage', 50, 140);
        doc.fontSize(10).font('Helvetica');
        doc.text('Tourism Platform', 50, 158);
        doc.text('Casablanca, Morocco', 50, 173);
        doc.text('www.marocvoyage.com', 50, 188);

        // Customer info (right side)
        doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 350, 140);
        doc.fontSize(10).font('Helvetica');
        doc.text(`${data.customerName}`, 350, 158);
        doc.text(`${data.customerEmail}`, 350, 173);
        doc.text(`${data.customerPhone}`, 350, 188);

        // Line separator
        doc.moveTo(50, 220).lineTo(550, 220).stroke();

        // Items table header
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Description', 50, 240);
        doc.text('Quantity', 300, 240);
        doc.text('Unit Price', 380, 240);
        doc.text('Total', 480, 240);

        // Line separator
        doc.moveTo(50, 260).lineTo(550, 260).stroke();

        // Items
        doc.fontSize(10).font('Helvetica');
        let yPosition = 280;
        let subtotal = 0;

        data.items.forEach((item) => {
          doc.text(item.description, 50, yPosition);
          doc.text(item.quantity.toString(), 300, yPosition);
          doc.text(`$${item.unitPrice.toFixed(2)}`, 380, yPosition);
          doc.text(`$${(item.quantity * item.unitPrice).toFixed(2)}`, 480, yPosition);
          subtotal += item.quantity * item.unitPrice;
          yPosition += 30;
        });

        // Line separator
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

        yPosition += 20;

        // Calculations
        doc.fontSize(11).font('Helvetica');
        doc.text('Subtotal:', 400, yPosition);
        doc.text(`$${subtotal.toFixed(2)}`, 480, yPosition);

        yPosition += 25;

        const tax = subtotal * 0.1; // 10% tax
        doc.text('Tax (10%):', 400, yPosition);
        doc.text(`$${tax.toFixed(2)}`, 480, yPosition);

        yPosition += 25;

        const total = subtotal + tax;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total:', 400, yPosition);
        doc.text(`$${total.toFixed(2)}`, 480, yPosition);

        // Payment status
        yPosition += 50;
        doc.fontSize(11).font('Helvetica-Bold');
        doc.fillColor(data.paymentStatus === 'paid' ? 'green' : 'orange');
        doc.text(`Status: ${data.paymentStatus.toUpperCase()}`, 50, yPosition);
        doc.fillColor('black');

        // Footer
        yPosition = 700;
        doc.fontSize(9).font('Helvetica');
        doc.text('Thank you for your business!', 50, yPosition);
        doc.text('For questions, contact support@marocvoyage.com', 50, yPosition + 15);

        doc.end();

        stream.on('finish', () => {
          resolve(outputPath);
        });

        stream.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate invoice from booking data
   */
  static async generateFromBooking(booking, customer) {
    const invoiceNumber = `INV-${Date.now()}`;
    const outputPath = path.join(
      process.cwd(),
      'uploads',
      'invoices',
      `${invoiceNumber}.pdf`
    );

    const invoiceData = {
      invoiceNumber,
      date: booking.createdAt || new Date(),
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      paymentStatus: booking.paymentStatus || 'pending',
      items: [
        {
          description: booking.description || 'Service Booking',
          quantity: 1,
          unitPrice: booking.amount,
        },
      ],
    };

    return this.generateInvoice(invoiceData, outputPath);
  }
}

module.exports = InvoiceGenerator;
