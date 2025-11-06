// Invoice-pdfkit-boilerplate.js
// Adjusted layout so all content fits neatly within A4 page width (no overflow)
// Install: npm install pdfkit

const fs = require('fs');
const PDFDocument = require('pdfkit');

function formatCurrency(amount, currency = 'INR') {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function addTableRow(doc, y, item, qty, unitPrice, gstValue, lineTotal) {
  const col1 = 50;   // Item
  const col2 = 300;  // Qty
  const col3 = 360;  // Unit Price
  const col4 = 440;  // GST Value
  const col5 = 520;  // Line Total

  doc
    .fontSize(10)
    .text(item, col1, y, { width: 230 })
    .text(qty, col2, y, { width: 40, align: 'right' })
    .text(formatCurrency(unitPrice), col3, y, { width: 70, align: 'right' })
    .text(formatCurrency(gstValue), col4, y, { width: 70, align: 'right' })
    .text(formatCurrency(lineTotal), col5, y, { width: 70, align: 'right' });
}

function drawHr(doc, y) {
  doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(570, y).stroke();
}

function generateInvoice(invoice, path) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const outPath = path || invoice.fileName || 'invoice-output.pdf';

  if (typeof outPath === 'string') {
    doc.pipe(fs.createWriteStream(outPath));
  } else if (outPath && typeof outPath.pipe === 'function') {
    doc.pipe(outPath);
  } else {
    throw new Error('Path must be filepath string or writable stream');
  }

  // Header / Vendor info
  doc.fontSize(18).text(invoice.vendor?.name || '', 50, 50);
  doc.fontSize(10).text(invoice.vendor?.address || '', 50, 70, { width: 400 });
  doc.text(`Tax Number: ${invoice.vendor?.taxNumber || ''}`, 50, 90);
  doc.text(`Phone: ${invoice.vendor?.phone || ''}`, 50, 105);

  // Invoice metadata
  const metaTop = 140;
  doc
    .fontSize(12)
    .text(`Invoice #: ${invoice.invoiceDetails?.number || ''}`, 50, metaTop)
    .text(`Date: ${invoice.invoiceDetails?.date || ''}`, 50, metaTop + 15)
    .text(`Type: ${invoice.invoiceDetails?.type || ''}`, 50, metaTop + 30)
    .text(`Status: ${invoice.status || 'pending'}`, 350, metaTop)
    .text(`Error: ${invoice.error ? 'Yes' : 'No'}`, 350, metaTop + 15);

  if (invoice.status === 'rejected') {
    doc
      .fontSize(10)
      .fillColor('red')
      .text(`Rejection Reason: ${invoice.rejectionReason || 'N/A'}`, 350, metaTop + 35, { width: 200 })
      .fillColor('black');
  }

  drawHr(doc, metaTop + 70);

  // Table header
  let tableTop = metaTop + 90;
  doc.fontSize(10).text('Item', 50, tableTop);
  doc.text('Qty', 300, tableTop, { width: 40, align: 'right' });
  doc.text('Unit Price', 360, tableTop, { width: 70, align: 'right' });
  doc.text('GST', 440, tableTop, { width: 70, align: 'right' });
  doc.text('Total', 520, tableTop, { width: 70, align: 'right' });

  drawHr(doc, tableTop + 15);

  // Items listing and calculations
  tableTop = tableTop + 30;
  let position = tableTop;
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  let subtotal = 0;
  let totalGST = 0;

  items.forEach((it) => {
    const qty = Number(it.qty || 0);
    const unit = Number(it.unitPrice || 0);
    const gstPercent = Number(it.gstPercent || 0);

    const lineBase = qty * unit;
    const gstValue = (lineBase * gstPercent) / 100;
    const lineTotal = lineBase + gstValue;

    subtotal += lineBase;
    totalGST += gstValue;

    addTableRow(doc, position, it.description || '', qty, unit, gstValue, lineTotal);
    position += 20;

    if (position > 700) {
      doc.addPage();
      position = 50;
    }
  });

  drawHr(doc, position + 10);

  // Totals
  const computedTotalInvoiceValue = subtotal + totalGST;
  const totalInvoiceValue = typeof invoice.totalInvoiceValue === 'number' ? invoice.totalInvoiceValue : computedTotalInvoiceValue;
  const totalGSTValue = typeof invoice.totalGSTValue === 'number' ? invoice.totalGSTValue : totalGST;

  const totalTop = position + 30;
  doc.fontSize(10)
    .text('Subtotal', 400, totalTop, { width: 100, align: 'right' })
    .text(formatCurrency(subtotal), 520, totalTop, { width: 70, align: 'right' })
    .text('Total GST', 400, totalTop + 20, { width: 100, align: 'right' })
    .text(formatCurrency(totalGSTValue), 520, totalTop + 20, { width: 70, align: 'right' })
    .fontSize(12)
    .text('Grand Total', 400, totalTop + 50, { width: 100, align: 'right' })
    .text(formatCurrency(totalInvoiceValue), 520, totalTop + 50, { width: 70, align: 'right' });

  // Footer
  const footerY = 770;
  doc.fontSize(9).text(`File: ${invoice.fileName || outPath}`, 50, footerY, { align: 'left' });
  if (invoice.createdAt || invoice.updatedAt) {
    const ts = `Created: ${invoice.createdAt || 'N/A'} | Updated: ${invoice.updatedAt || 'N/A'}`;
    doc.fontSize(8).text(ts, 50, footerY + 12, { align: 'left', width: 500 });
  }

  doc.end();
}

// Example usage
if (require.main === module) {
  const sampleInvoice = {
    vendor: {
      name: 'Acme Pvt Ltd',
      address: '123 Example Road, Mumbai, MH, 400001',
      taxNumber: '27ABCDE1234F2Z5',
      phone: '+91-22-1234-5678',
    },
    invoiceDetails: {
      number: 'INV-2025-0001',
      date: new Date().toISOString().split('T')[0],
      type: 'tax-invoice',
    },
    items: [
      { description: 'Website design', qty: 1, unitPrice: 15000, gstPercent: 18 },
      { description: 'Hosting (1 year)', qty: 1, unitPrice: 3000, gstPercent: 18 },
      { description: 'Domain registration', qty: 1, unitPrice: 1200, gstPercent: 18 },
    ],
    status: 'pending',
    error: false,
    rejectionReason: null,
    fileName: 'formatted-invoice.pdf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  generateInvoice(sampleInvoice, sampleInvoice.fileName);
  console.log('formatted-invoice.pdf created');
}

module.exports = { generateInvoice };