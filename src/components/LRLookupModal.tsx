import React, { useState } from 'react';
import { DispatchRecord, LRItem } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { Search, Hash, FileText, Truck, ArrowRight, Printer, MapPin, Eye } from 'lucide-react';

interface LRLookupProps {
  records: DispatchRecord[];
  onOpenDispatch: (record: DispatchRecord) => void;
  onPrintDispatch: (record: DispatchRecord) => void;
}

export const LRLookupModal: React.FC<LRLookupProps> = ({
  records,
  onOpenDispatch,
  onPrintDispatch,
}) => {
  const [query, setQuery] = useState('');
  const [lookupType, setLookupType] = useState<'all' | 'lr' | 'invoice' | 'ewaybill'>('all');

  // Flatten all LRs across all dispatches with parent dispatch context
  const flatItems: {
    lr: LRItem;
    dispatch: DispatchRecord;
  }[] = [];

  for (const dsp of records) {
    for (const lr of dsp.lrs || []) {
      flatItems.push({ lr, dispatch: dsp });
    }
  }

  // Filter based on query
  const q = query.trim().toLowerCase();
  const results = flatItems.filter(({ lr, dispatch }) => {
    if (!q) return true;

    if (lookupType === 'lr') {
      return lr.lrNumber.toLowerCase().includes(q);
    }
    if (lookupType === 'invoice') {
      return (lr.invoiceNumbers || []).some((inv) => inv.toLowerCase().includes(q));
    }
    if (lookupType === 'ewaybill') {
      return (lr.ewaybillNumbers || []).some((ewb) => ewb.toLowerCase().includes(q));
    }

    // Default 'all'
    const matchesLR = lr.lrNumber.toLowerCase().includes(q);
    const matchesInvoice = (lr.invoiceNumbers || []).some((inv) =>
      inv.toLowerCase().includes(q)
    );
    const matchesEwaybill = (lr.ewaybillNumbers || []).some((ewb) =>
      ewb.toLowerCase().includes(q)
    );
    const matchesVehicle = dispatch.vehicleNumber.toLowerCase().includes(q);
    const matchesParty =
      lr.consignorName.toLowerCase().includes(q) ||
      lr.consigneeName.toLowerCase().includes(q);

    return matchesLR || matchesInvoice || matchesEwaybill || matchesVehicle || matchesParty;
  });

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Search className="h-5 w-5 text-amber-400" />
            <span>LR, Invoice & E-Waybill Universal Finder</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Instantly trace any Lorry Receipt (LR), invoice number, or e-waybill to its assigned vehicle, transporter, and consignment.
          </p>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search by LR Number, Invoice #, or E-waybill #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            {(
              [
                { id: 'all', label: 'All Fields' },
                { id: 'lr', label: 'LR No.' },
                { id: 'invoice', label: 'Invoice No.' },
                { id: 'ewaybill', label: 'E-Waybill No.' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setLookupType(t.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  lookupType === t.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-400 px-1 flex justify-between items-center">
        <span>
          Found <strong className="text-white">{results.length}</strong> matching LR record(s)
        </span>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-indigo-400 hover:underline"
          >
            Reset search
          </button>
        )}
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
          No matching LR, Invoice, or E-Waybill found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map(({ lr, dispatch }) => (
            <div
              key={`${dispatch.id}_${lr.id}`}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-sm space-y-3 transition-all"
            >
              {/* Header with LR No and Freight */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {lr.lrNumber}
                    </span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono">
                      {lr.weight} {lr.weightUnit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dispatch Date: {dispatch.date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Freight</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm">
                    {formatCurrency(lr.freightAmount)}
                  </div>
                </div>
              </div>

              {/* Vehicle & Transporter */}
              <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Truck className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="font-mono font-bold text-white">{dispatch.vehicleNumber}</span>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase">
                      ({dispatch.placement})
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {dispatch.transporterName}
                  </div>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => onPrintDispatch(dispatch)}
                    title="Print Slip"
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenDispatch(dispatch)}
                    title="Open Full Dispatch"
                    className="p-1.5 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Consignor -> Consignee */}
              <div className="text-xs text-slate-300 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <MapPin className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">
                    <strong className="text-slate-200">{lr.consignorName}</strong> ({lr.consignorCity})
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <MapPin className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">
                    <strong className="text-slate-200">{lr.consigneeName}</strong> ({lr.consigneeCity})
                  </span>
                </div>
              </div>

              {/* Invoices & E-waybills tags */}
              <div className="pt-1 space-y-1 text-xs">
                {lr.invoiceNumbers && lr.invoiceNumbers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-amber-400 font-semibold">Inv:</span>
                    {lr.invoiceNumbers.map((inv) => (
                      <span
                        key={inv}
                        className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1 py-0.2 rounded text-[10px] font-mono"
                      >
                        {inv}
                      </span>
                    ))}
                  </div>
                )}
                {lr.ewaybillNumbers && lr.ewaybillNumbers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-teal-400 font-semibold">EWB:</span>
                    {lr.ewaybillNumbers.map((ewb) => (
                      <span
                        key={ewb}
                        className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-1 py-0.2 rounded text-[10px] font-mono"
                      >
                        {ewb}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
