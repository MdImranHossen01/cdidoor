import { format, isValid } from 'date-fns';

function generateBarcodeHtml(value: string): string {
  const CODE39_MAP: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
  };

  const clean = value.trim().toUpperCase().replace(/[^0-9A-Z\-\.\ ]/g, '');
  const encoded = `*${clean}*`;

  let totalWidth = 0;
  for (const char of encoded) {
    const pat = CODE39_MAP[char] || CODE39_MAP['*'];
    for (let j = 0; j < 9; j++) {
      const isWide = pat[j] === '1';
      totalWidth += isWide ? 3 : 1;
    }
    totalWidth += 1;
  }

  let svgHtml = `<svg viewBox="0 0 ${totalWidth} 35" width="100%" height="35" xmlns="http://www.w3.org/2000/svg" style="max-width: 220px; display: block; margin: 0 auto; shape-rendering: crispEdges;" shape-rendering="crispEdges">`;
  let currentX = 0;
  for (const char of encoded) {
    const pat = CODE39_MAP[char] || CODE39_MAP['*'];
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pat[j] === '1';
      const width = isWide ? 3 : 1;
      if (isBar) {
        svgHtml += `<rect x="${currentX}" y="0" width="${width}" height="35" fill="#000000" />`;
      }
      currentX += width;
    }
    currentX += 1;
  }
  svgHtml += `</svg>`;
  return svgHtml;
}

