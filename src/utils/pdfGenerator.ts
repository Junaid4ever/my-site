interface InvoiceData {
  invoiceNumber: number;
  clientName: string;
  fromDate: string;
  toDate: string;
  invoiceDate: string;
  meetings: Array<{
    date: string;
    meetingName: string;
    members: number;
    memberType: string;
    rate: number;
    amount: number;
    status?: string;
    screenshotUrl?: string;
  }>;
  adjustments?: Array<{
    date: string;
    reason: string;
    amount: number;
    adminNote?: string;
  }>;
  totalMeetings: number;
  totalMembers: number;
  totalDpMembers?: number;
  totalForeignMembers?: number;
  subtotal: number;
  adjustmentTotal: number;
  netAmount: number;
  lastPaymentDate?: string;
  includeScreenshots?: boolean;
}

export function generateClientInvoicePDF(data: InvoiceData) {
  const totalIndianMembers = data.totalMembers - (data.totalDpMembers || 0) - (data.totalForeignMembers || 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${data.invoiceNumber} - ${data.clientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 30px;
          background: #f3f4f6;
          color: #1f2937;
        }
        .invoice-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
          padding: 40px 50px;
          color: white;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .company-info h1 {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .company-info p {
          font-size: 14px;
          opacity: 0.9;
        }
        .invoice-badge {
          text-align: right;
        }
        .invoice-badge h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .invoice-badge p {
          font-size: 18px;
          font-weight: 600;
        }
        .details-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 30px 50px;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }
        .detail-box h3 {
          font-size: 11px;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .detail-box p {
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 6px;
        }
        .detail-box p strong {
          color: #4b5563;
          font-weight: 600;
          margin-right: 8px;
        }
        .period-banner {
          background: #eff6ff;
          color: #1e40af;
          padding: 16px 50px;
          text-align: center;
          border-bottom: 2px solid #3b82f6;
        }
        .period-banner h3 {
          font-size: 16px;
          font-weight: 700;
        }
        .table-container {
          padding: 30px 50px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #f3f4f6;
          border-bottom: 2px solid #1e40af;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          color: #374151;
          letter-spacing: 0.5px;
        }
        th:last-child { text-align: right; }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
          color: #374151;
        }
        td:last-child {
          text-align: right;
          font-weight: 600;
          color: #1e40af;
        }
        tbody tr:hover { background: #f9fafb; }
        .member-type-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-indian {
          background: #fef3c7;
          color: #92400e;
        }
        .badge-dp {
          background: #fae8ff;
          color: #86198f;
        }
        .badge-foreign {
          background: #dbeafe;
          color: #1e40af;
        }
        .screenshot-row {
          background: #f0fdf4 !important;
        }
        .screenshot-row td {
          padding: 16px 12px !important;
        }
        .screenshot-container {
          text-align: center;
          margin-top: 8px;
        }
        .screenshot-label {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .screenshot-container img {
          max-width: 400px;
          width: 100%;
          height: auto;
          border-radius: 8px;
          border: 2px solid #d1d5db;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .adjustment-row {
          background: #fef3c7 !important;
        }
        .adjustment-row td {
          color: #92400e;
          font-weight: 600;
        }
        .not-live-row {
          background: #fee2e2 !important;
        }
        .not-live-badge {
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          margin-left: 8px;
        }
        .summary-section {
          background: #f9fafb;
          padding: 30px 50px;
          border-top: 2px solid #e5e7eb;
        }
        .breakdown-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }
        .breakdown-title {
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .breakdown-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
          color: #4b5563;
          border-bottom: 1px dashed #e5e7eb;
        }
        .breakdown-row:last-child {
          border-bottom: none;
        }
        .breakdown-row span:last-child {
          font-weight: 600;
          color: #1f2937;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          font-size: 15px;
          color: #374151;
        }
        .summary-row span:last-child {
          font-weight: 700;
          color: #1f2937;
        }
        .summary-row.total {
          border-top: 3px solid #1e40af;
          margin-top: 16px;
          padding-top: 20px;
          font-size: 24px;
          font-weight: 900;
          color: #1e40af;
        }
        .payment-info {
          background: #fffbeb;
          border: 2px solid #fbbf24;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 50px 30px 50px;
        }
        .payment-info h3 {
          color: #92400e;
          font-size: 15px;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .payment-info p {
          color: #78350f;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .footer {
          text-align: center;
          padding: 25px 50px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 12px;
          border-top: 2px solid #e5e7eb;
        }
        .footer p {
          margin-bottom: 6px;
        }
        .footer p:first-child {
          font-weight: 700;
          color: #1e40af;
          font-size: 14px;
        }
        @media print {
          body { padding: 0; background: white; }
          .invoice-container { box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="header-content">
            <div class="company-info">
              <h1>JUNAID MEETINGS</h1>
              <p>Professional Meeting Management Services</p>
              <p>GST: 29XXXXX1234X1Z5</p>
            </div>
            <div class="invoice-badge">
              <h2>INVOICE</h2>
              <p>#${String(data.invoiceNumber).padStart(5, '0')}</p>
            </div>
          </div>
        </div>

        <div class="details-section">
          <div class="detail-box">
            <h3>Bill To</h3>
            <p><strong>Client:</strong> ${data.clientName}</p>
            ${data.lastPaymentDate ? `<p><strong>Last Payment:</strong> ${new Date(data.lastPaymentDate).toLocaleDateString('en-IN')}</p>` : ''}
          </div>
          <div class="detail-box">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Date:</strong> ${new Date(data.invoiceDate).toLocaleDateString('en-IN')}</p>
            <p><strong>Invoice #:</strong> ${String(data.invoiceNumber).padStart(5, '0')}</p>
          </div>
        </div>

        <div class="period-banner">
          <h3>Service Period: ${new Date(data.fromDate).toLocaleDateString('en-IN')} to ${new Date(data.toDate).toLocaleDateString('en-IN')}</h3>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 12%">Date</th>
                <th style="width: ${data.includeScreenshots ? '28%' : '38%'}">Meeting Name</th>
                <th style="width: 10%">Members</th>
                <th style="width: 15%">Type</th>
                <th style="width: 12%">Rate (₹)</th>
                <th style="width: 13%">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${data.meetings.map(meeting => `
                <tr ${meeting.status === 'not_live' ? 'class="not-live-row"' : ''}>
                  <td>${new Date(meeting.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>
                    ${meeting.meetingName}
                    ${meeting.status === 'not_live' ? '<span class="not-live-badge">NOT LIVE</span>' : ''}
                  </td>
                  <td>${meeting.members}</td>
                  <td>
                    <span class="member-type-badge ${
                      meeting.memberType === 'foreigners' ? 'badge-foreign' :
                      meeting.memberType === 'dp' ? 'badge-dp' :
                      'badge-indian'
                    }">
                      ${meeting.memberType === 'foreigners' ? 'Foreign' : meeting.memberType === 'dp' ? 'DP Member' : 'Indian'}
                    </span>
                  </td>
                  <td>₹${meeting.rate}</td>
                  <td>₹${meeting.amount.toFixed(2)}</td>
                </tr>
                ${data.includeScreenshots && meeting.screenshotUrl ? `
                <tr class="screenshot-row">
                  <td colspan="6">
                    <div class="screenshot-container">
                      <div class="screenshot-label">📸 Meeting Screenshot</div>
                      <img src="${meeting.screenshotUrl}" alt="Screenshot" />
                    </div>
                  </td>
                </tr>` : ''}
              `).join('')}
              ${data.adjustments && data.adjustments.length > 0 ? data.adjustments.map(adj => `
                <tr class="adjustment-row">
                  <td>${new Date(adj.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td colspan="4">
                    <strong>Adjustment:</strong> ${adj.reason}
                    ${adj.adminNote && adj.adminNote !== adj.reason ? `<br><span style="font-size: 11px; color: #92400e; opacity: 0.9;">Note: ${adj.adminNote}</span>` : ''}
                  </td>
                  <td><strong>${adj.amount > 0 ? '+' : ''}₹${adj.amount.toFixed(2)}</strong></td>
                </tr>
              `).join('') : ''}
            </tbody>
          </table>
        </div>

        <div class="summary-section">
          ${(data.totalDpMembers || data.totalForeignMembers) ? `
          <div class="breakdown-section">
            <div class="breakdown-title">📊 Member Type Breakdown</div>
            ${totalIndianMembers > 0 ? `
            <div class="breakdown-row">
              <span>🇮🇳 Indian Members</span>
              <span>${totalIndianMembers} members</span>
            </div>` : ''}
            ${data.totalDpMembers ? `
            <div class="breakdown-row">
              <span>💎 DP Members</span>
              <span>${data.totalDpMembers} members</span>
            </div>` : ''}
            ${data.totalForeignMembers ? `
            <div class="breakdown-row">
              <span>🌍 Foreign Members</span>
              <span>${data.totalForeignMembers} members</span>
            </div>` : ''}
            <div class="breakdown-row" style="border-top: 2px solid #1e40af; padding-top: 12px; margin-top: 8px; font-weight: 700; color: #1e40af;">
              <span>Total Members</span>
              <span>${data.totalMembers} members</span>
            </div>
          </div>` : ''}

          <div class="summary-row">
            <span>Total Meetings:</span>
            <span>${data.totalMeetings}</span>
          </div>
          <div class="summary-row">
            <span>Total Members:</span>
            <span>${data.totalMembers}</span>
          </div>
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.adjustmentTotal !== 0 ? `
          <div class="summary-row">
            <span>Adjustments:</span>
            <span>${data.adjustmentTotal > 0 ? '+' : ''}₹${data.adjustmentTotal.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>NET AMOUNT:</span>
            <span>₹${data.netAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <h3>💳 Payment Terms & Information</h3>
          <p>• Payment Due: Upon Receipt</p>
          <p>• All amounts are in Indian Rupees (₹)</p>
          <p>• For payment queries, please reference Invoice #${String(data.invoiceNumber).padStart(5, '0')}</p>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice and does not require a signature</p>
          <p style="margin-top: 15px;">JUNAID MEETINGS - Professional Meeting Management Services</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const invoiceWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!invoiceWindow) {
    alert('Please allow popups for this site to download invoice');
    return;
  }

  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
}

export function generateInvoicePDF(data: any) {
  console.warn('generateInvoicePDF is deprecated, use generateClientInvoicePDF instead');
}

interface IncomeReportData {
  adminName: string;
  startDate: string;
  endDate: string;
  dailyIncome: Array<{
    date: string;
    amount: number;
    meetings: number;
  }>;
  totalIncome: number;
  totalMeetings: number;
}

export function generateIncomeReportPDF(data: IncomeReportData) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Income Report - ${data.adminName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 30px;
          background: #f3f4f6;
          color: #1f2937;
        }
        .report-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          padding: 40px 50px;
          color: white;
        }
        .header h1 {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        .period-section {
          background: #f0fdf4;
          padding: 20px 50px;
          border-bottom: 2px solid #10b981;
          text-align: center;
        }
        .period-section h2 {
          font-size: 18px;
          color: #065f46;
          font-weight: 700;
        }
        .table-container {
          padding: 30px 50px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #f3f4f6;
          border-bottom: 2px solid #059669;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          color: #374151;
          letter-spacing: 0.5px;
        }
        th:last-child { text-align: right; }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
          color: #374151;
        }
        td:last-child {
          text-align: right;
          font-weight: 600;
          color: #059669;
        }
        tbody tr:hover { background: #f9fafb; }
        .summary-section {
          background: #f9fafb;
          padding: 30px 50px;
          border-top: 2px solid #e5e7eb;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          font-size: 15px;
          color: #374151;
        }
        .summary-row span:last-child {
          font-weight: 700;
          color: #1f2937;
        }
        .summary-row.total {
          border-top: 3px solid #059669;
          margin-top: 16px;
          padding-top: 20px;
          font-size: 24px;
          font-weight: 900;
          color: #059669;
        }
        .footer {
          text-align: center;
          padding: 25px 50px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 12px;
          border-top: 2px solid #e5e7eb;
        }
        @media print {
          body { padding: 0; background: white; }
          .report-container { box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <h1>💰 Income Report</h1>
          <p>Admin: ${data.adminName}</p>
          <p>Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        <div class="period-section">
          <h2>Period: ${new Date(data.startDate).toLocaleDateString('en-IN')} to ${new Date(data.endDate).toLocaleDateString('en-IN')}</h2>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 40%">Date</th>
                <th style="width: 30%">Meetings</th>
                <th style="width: 30%">Income (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${data.dailyIncome.map(day => `
                <tr>
                  <td>${new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>${day.meetings}</td>
                  <td>₹${day.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="summary-section">
          <div class="summary-row">
            <span>Total Meetings:</span>
            <span>${data.totalMeetings}</span>
          </div>
          <div class="summary-row total">
            <span>TOTAL INCOME:</span>
            <span>₹${data.totalIncome.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated report</p>
          <p style="margin-top: 10px;">JUNAID MEETINGS - Professional Meeting Management Services</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const reportWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!reportWindow) {
    alert('Please allow popups for this site to download PDF');
    return;
  }

  reportWindow.document.write(htmlContent);
  reportWindow.document.close();
}
