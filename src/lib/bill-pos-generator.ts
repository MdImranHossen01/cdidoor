import { format, isValid } from 'date-fns';

export async function printBillPOS(bill: any, settings: any, targetWindow?: Window | null): Promise<void> {
  const brandName = settings?.brandName || "CDI Door Ind";
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
            margin-bottom: 8px;
          }
          .title-box {
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: 900;
            font-size: 11px;
            display: inline-block;
            margin: 5px 0;
            text-transform: uppercase;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .info-table {
            width: 100%;
            font-size: 10px;
            margin-bottom: 6px;
          }
          .info-table td {
            padding: 1px 0;
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
            margin-bottom: 6px;
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
            font-size: 10px;
            margin-top: 6px;
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
            margin-top: 12px;
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
        </div>

        <div class="divider"></div>

        <table class="info-table">
          <tr>
            <td class="info-label">Invoice No:</td>
            <td>${bill.invoiceNo}</td>
          </tr>
          <tr>
            <td class="info-label">Date:</td>
            <td>${formattedDate}</td>
          </tr>
          <tr>
            <td class="info-label">Customer:</td>
            <td>${bill.clientName || 'N/A'}</td>
          </tr>
          ${bill.clientPhone ? `
            <tr>
              <td class="info-label">Mobile:</td>
              <td>${bill.clientPhone}</td>
            </tr>
          ` : ''}
          ${bill.clientAddress ? `
            <tr>
              <td class="info-label">Address:</td>
              <td>${bill.clientAddress}</td>
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
    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
    if (printWindow.document.readyState === 'complete') {
      triggerPrint();
    } else {
      printWindow.onload = triggerPrint;
    }
  }
}