export async function printBillPOS(bill: any, settings: any, targetWindow?: Window | null): Promise<void> {
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || "Store";
  const brandEmail = settings?.contact?.email || "";
  const brandPhone = settings?.contact?.phone || "";
  const brandAddress = settings?.contact?.address || "";

  const docType = bill.documentType || 'bill';
  let title = "RETAIL INVOICE";
  if (docType === 'offer') title = "QUOTATION";
  else if (docType === 'chalan') title = "CHALLAN";

  const dateVal = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const formattedDate = isValid(dateVal) ? format(dateVal, 'dd/MM/yyyy hh:mm a') : 'N/A';

  const items = Array.isArray(bill.items) ? bill.items : [];

  const subtotal = Math.round(bill.subtotal || 0);
  const deliveryCharge = Math.round(bill.deliveryCharge || 0);
  const serviceFee = Math.round(bill.serviceFee || 0);
  const discount = Math.round(bill.discount || 0);
  const total = Math.round(bill.total || 0);
  const prevDue = Math.round(bill.prevDue || 0);
  const gTotal = Math.round(bill.gTotal || 0);
  const cashIn = Math.round(bill.cashIn || 0);
  const currentBillDue = Math.round(bill.currentBillDue || 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>POS Invoice - ${bill.invoiceNo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              width: 72mm;
              margin: 0;
              padding: 4mm 2mm;
            }
          }
          body {
            font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 2mm;
          }
          .center {
            text-align: center;
          }
          .brand-name {
            font-size: 15px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .brand-details {
            font-size: 9px;
            color: #333;
            margin-bottom: 4px;
          }
          .title-box {
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: 900;
            font-size: 11px;
            display: inline-block;
            margin: 4px 0;
            text-transform: uppercase;
          }
          .barcode-box {
            text-align: center;
            margin: 3px 0 6px 0;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .info-table {
            width: 100%;
            font-size: 10.5px;
            margin-bottom: 5px;
          }
          .info-table td {
            padding: 1.5px 0;
            vertical-align: top;
          }
          .info-label {
            font-weight: 700;
            width: 75px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 5px;
          }
          .items-table th {
            border-bottom: 1px dashed #000;
            text-align: left;
            padding: 4px 0;
            font-weight: 700;
          }
          .items-table td {
            padding: 4px 0;
            vertical-align: top;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .summary-table {
            width: 100%;
            font-size: 10.5px;
            margin-top: 4px;
          }
          .summary-table td {
            padding: 2px 0;
          }
          .summary-label {
            font-weight: 600;
          }
          .grand-total {
            font-size: 12px;
            font-weight: 900;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 4px 0 !important;
          }
          .footer-msg {
            margin-top: 10px;
            font-size: 9px;
            color: #444;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="brand-name">${brandName}</div>
          <div class="brand-details">
            ${brandAddress ? `<div>${brandAddress}</div>` : ''}
            <div>Phone: ${brandPhone}</div>
            ${brandEmail ? `<div>Email: ${brandEmail}</div>` : ''}
          </div>
          <div class="title-box">${title}</div>
          <div class="barcode-box">
            ${generateBarcodeHtml(bill.invoiceNo || 'INV-0000')}
          </div>
        </div>

        <div class="divider"></div>

        <table class="info-table">
          <tr>
            <td class="info-label">Invoice No:</td>
            <td style="font-weight: 700;">${bill.invoiceNo}</td>
          </tr>
          <tr>
            <td class="info-label">Date:</td>
            <td>${formattedDate}</td>
          </tr>
          <tr>
            <td class="info-label">Customer:</td>
            <td style="font-weight: 700; text-transform: uppercase;">${bill.clientName || 'N/A'}</td>
          </tr>
          ${bill.clientPhone ? `
            <tr>
              <td class="info-label">Mobile:</td>
              <td style="font-weight: 700;">${bill.clientPhone}</td>
            </tr>
          ` : ''}
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center" style="width: 35px;">Qty</th>
              ${docType !== 'chalan' ? `
                <th class="text-right" style="width: 55px;">Rate</th>
                <th class="text-right" style="width: 60px;">Total</th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>
                  <strong>${item.name || ''}</strong>
                  ${item.batchNumber && item.batchNumber !== 'auto' ? `<br/><span style="font-size: 8px; color: #555;">Batch: ${item.batchNumber}</span>` : ''}
                </td>
                <td class="text-center">${item.quantity || 1}</td>
                ${docType !== 'chalan' ? `
                  <td class="text-right">৳${Math.round(item.price || 0)}</td>
                  <td class="text-right">৳${Math.round((item.price || 0) * (item.quantity || 1))}</td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <table class="summary-table">
          ${docType !== 'chalan' ? `
            <tr>
              <td class="summary-label">Subtotal:</td>
              <td class="text-right">৳${subtotal.toLocaleString()}</td>
            </tr>
            ${deliveryCharge > 0 ? `
              <tr>
                <td class="summary-label">Delivery Charge:</td>
                <td class="text-right">+ ৳${deliveryCharge.toLocaleString()}</td>
              </tr>
            ` : ''}
            ${serviceFee > 0 ? `
              <tr>
                <td class="summary-label">Service Fee:</td>
                <td class="text-right">+ ৳${serviceFee.toLocaleString()}</td>
              </tr>
            ` : ''}
            ${discount > 0 ? `
              <tr>
                <td class="summary-label">Discount:</td>
                <td class="text-right">- ৳${discount.toLocaleString()}</td>
              </tr>
            ` : ''}
            ${prevDue > 0 ? `
              <tr>
                <td class="summary-label">Previous Due:</td>
                <td class="text-right">+ ৳${prevDue.toLocaleString()}</td>
              </tr>
            ` : ''}
            <tr class="grand-total">
              <td class="summary-label" style="font-size: 12px;">Grand Total:</td>
              <td class="text-right" style="font-size: 12px; font-weight: 900;">৳${gTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="summary-label">Cash Received:</td>
              <td class="text-right" style="color: green; font-weight: 700;">৳${cashIn.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="summary-label">Remaining Due:</td>
              <td class="text-right" style="color: red; font-weight: 700;">৳${currentBillDue.toLocaleString()}</td>
            </tr>
          ` : `
            <tr>
              <td class="summary-label">Total Items:</td>
              <td class="text-right">${items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)}</td>
            </tr>
          `}
        </table>

        <div class="divider"></div>

        <div class="center footer-msg">
          <div style="font-weight: 700; margin-bottom: 2px;">Thank you for shopping with us!</div>
          <div>Software Developed by Antigravity</div>
        </div>
      </body>
    </html>
  `;

  const printWindow = targetWindow || window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      printWindow.focus();
      printWindow.onafterprint = () => {
        try {
          printWindow.close();
        } catch (e) {}
      };
      printWindow.print();
    };

    printWindow.onload = triggerPrint;
    setTimeout(() => {
      if (!hasPrinted) {
        triggerPrint();
      }
    }, 500);
  }
}
