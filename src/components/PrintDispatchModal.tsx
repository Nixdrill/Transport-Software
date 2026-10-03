import React from 'react';
import { DispatchRecord } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { Printer, X, Download, Truck, CheckSquare } from 'lucide-react';

interface PrintDispatchModalProps {
  record: DispatchRecord | null;
  onClose: () => void;
}

export const PrintDispatchModal: React.FC<PrintDispatchModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Action Header (hidden on print) */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
              <Printer className="h-5 w-5" />
            </span>
            <h3 className="text-base font-black text-slate-950">
              Print Consignment & Lorry Receipt (LR) Slip
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 bg-white text-slate-900 overflow-y-auto print:p-0 print:m-0 print:overflow-visible">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-black uppercase tracking-wider text-slate-950 flex items-center space-x-2">
                  <span>CONSIGNMENT & LR DISPATCH MEMO</span>
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-1">
                  Transporter: <span className="text-slate-950 text-base">{record.transporterName}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Fleet Placement: <strong className="uppercase">{record.placement} Vehicle</strong>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-semibold">Dispatch Slip No</div>
                <div className="text-lg font-mono font-bold text-slate-900">{record.id.slice(0, 16).toUpperCase()}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Date: <strong className="font-mono text-sm">{record.date}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle & Trip Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-300 mb-6 text-xs">
            <div>
              <span className="text-slate-500 uppercase font-semibold block text-[10px]">
                Vehicle Number
              </span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {record.vehicleNumber}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold block text-[10px]">
                Driver Details
              </span>
              <span className="font-medium text-slate-900">
                {record.driverName || 'N/A'} {record.driverPhone ? `(${record.driverPhone})` : ''}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold block text-[10px]">
                From Party (Origin)
              </span>
              <span className="font-semibold text-slate-900">
                {record.fromParty}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold block text-[10px]">
                To Party (Destination)
              </span>
              <span className="font-semibold text-slate-900">
                {record.toParty}
              </span>
            </div>
          </div>

          {/* LRs Breakdown Table */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
              Attached Lorry Receipts (LR Details & Invoices)
            </h4>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 p-2 text-left">#</th>
                  <th className="border border-slate-300 p-2 text-left">LR No. & Date</th>
                  <th className="border border-slate-300 p-2 text-left">Consignor & City</th>
                  <th className="border border-slate-300 p-2 text-left">Consignee & City</th>
                  <th className="border border-slate-300 p-2 text-left">Invoices & E-Waybills</th>
                  <th className="border border-slate-300 p-2 text-right">Weight</th>
                  <th className="border border-slate-300 p-2 text-right">Rate</th>
                  <th className="border border-slate-300 p-2 text-right">Freight (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(record.lrs || []).map((lr, idx) => (
                  <tr key={lr.id || idx} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2 font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-bold font-mono text-slate-900">{lr.lrNumber}</div>
                      {lr.lrDate && <div className="text-[10px] text-slate-500">{lr.lrDate}</div>}
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-medium text-slate-900">{lr.consignorName}</div>
                      <div className="text-[10px] text-slate-500">{lr.consignorCity}</div>
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-medium text-slate-900">{lr.consigneeName}</div>
                      <div className="text-[10px] text-slate-500">{lr.consigneeCity}</div>
                    </td>
                    <td className="border border-slate-300 p-2">
                      {lr.invoiceNumbers && lr.invoiceNumbers.length > 0 && (
                        <div className="mb-0.5">
                          <span className="font-semibold text-slate-600">Inv: </span>
                          <span className="font-mono">{lr.invoiceNumbers.join(', ')}</span>
                        </div>
                      )}
                      {lr.ewaybillNumbers && lr.ewaybillNumbers.length > 0 && (
                        <div>
                          <span className="font-semibold text-slate-600">EWB: </span>
                          <span className="font-mono">{lr.ewaybillNumbers.join(', ')}</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {lr.weight} {lr.weightUnit}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      ₹{lr.rate}
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-950">
                      {formatCurrency(lr.freightAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MARKET TRANSPORTER HIRE & SETTLEMENT TABLE (When placement === 'Market') */}
          {record.placement === 'Market' && (
            <div className="mb-6 p-4 rounded border-2 border-slate-400 bg-amber-50/40">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Market Transporter Hire Contract & Settlement Voucher
                </h4>
                <span className="text-[10px] uppercase font-semibold text-slate-600">
                  Carrier: {record.transporterName}
                </span>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs mb-3 bg-white">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 p-1.5 text-left">LR No.</th>
                    <th className="border border-slate-300 p-1.5 text-right">Market Weight</th>
                    <th className="border border-slate-300 p-1.5 text-right">Market Rate</th>
                    <th className="border border-slate-300 p-1.5 text-right">Gross Market Freight</th>
                    <th className="border border-slate-300 p-1.5 text-right">Less: Commission</th>
                    <th className="border border-slate-300 p-1.5 text-right">Less: Advance</th>
                    <th className="border border-slate-300 p-1.5 text-right font-bold text-slate-950">Net Market Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.lrs || []).map((lr) => (
                    <tr key={lr.id} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900">{lr.lrNumber}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono">{lr.marketWeight || lr.weight} MT</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono">₹{lr.marketRate || 0}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{formatCurrency(lr.grossMarketFreight || 0)}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-600">-{formatCurrency(lr.marketCommission || 0)}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-rose-600">-{formatCurrency(lr.marketAdvance || 0)}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-black text-slate-900">{formatCurrency(lr.netMarketFreight || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center text-xs font-semibold text-slate-800 bg-slate-100 p-2 rounded border border-slate-300">
                <div>
                  <span>Total Gross Market Hire: </span>
                  <strong className="font-mono text-slate-900">{formatCurrency(record.totalGrossMarketFreight || 0)}</strong>
                </div>
                <div>
                  <span>Total Deductions (Comm + Adv): </span>
                  <strong className="font-mono text-rose-700">
                    -{formatCurrency((record.totalMarketCommission || 0) + (record.totalMarketAdvance || 0))}
                  </strong>
                </div>
                <div>
                  <span>Net Transporter Payable: </span>
                  <strong className="font-mono text-base text-slate-950">{formatCurrency(record.totalNetMarketFreight || 0)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Cost Summary Totals Box */}
          <div className="flex justify-end mb-8">
            <div className="w-72 bg-slate-50 border border-slate-300 rounded p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Total LRs Count:</span>
                <span className="font-bold text-slate-900 font-mono">{record.totalLrsCount || record.lrs?.length || 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Cargo Weight:</span>
                <span className="font-bold text-slate-900 font-mono">{record.totalWeight} MT</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                <span>Total Freight Amount:</span>
                <span className="font-bold text-slate-900 font-mono">{formatCurrency(record.totalFreightAmount)}</span>
              </div>
              {record.totalExtraCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Extra Charges:</span>
                  <span className="font-mono text-slate-900">{formatCurrency(record.totalExtraCharges)}</span>
                </div>
              )}
              {record.totalAdvance > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Less: Advance Paid:</span>
                  <span className="font-mono text-rose-600 font-medium">-{formatCurrency(record.totalAdvance)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-950 font-bold border-t-2 border-slate-400 pt-1 text-sm">
                <span>Net Balance Payable:</span>
                <span className="font-mono text-base text-slate-900">{formatCurrency(record.netPayable)}</span>
              </div>
            </div>
          </div>

          {/* Trip Notes */}
          {record.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs mb-8">
              <strong className="text-slate-700">Special Notes: </strong>
              <span className="text-slate-600">{record.notes}</span>
            </div>
          )}

          {/* Signatures & Certification */}
          <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-300 text-xs text-center text-slate-600">
            <div>
              <div className="border-t border-dashed border-slate-400 pt-2 font-semibold">
                Driver Signature & Date
              </div>
            </div>
            <div>
              <div className="border-t border-dashed border-slate-400 pt-2 font-semibold">
                Consignor / Dispatcher Signature
              </div>
            </div>
            <div>
              <div className="border-t border-dashed border-slate-400 pt-2 font-semibold">
                Authorized Signatory / Transporter
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
