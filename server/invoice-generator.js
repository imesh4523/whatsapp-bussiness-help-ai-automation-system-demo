import PDFDocument from 'pdfkit';

/**
 * Generates a premium PDF invoice in memory.
 * @param {Object} data - Invoice data
 * @param {string} data.fullName - Customer name
 * @param {string} data.email - Customer email
 * @param {string} data.planName - Plan name
 * @param {string} data.amount - Amount (e.g., "LKR 14,990.00")
 * @param {string} data.billingCycle - Billing cycle ("Monthly" or "Yearly")
 * @param {string} [data.invoiceNo] - Optional invoice number
 * @returns {Promise<Buffer>} - PDF file buffer
 */
export function generateInvoicePdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#00d166';
      const darkColor = '#111827';
      const greyColor = '#64748b';
      const lightGrey = '#e2e8f0';

      // 1. Header (Logo & Title)
      doc.fillColor(primaryColor)
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('agent', 56, 56, { continued: true })
         .fillColor(darkColor)
         .text('bunny');

      doc.fillColor(darkColor)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('INVOICE', 400, 56, { align: 'right' });

      // Spacing
      doc.moveDown(1.5);

      // Horizontal Line
      doc.strokeColor(lightGrey)
         .lineWidth(1)
         .moveTo(56, 95)
         .lineTo(539, 95)
         .stroke();

      doc.moveDown(1.5);

      // 2. Invoice Meta Info
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const invoiceNo = data.invoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text('Invoice Details:', 56, 120);
      doc.fillColor(greyColor).font('Helvetica').text(`Invoice No: ${invoiceNo}`, 56, 135);
      doc.text(`Date: ${today}`, 56, 150);
      doc.text('Payment Status: ', 56, 165, { continued: true })
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text('PAID');

      // Bill To (Right side)
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text('Billed To:', 320, 120);
      doc.fillColor(greyColor).font('Helvetica').text(data.fullName, 320, 135);
      doc.text(data.email, 320, 150);

      doc.moveDown(3);

      // Table Header Divider
      const tableTop = 210;
      doc.strokeColor(lightGrey)
         .lineWidth(1)
         .moveTo(56, tableTop)
         .lineTo(539, tableTop)
         .stroke();

      // 3. Subscription Details Table Header
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 56, tableTop + 8);
      doc.text('Billing Cycle', 280, tableTop + 8);
      doc.text('Amount', 450, tableTop + 8, { align: 'right' });

      doc.strokeColor(lightGrey)
         .lineWidth(1)
         .moveTo(56, tableTop + 24)
         .lineTo(539, tableTop + 24)
         .stroke();

      // Table Row
      doc.fillColor(greyColor).font('Helvetica');
      doc.text(`${data.planName} Subscription`, 56, tableTop + 36);
      doc.text(data.billingCycle, 280, tableTop + 36);
      doc.fillColor(darkColor).font('Helvetica-Bold').text(data.amount, 450, tableTop + 36, { align: 'right' });

      // Table Footer Divider
      doc.strokeColor(lightGrey)
         .lineWidth(1)
         .moveTo(56, tableTop + 56)
         .lineTo(539, tableTop + 56)
         .stroke();

      doc.moveDown(2);

      // 4. Total Amount Block
      doc.fillColor(greyColor).fontSize(11).font('Helvetica').text('Total Paid:', 320, tableTop + 76);
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text(data.amount, 400, tableTop + 73, { align: 'right' });

      // 5. Footer / Watermark
      doc.fillColor(greyColor)
         .fontSize(9)
         .font('Helvetica')
         .text('Thank you for choosing AgentBunny! Your subscription is now fully active.', 56, 500, { align: 'center' });
      doc.text('For any billing queries or support, contact support@agent-bunny.com', 56, 515, { align: 'center' });

      // Complete Document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
