import React, { useState } from 'react';
import { DispatchRecord, LRItem } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { Search, Truck, Printer, MapPin, Eye } from 'lucide-react';

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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-amber-100 text-amber-900">
              <Search className="h-5 w-5" />
            </span>
            <span>LR, Invoice & E-Waybill Universal Finder</span>
          </h3>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Instantly trace any Lorry Receipt (LR), invoice number, or e-waybill to its assigned vehicle, transporter, and consignment.
          </p>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search by LR Number, Invoice #, or E-waybill #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] font-mono shadow-xs"
            />
          </div>

          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
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
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  lookupType === t.id
                    ? 'bg-[#00E676] text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-600 px-1 flex justify-between items-center font-medium">
        <span>
          Found <strong className="text-slate-950 font-black">{results.length}</strong> matching LR record(s)
        </span>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline"
          >
            Reset search
          </button>
        )}
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium shadow-xs">
          No matching LR, Invoice, or E-Waybill found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {results.map(({ lr, dispatch }) => (
            <div
              key={`${dispatch.id}_${lr.id}`}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-all"
            >
              {/* Header with LR No and Freight */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-slate-950 text-sm">
                      {lr.lrNumber}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-mono font-bold">
                      {lr.weight} {lr.weightUnit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Dispatch Date: {dispatch.date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Freight</div>
                  <div className="font-mono font-black text-emerald-800 text-sm">
                    {formatCurrency(lr.freightAmount)}
                  </div>
                </div>
              </div>

              {/* Vehicle & Transporter */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Truck className="h-3.5 w-3.5 text-slate-600" />
                    <span className="font-mono font-black text-slate-950">{dispatch.vehicleNumber}</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold uppercase ${
                      dispatch.placement === 'Market'
                        ? 'bg-[#FFB700] text-stone-950 border border-amber-400'
                        : 'bg-[#00D2FF] text-slate-950 border border-cyan-400'
                    }`}>
                      {dispatch.placement}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px] mt-1 font-medium">
                    {dispatch.transporterName}
                  </div>
                </div>

                <div className="flex space-x-1.5">
                  <button
                    onClick={() => onPrintDispatch(dispatch)}
                    title="Print Slip"
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenDispatch(dispatch)}
                    title="Open Full Dispatch"
                    className="p-2 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black border border-emerald-400 shadow-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Consignor -> Consignee */}
              <div className="text-xs text-slate-700 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-600">
                  <MapPin className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">
                    <strong className="text-slate-950">{lr.consignorName}</strong> ({lr.consignorCity})
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-600">
                  <MapPin className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">
                    <strong className="text-slate-950">{lr.consigneeName}</strong> ({lr.consigneeCity})
                  </span>
                </div>
              </div>

              {/* Invoices & E-waybills tags */}
              <div className="pt-1 space-y-1.5 text-xs">
                {lr.invoiceNumbers && lr.invoiceNumbers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-amber-900 font-bold">Inv:</span>
                    {lr.invoiceNumbers.map((inv) => (
                      <span
                        key={inv}
                        className="bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                      >
                        {inv}
                      </span>
                    ))}
                  </div>
                )}
                {lr.ewaybillNumbers && lr.ewaybillNumbers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-cyan-900 font-bold">EWB:</span>
                    {lr.ewaybillNumbers.map((ewb) => (
                      <span
                        key={ewb}
                        className="bg-cyan-100 text-cyan-950 border border-cyan-300 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
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
