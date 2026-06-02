/**
 * Payslip.jsx
 *
 * Production-level printable payslip.
 * Based on salary-view.php structure.
 *
 * Props:
 *   salary  {object} – the salary record from /api/payroll/:id
 *   onBack  {fn}     – navigate back to salary list
 */

import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

// Number to words (for the payslip footer line)
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToWords(-num);
  let words = '';
  if (Math.floor(num / 1000) > 0) { words += numberToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
  if (Math.floor(num / 100) > 0) { words += numberToWords(Math.floor(num / 100)) + ' Hundred '; num %= 100; }
  if (num > 0) {
    if (num < 20) words += ones[num];
    else words += tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }
  return words.trim();
}

export default function Payslip({ salary, onBack }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Payslip − ${salary.payslip_no}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 8px 12px; border: 1px solid #ddd; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .net { font-size: 16px; font-weight: bold; margin-top: 16px; }
        h2, h3, h4 { margin: 0 0 6px; }
        @media print { button { display:none; } }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    setIsExporting(true);
    const originalBackground = element.style.background;
    element.style.background = '#ffffff';

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`Payslip_${salary.payslip_no}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      element.style.background = originalBackground;
      setIsExporting(false);
    }
  };

  const monthLabel = new Date(salary.salary_month)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const netCents = Math.round(parseFloat(salary.net_salary || 0));
  const netWords = numberToWords(Math.abs(netCents));

  const earnRows = [
    ['Basic Salary', salary.basic],
    ['House Rent Allowance (HRA)', salary.hra],
    ['Dearness Allowance (DA)', salary.da],
    ['Conveyance', salary.conveyance],
    ['Other Allowance', salary.allowance],
    ['Medical Allowance', salary.medical],
    ['Others', salary.others_earn],
  ].filter(([, v]) => parseFloat(v) > 0);

  const dedRows = [
    ['Tax Deducted at Source (TDS)', salary.tds],
    ['Provident Fund', salary.pf],
    ['ESI', salary.esi],
    ['Leave Deduction', salary.leave_deduction],
    ['Professional Tax', salary.prof_tax],
    ['Labour Welfare', salary.labour_welfare],
    ['Others', salary.others_ded],
  ].filter(([, v]) => parseFloat(v) > 0);

  return (
    <div>
      {/* Controls – outside print area */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-sm btn-outline-primary" onClick={handleDownloadPDF} disabled={isExporting}>
          {isExporting ? 'Generating PDF...' : '📄 Download as PDF'}
        </button>
        <button className="btn btn-sm btn-outline-primary" onClick={handlePrint}>🖨️ Print</button>
        <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 8 }}>
          Payslip for {monthLabel}
        </span>
      </div>

      {/* ─── PRINTABLE PAYSLIP ─────────────────────────────────────────── */}
      <div ref={printRef} style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 1px 8px rgba(0,0,0,0.1)', padding: 36, maxWidth: 900, margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontWeight: 800, color: '#4f46e5', marginBottom: 4 }}>SmartHR</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              3864 Quiet Valley Lane,<br />Sherman Oaks, CA, 91403
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
              {salary.payslip_no}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              Salary Month: <strong>{monthLabel}</strong>
            </p>
          </div>
        </div>

        {/* Title */}
        <h4 style={{
          textAlign: 'center', background: '#f5f3ff', padding: '10px 0',
          borderRadius: 8, fontWeight: 700, color: '#4f46e5', marginBottom: 24,
        }}>
          Payslip for the month of {monthLabel}
        </h4>

        {/* Employee Info */}
        <div style={{
          display: 'flex', gap: 20, background: '#f9fafb', borderRadius: 10,
          padding: '16px 20px', marginBottom: 24, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>{salary.employee_name}</h5>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              {salary.designation && <span>{salary.designation}<br /></span>}
              Employee ID: <strong>{salary.emp_code}</strong>
            </p>
          </div>
          {salary.joining_date && (
            <div style={{ fontSize: 13, color: '#6b7280', flex: 1 }}>
              Joining Date: <strong>{new Date(salary.joining_date).toLocaleDateString()}</strong>

              {/* Financial block added here for cleaner layout */}
              <div style={{ marginTop: 8 }}>
                {salary.bank_name ? (
                  <>
                    Bank Name: <strong>{salary.bank_name}</strong><br />
                    Account No: <strong>{salary.account_number}</strong><br />
                    IFSC: <strong>{salary.ifsc_code}</strong>
                  </>
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>No Bank Details on File</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Earnings & Deductions tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Earnings */}
          <div>
            <h5 style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>Earnings</h5>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {earnRows.map(([label, val]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', fontSize: 13 }}>{label}</td>
                    <td style={{ padding: '8px 4px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                      {fmt(val)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#eff6ff' }}>
                  <td style={{ padding: '10px 4px', fontWeight: 700 }}>Total Earnings</td>
                  <td style={{ padding: '10px 4px', fontWeight: 700, textAlign: 'right', color: '#1d4ed8' }}>
                    {fmt(salary.total_earnings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <h5 style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>Deductions</h5>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {dedRows.length === 0 ? (
                  <tr><td style={{ padding: 8, fontSize: 13, color: '#9ca3af' }}>No deductions</td></tr>
                ) : dedRows.map(([label, val]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', fontSize: 13 }}>{label}</td>
                    <td style={{ padding: '8px 4px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                      {fmt(val)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#fef2f2' }}>
                  <td style={{ padding: '10px 4px', fontWeight: 700 }}>Total Deductions</td>
                  <td style={{ padding: '10px 4px', fontWeight: 700, textAlign: 'right', color: '#dc2626' }}>
                    {fmt(salary.total_deductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Salary */}
        <div style={{
          background: parseFloat(salary.net_salary) >= 0 ? '#f0fdf4' : '#fff7ed',
          borderRadius: 10, padding: '16px 20px',
          border: `2px solid ${parseFloat(salary.net_salary) >= 0 ? '#86efac' : '#fdba74'}`,
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            Net Salary: <span style={{
              color: parseFloat(salary.net_salary) >= 0 ? '#16a34a' : '#ea580c',
              fontSize: 20,
            }}>
              {fmt(salary.net_salary)}
            </span>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280' }}>
            ({netWords} only.)
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #e5e7eb', paddingTop: 16
        }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Generated on: {new Date().toLocaleDateString()}
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
            {salary.status === 'paid' && salary.paid_on && (
              <span>Paid on: {new Date(salary.paid_on).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
