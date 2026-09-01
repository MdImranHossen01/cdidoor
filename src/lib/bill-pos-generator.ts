import { format, isValid } from 'date-fns';

export async function printBillPOS(bill: any, settings: any, targetWindow?: Window | null): Promise<void> {
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || "Store";
  const brandEmail = settings?.contact?.email || "";
  const brandPhone = settings?.contact?.phone || "";
  const brandAddress = settings?.contact?.address || "";

  const docType = bill.documentType || 'bill';
  let title = "RETAIL INVOICE";
  if (docType === 'offer') title = "QUOTATION";
  else if (docType === 'chalan') title = "CHALLAN";

  const dateVal = bill.createdAt ? new Date(bill.createdAt) : (bill.date ? new Date(bill.date) : new Date());
  const formattedDate = isValid(dateVal) ? format(dateVal, 'dd/MM/yyyy hh:mm a') : 'N/A';

  const invoiceNo = bill.invoiceNo || 'INV-0000';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(invoiceNo)}`;

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
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .brand-details {
            font-size: 9.5px;
            color: #333;
            line-height: 1.3;
            margin-bottom: 4px;
          }
          .title-box {
            display: inline-block;
            border: 1px solid #000;
            padding: 1px 8px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 4px 0 2px 0;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .info-table {
            width: 100%;
            font-size: 10px;
            margin-bottom: 4px;
          }
          .info-table td {
            padding: 1px 0;
            vertical-align: top;
          }
          .info-label {
            width: 65px;
            color: #444;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin: 4px 0;
          }
          .items-table th {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 3px 0;
            font-weight: 700;
            text-align: left;
          }
          .items-table td {
            padding: 3px 0;
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
            ${bill.couponCode && (bill.couponDiscount || 0) > 0 ? `
              <tr>
                <td class="summary-label">Coupon (${bill.couponCode}):</td>
                <td class="text-right">- ৳${Math.round(bill.couponDiscount).toLocaleString()}</td>
              </tr>
            ` : ''}
            ${(bill.walletAmountUsed || 0) > 0 ? `
              <tr>
                <td class="summary-label">Tokens Used:</td>
                <td class="text-right">- ৳${Math.round(bill.walletAmountUsed).toLocaleString()}</td>
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
              <td class="text-right" style="font-weight: 700;">৳${cashIn.toLocaleString()}</td>
            </tr>
            ${cashIn > gTotal ? `
              <tr>
                <td class="summary-label" style="color: #059669; font-weight: 700;">Change Return:</td>
                <td class="text-right" style="color: #059669; font-weight: 900; font-size: 11px;">৳${(cashIn - gTotal).toLocaleString()}</td>
              </tr>
            ` : ''}
            <tr>
              <td class="summary-label">Remaining Due:</td>
              <td class="text-right" style="color: ${currentBillDue > 0 ? 'red' : '#059669'}; font-weight: 700;">৳${currentBillDue.toLocaleString()}</td>
            </tr>
          ` : `
            <tr>
              <td class="summary-label">Total Items:</td>
              <td class="text-right">${items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)}</td>
            </tr>
          `}
        </table>

        <div class="divider"></div>

        <div class="center" style="margin: 8px auto 6px auto;">
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 75px; height: 75px; display: block; margin: 0 auto;" />
          <div style="font-size: 9px; font-weight: 700; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px;">${invoiceNo}</div>
        </div>

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
