import React, { useState } from 'react';
import { FreightInvoice } from '../types/invoice';
import { formatCurrency } from '../lib/calculations';
import { 
  Printer, 
  X, 
  Download, 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  Landmark, 
  ShieldCheck, 
  QrCode,
  FileText,
  Copy
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: FreightInvoice | null;
  onClose: () => void;
}

type CopyType = 'Original for Recipient' | 'Duplicate for Transporter' | 'Triplicate for Consignor' | 'Office Copy';

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  onClose,
}) => {
  const [selectedCopy, setSelectedCopy] = useState<CopyType>('Original for Recipient');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isRcm = invoice.isRcm;
  const isInterState = invoice.taxType === 'IGST';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-300 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:my-0 print:rounded-none">
        {/* Modal Toolbar (hidden on print) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {invoice.invoiceType} • {invoice.invoiceNumber}
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Billed to {invoice.billedTo.partyName}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Copy Type Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              {(['Original for Recipient', 'Duplicate for Transporter', 'Office Copy'] as CopyType[]).map((copy) => (
                <button
                  key={copy}
                  onClick={() => setSelectedCopy(copy)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    selectedCopy === copy
                      ? 'bg-[#00E676] text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {copy.split(' ')[0]}
                </button>
              ))}
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto print:p-0 print:m-0 print:overflow-visible text-xs font-sans">
          {/* Top Document Header & Copy Badge */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-black block">
                GOODS TRANSPORT AGENCY (GTA) ROAD FREIGHT
              </span>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950">
                {invoice.invoiceType.toUpperCase()}
              </h1>
              <span className="text-[10px] font-bold text-slate-600 block">
                SAC Code: <strong className="font-mono text-slate-900">{invoice.sacCode || '996511'}</strong> (Goods Transport Services of Goods by Road)
              </span>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded border border-slate-900 bg-slate-100 text-slate-900 mb-1">
                {selectedCopy}
              </span>
              <div className="text-xs text-slate-600 font-semibold">
                Invoice No: <strong className="font-mono text-sm text-slate-950 font-black">{invoice.invoiceNumber}</strong>
              </div>
              <div className="text-[11px] text-slate-600">
                Date: <strong className="font-mono font-bold text-slate-900">{invoice.invoiceDate}</strong> | Due: <strong className="font-mono font-bold text-slate-900">{invoice.dueDate}</strong>
              </div>
            </div>
          </div>

          {/* Issuer (Billed By) & Client (Billed To) 2-Column Box */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 mb-4 bg-slate-50/50">
            {/* Column 1: Issuer Company */}
            <div className="space-y-1 border-r border-slate-200 pr-3">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded inline-block mb-1">
                Transport Service Provider (Issuer)
              </span>
              <div className="font-black text-slate-950 text-sm">{invoice.billedBy.companyName}</div>
              <div className="text-[11px] text-slate-600 leading-snug">{invoice.billedBy.address}, {invoice.billedBy.city}, {invoice.billedBy.state} - {invoice.billedBy.pincode}</div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500 font-semibold">GSTIN: </span>
                  <strong className="font-mono text-slate-900">{invoice.billedBy.gstin || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">PAN: </span>
                  <strong className="font-mono text-slate-900">{invoice.billedBy.panNumber || 'N/A'}</strong>
                </div>
              </div>
              <div className="text-[10px] text-slate-500">
                Phone: {invoice.billedBy.phone} | Email: {invoice.billedBy.email}
              </div>
            </div>

            {/* Column 2: Billed To Party */}
            <div className="space-y-1 pl-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded inline-block mb-1">
                Billed To (Client / Consignor / Consignee)
              </span>
              <div className="font-black text-slate-950 text-sm">{invoice.billedTo.partyName}</div>
              <div className="text-[11px] text-slate-600 leading-snug">{invoice.billedTo.address || `${invoice.billedTo.city || ''}, ${invoice.billedTo.state || ''}`}</div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500 font-semibold">GSTIN: </span>
                  <strong className="font-mono text-slate-900">{invoice.billedTo.gstin || 'Unregistered'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">PAN: </span>
                  <strong className="font-mono text-slate-900">{invoice.billedTo.panNumber || 'N/A'}</strong>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center space-x-2">
                <span>State: <strong>{invoice.billedTo.state || 'N/A'}</strong></span>
                <span>•</span>
                <span>State Code: <strong className="font-mono">{invoice.billedTo.stateCode || '27'}</strong></span>
                {invoice.billedTo.contactPerson && (
                  <>
                    <span>•</span>
                    <span>Attn: {invoice.billedTo.contactPerson}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RCM Status Banner */}
          <div className={`px-3 py-1.5 rounded-lg border mb-4 flex items-center justify-between text-xs font-bold ${
            isRcm 
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-slate-900" />
              <span>Tax Payable under Reverse Charge (RCM): <strong className="uppercase font-black text-slate-950">{isRcm ? 'YES (Recipient liable to pay GST)' : 'NO (Forward Charge GST charged in Bill)'}</strong></span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white border border-slate-300">
              GTA Notification No. 11/2017-CT(R)
            </span>
          </div>

          {/* Consignment Line Items Table */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold text-[11px]">
                  <th className="border border-slate-300 p-2 text-left w-8">#</th>
                  <th className="border border-slate-300 p-2 text-left">LR No. & Date</th>
                  <th className="border border-slate-300 p-2 text-left">Vehicle No.</th>
                  <th className="border border-slate-300 p-2 text-left">Route (From ➔ To)</th>
                  <th className="border border-slate-300 p-2 text-left">Cargo Description</th>
                  <th className="border border-slate-300 p-2 text-right">Weight (MT)</th>
                  <th className="border border-slate-300 p-2 text-right">Freight Rate</th>
                  <th className="border border-slate-300 p-2 text-right">Freight Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-2 font-mono text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-black font-mono text-slate-950">{item.lrNumber}</div>
                      {item.lrDate && <div className="text-[10px] text-slate-500 font-mono">{item.lrDate}</div>}
                    </td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900 uppercase">
                      {item.vehicleNumber}
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-semibold text-slate-900">{item.origin} ➔ {item.destination}</div>
                    </td>
                    <td className="border border-slate-300 p-2 text-slate-700">
                      {item.commodity}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-semibold">
                      {item.weight} {item.weightUnit || 'MT'}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono text-slate-800">
                      ₹{item.rate} <span className="text-[10px] text-slate-500">/{item.rateType === 'per_mt' ? 'MT' : 'Trip'}</span>
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-black text-slate-950">
                      {formatCurrency(item.freightAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Computations & Bank Settlement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Left: Bank Details & Terms */}
            <div className="space-y-3">
              {/* Bank Settlement Box */}
              <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 font-black text-slate-900 text-xs border-b border-slate-200 pb-1">
                  <Landmark className="h-4 w-4 text-emerald-700" />
                  <span>Bank Payment Coordinates (RTGS / NEFT / IMPS)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Bank Name:</span>
                    <strong className="text-slate-900">{invoice.billedBy.bankName || 'HDFC Bank Ltd'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Number:</span>
                    <strong className="font-mono text-slate-950 text-xs">{invoice.billedBy.bankAccountNumber || '50200088991234'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">IFSC Code:</span>
                    <strong className="font-mono text-emerald-900 font-black">{invoice.billedBy.bankIfsc || 'HDFC0001234'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Branch:</span>
                    <span className="text-slate-800">{invoice.billedBy.bankBranch || 'Pune Main'}</span>
                  </div>
                </div>
                {invoice.billedBy.upiId && (
                  <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200">
                    UPI ID: <strong className="font-mono font-bold text-slate-900">{invoice.billedBy.upiId}</strong>
                  </div>
                )}
              </div>

              {/* Terms & Conditions Box */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-600 space-y-0.5 leading-relaxed">
                <strong className="text-slate-900 uppercase font-black block text-[10px]">Terms & Conditions:</strong>
                <p className="whitespace-pre-line">{invoice.termsAndConditions || '1. Goods carried at owner risk.\n2. Payment strictly due within 30 days.\n3. Delayed payment interest @18% p.a.\n4. Subject to Pune jurisdiction.'}</p>
              </div>
            </div>

            {/* Right: Calculations Totals Breakdown */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Cargo Weight:</span>
                <span className="font-bold text-slate-900 font-mono">{invoice.totalWeight} MT</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Basic Freight:</span>
                <span className="font-bold text-slate-900 font-mono">{formatCurrency(invoice.subTotalFreight)}</span>
              </div>

              {invoice.totalExtraCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Loading / Extra Charges:</span>
                  <span className="font-mono text-slate-900 font-semibold">{formatCurrency(invoice.totalExtraCharges)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
                <span>Taxable Freight Amount:</span>
                <span className="font-mono">{formatCurrency(invoice.taxableAmount)}</span>
              </div>

              {/* GST Calculations */}
              {isRcm ? (
                <div className="p-2 bg-amber-100/60 rounded border border-amber-200 text-[11px] space-y-0.5">
                  <div className="flex justify-between font-bold text-amber-950">
                    <span>GST @{invoice.gstRate}% (Under RCM):</span>
                    <span className="font-mono">₹0 (Paid by Recipient)</span>
                  </div>
                  <span className="text-[9px] text-amber-800 block">
                    GTA Reverse Charge applicable. Recipient pays GST of approx {formatCurrency(Math.round((invoice.taxableAmount * invoice.gstRate) / 100))} directly to Government.
                  </span>
                </div>
              ) : (
                <div className="border-t border-slate-200 pt-1 space-y-1 text-slate-700">
                  {invoice.taxType === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between">
                        <span>CGST @{invoice.cgstRate}%:</span>
                        <span className="font-mono text-slate-900">{formatCurrency(invoice.cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST @{invoice.sgstRate}%:</span>
                        <span className="font-mono text-slate-900">{formatCurrency(invoice.sgstAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>IGST @{invoice.igstRate}%:</span>
                      <span className="font-mono text-slate-900">{formatCurrency(invoice.igstAmount)}</span>
                    </div>
                  )}
                </div>
              )}

              {invoice.totalAdvancePaid > 0 && (
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>Less: Advance Paid:</span>
                  <span className="font-mono">-{formatCurrency(invoice.totalAdvancePaid)}</span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off:</span>
                  <span className="font-mono">{invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between text-slate-950 font-black border-t-2 border-slate-900 pt-1.5 text-sm bg-emerald-50/70 p-2 rounded">
                <span>Grand Total Net Payable:</span>
                <span className="font-mono text-base text-emerald-950 font-black">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Amount In Words Strip */}
          <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-300 mb-6 text-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px] block">Amount Chargeable in Words:</span>
            <strong className="text-slate-950 text-[12px] font-bold tracking-tight">{invoice.amountInWords}</strong>
          </div>

          {/* Signatures & Certification */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs">
            <div className="text-slate-600 space-y-1">
              <strong className="text-slate-900 font-bold block text-xs">Declaration:</strong>
              <p className="text-[10px] text-slate-500 leading-snug">
                We declare that this invoice shows the actual price of the goods transport services described and that all particulars are true and correct.
              </p>
            </div>

            <div className="text-right space-y-10">
              <div className="text-xs font-bold text-slate-900">
                For {invoice.billedBy.companyName}
              </div>
              <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-700 inline-block min-w-[200px] text-center">
                Authorized Signatory / Finance Officer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
