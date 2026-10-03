import React, { useState, useEffect } from 'react';
import { LRItem, RateType, WeightUnit, PlacementType } from '../types/dispatch';
import { 
  calculateLRFreight, 
  calculateGrossMarketFreight, 
  calculateNetMarketFreight, 
  formatCurrency 
} from '../lib/calculations';
import { 
  Trash2, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Calculator, 
  Hash, 
  Building2, 
  MapPin, 
  Plus, 
  X, 
  Sparkles,
  ArrowRight,
  Truck,
  TrendingUp
} from 'lucide-react';

interface LRItemFormProps {
  item: LRItem;
  index: number;
  totalCount: number;
  placement: PlacementType;
  onChange: (updated: LRItem) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  partySuggestions?: {
    consignors: string[];
    consignees: string[];
    cities: string[];
  };
}

export const LRItemForm: React.FC<LRItemFormProps> = ({
  item,
  index,
  totalCount,
  placement,
  onChange,
  onDelete,
  onDuplicate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newInvoiceInput, setNewInvoiceInput] = useState('');
  const [newEwaybillInput, setNewEwaybillInput] = useState('');
  const [isManualFreight, setIsManualFreight] = useState(false);

  // Auto-calculate client billing freight amount
  const computedFreight = calculateLRFreight(
    item.weight,
    item.weightUnit,
    item.rate,
    item.rateType
  );

  // Auto-calculate billing freight
  useEffect(() => {
    if (!isManualFreight) {
      if (item.freightAmount !== computedFreight) {
        onChange({
          ...item,
          freightAmount: computedFreight,
        });
      }
    }
  }, [item.weight, item.weightUnit, item.rate, item.rateType, computedFreight, isManualFreight]);

  // Handle adding one or multiple comma-separated invoice numbers
  const handleAddInvoice = () => {
    if (!newInvoiceInput.trim()) return;
    const parts = newInvoiceInput
      .split(/[,;\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    const existing = new Set(item.invoiceNumbers || []);
    for (const p of parts) {
      existing.add(p);
    }
    onChange({
      ...item,
      invoiceNumbers: Array.from(existing),
    });
    setNewInvoiceInput('');
  };

  const handleRemoveInvoice = (inv: string) => {
    onChange({
      ...item,
      invoiceNumbers: (item.invoiceNumbers || []).filter((i) => i !== inv),
    });
  };

  // Handle adding one or multiple comma-separated e-waybill numbers
  const handleAddEwaybill = () => {
    if (!newEwaybillInput.trim()) return;
    const parts = newEwaybillInput
      .split(/[,;\n]+/)
      .map((s) => s.trim().replace(/\s+/g, ''))
      .filter((s) => s.length > 0);

    const existing = new Set(item.ewaybillNumbers || []);
    for (const p of parts) {
      existing.add(p);
    }
    onChange({
      ...item,
      ewaybillNumbers: Array.from(existing),
    });
    setNewEwaybillInput('');
  };

  const handleRemoveEwaybill = (ewb: string) => {
    onChange({
      ...item,
      ewaybillNumbers: (item.ewaybillNumbers || []).filter((e) => e !== ewb),
    });
  };

  const netBalance = Math.max(
    0,
    (Number(item.freightAmount) || 0) +
      (Number(item.extraCharges) || 0) -
      (Number(item.advanceAmount) || 0)
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-slate-300 mb-4">
      {/* LR Header Strip */}
      <div
        className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="h-7 w-7 rounded-xl bg-slate-200 text-slate-900 font-mono font-black text-xs flex items-center justify-center border border-slate-300 shadow-xs">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm text-slate-950">
                {item.lrNumber ? `LR: ${item.lrNumber}` : `LR Item #${index + 1}`}
              </span>
              {item.weight > 0 && (
                <span className="text-[11px] bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-mono font-bold">
                  {item.weight} {item.weightUnit}
                </span>
              )}
              {placement === 'Market' && item.netMarketFreight !== undefined && item.netMarketFreight > 0 && (
                <span className="text-[10px] bg-[#FFB700] text-stone-950 border border-amber-400 px-2 py-0.5 rounded-md font-mono font-black shadow-xs">
                  Net Mkt: {formatCurrency(item.netMarketFreight)}
                </span>
              )}
            </div>
            {item.consignorCity && item.consigneeCity && (
              <div className="text-[11px] text-slate-600 font-medium flex items-center space-x-1.5 mt-0.5">
                <span>{item.consignorCity}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span>{item.consigneeCity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Freight and Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3" onClick={(e) => e.stopPropagation()}>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Billing Freight</div>
            <div className="text-sm font-black text-emerald-700 font-mono">
              {formatCurrency(item.freightAmount || 0)}
            </div>
          </div>

          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate this LR"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors border border-slate-200"
          >
            <Copy className="h-4 w-4" />
          </button>

          {totalCount > 1 && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete this LR"
              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors border border-rose-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Form Fields */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Row 1: LR Number and LR Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                LR Number <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. LR-2026-9081"
                  value={item.lrNumber}
                  onChange={(e) => onChange({ ...item, lrNumber: e.target.value.toUpperCase() })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-950 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] uppercase font-mono tracking-wide"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                LR Date
              </label>
              <input
                type="date"
                value={item.lrDate || ''}
                onChange={(e) => onChange({ ...item, lrDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>
          </div>

          {/* Row 2: Consignor Name & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>Consignor (Sender) Name <span className="text-rose-600">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tata Steel Processing Plant"
                value={item.consignorName}
                onChange={(e) => onChange({ ...item, consignorName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                <span>Consignor City <span className="text-rose-600">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jamshedpur"
                value={item.consignorCity}
                onChange={(e) => onChange({ ...item, consignorCity: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>
          </div>

          {/* Row 3: Consignee Name & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Consignee (Receiver) Name <span className="text-rose-600">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Larsen & Toubro Infra Terminal"
                value={item.consigneeName}
                onChange={(e) => onChange({ ...item, consigneeName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>Consignee City <span className="text-rose-600">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mumbai"
                value={item.consigneeCity}
                onChange={(e) => onChange({ ...item, consigneeCity: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>
          </div>

          {/* Row 4: Multiple Invoice Numbers & Multiple E-waybill Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Multiple Invoice Numbers */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  <span>Invoice Numbers (Multiple)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-semibold font-mono">
                  {item.invoiceNumbers?.length || 0} attached
                </span>
              </div>

              {/* Tags display */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px] items-center">
                {item.invoiceNumbers && item.invoiceNumbers.length > 0 ? (
                  item.invoiceNumbers.map((inv) => (
                    <span
                      key={inv}
                      className="inline-flex items-center space-x-1 bg-amber-100 border border-amber-300 text-amber-950 text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold shadow-xs"
                    >
                      <span>{inv}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInvoice(inv)}
                        className="text-amber-800 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No invoices added yet. Enter below and press Enter or Add.
                  </span>
                )}
              </div>

              {/* Input row */}
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. INV-2026-001 (or comma-separated)"
                  value={newInvoiceInput}
                  onChange={(e) => setNewInvoiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInvoice();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder-slate-400 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                />
                <button
                  type="button"
                  onClick={handleAddInvoice}
                  disabled={!newInvoiceInput.trim()}
                  className="px-3 py-1.5 bg-[#FFB700] hover:bg-[#e6a500] disabled:opacity-40 text-stone-950 rounded-lg text-xs font-black flex items-center space-x-1 shadow-xs border border-amber-400"
                >
                  <Plus className="h-3 w-3 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Multiple E-waybill Numbers */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-cyan-600" />
                  <span>E-waybill Numbers (Multiple)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-semibold font-mono">
                  {item.ewaybillNumbers?.length || 0} attached
                </span>
              </div>

              {/* Tags display */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px] items-center">
                {item.ewaybillNumbers && item.ewaybillNumbers.length > 0 ? (
                  item.ewaybillNumbers.map((ewb) => (
                    <span
                      key={ewb}
                      className="inline-flex items-center space-x-1 bg-cyan-100 border border-cyan-300 text-cyan-950 text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold shadow-xs"
                    >
                      <span>{ewb}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEwaybill(ewb)}
                        className="text-cyan-800 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No e-waybills added. Enter 12-digit number and press Enter.
                  </span>
                )}
              </div>

              {/* Input row */}
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. 121899014521 (or comma-separated)"
                  value={newEwaybillInput}
                  onChange={(e) => setNewEwaybillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEwaybill();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                />
                <button
                  type="button"
                  onClick={handleAddEwaybill}
                  disabled={!newEwaybillInput.trim()}
                  className="px-3 py-1.5 bg-[#00D2FF] hover:bg-[#00b8e6] disabled:opacity-40 text-slate-950 rounded-lg text-xs font-black flex items-center space-x-1 shadow-xs border border-cyan-400"
                >
                  <Plus className="h-3 w-3 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 5: Weight, Rate & Billing Freight Calculation Section */}
          <div className="bg-[#F0FDF4] p-4 sm:p-5 rounded-2xl border border-emerald-300 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-200 pb-2">
              <div className="flex items-center space-x-1.5">
                <Calculator className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Billing Cargo Weight & Freight Cost (Client)
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 font-bold">
                <Sparkles className="h-3 w-3 text-emerald-700" />
                <span>Auto-Calc Enabled</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Weight */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Billing Weight <span className="text-rose-600">*</span>
                </label>
                <div className="flex shadow-xs rounded-xl overflow-hidden">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={item.weight || ''}
                    onChange={(e) => onChange({ ...item, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-r-0 border-slate-300 text-sm font-black text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                  />
                  <select
                    value={item.weightUnit}
                    onChange={(e) => onChange({ ...item, weightUnit: e.target.value as WeightUnit })}
                    className="bg-slate-100 border border-slate-300 px-2.5 text-xs text-slate-800 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="MT">MT</option>
                    <option value="Kg">Kg</option>
                    <option value="Quintal">Qtl</option>
                  </select>
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Billing Rate (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="flex shadow-xs rounded-xl overflow-hidden">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="0"
                    value={item.rate || ''}
                    onChange={(e) => onChange({ ...item, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-r-0 border-slate-300 text-sm font-black text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                  />
                  <select
                    value={item.rateType}
                    onChange={(e) => onChange({ ...item, rateType: e.target.value as RateType })}
                    className="bg-slate-100 border border-slate-300 px-2 text-xs text-slate-800 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="per_mt">/ MT</option>
                    <option value="per_kg">/ Kg</option>
                    <option value="per_quintal">/ Qtl</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
              </div>

              {/* Freight Amount (Live auto-calculated) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Billing Freight (₹) <span className="text-rose-600">*</span>
                  </label>
                  {isManualFreight && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualFreight(false);
                        onChange({ ...item, freightAmount: computedFreight });
                      }}
                      className="text-[10px] text-amber-700 font-bold hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={item.freightAmount || ''}
                  onChange={(e) => {
                    setIsManualFreight(true);
                    onChange({ ...item, freightAmount: parseFloat(e.target.value) || 0 });
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-mono font-black focus:outline-none shadow-xs ${
                    isManualFreight
                      ? 'border-amber-500 text-amber-800 focus:ring-2 focus:ring-amber-500'
                      : 'border-emerald-400 text-emerald-800 focus:ring-2 focus:ring-[#00E676]'
                  }`}
                />
                <span className="text-[10px] text-slate-600 block mt-0.5 font-medium">
                  {isManualFreight ? 'Manual Override' : `Auto: ${item.weight} × ${item.rate}`}
                </span>
              </div>

              {/* Client Advance & Extra */}
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[11px] text-slate-700 font-semibold">
                    Client Advance (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={item.advanceAmount || ''}
                    onChange={(e) => onChange({ ...item, advanceAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-700 font-semibold">
                    Extra Charges (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={item.extraCharges || ''}
                    onChange={(e) => onChange({ ...item, extraCharges: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick LR balance preview */}
            <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">
                Net LR Balance Payable by Client: <strong className="text-slate-950 font-mono font-black">{formatCurrency(netBalance)}</strong>
              </span>
              <span className="text-slate-500 text-[11px] font-semibold">
                (Freight + Extra - Advance)
              </span>
            </div>
          </div>

          {/* Row 6: MARKET VEHICLE PLACEMENT DATA SCHEME (Market Weight, Market Rate, Gross Market Freight, Deductions: Commission & Advance, Net Market Freight) */}
          {placement === 'Market' && (
            <div className="bg-[#FFFBEB] p-4 sm:p-5 rounded-2xl border-2 border-amber-400 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg bg-[#FFB700] text-stone-950 shadow-xs">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                      Market Vehicle Hire Particulars & Deductions
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Contract with market transporter / truck broker for this LR
                    </span>
                  </div>
                </div>

                {(!item.marketWeight || item.marketWeight === 0) && item.weight > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const mWeight = item.weight;
                      const mRate = item.marketRate || Math.round(item.rate * 0.9);
                      const gross = calculateGrossMarketFreight(mWeight, mRate);
                      const comm = item.marketCommission || 500;
                      const adv = item.marketAdvance || 0;
                      const net = calculateNetMarketFreight(gross, comm, adv);
                      onChange({
                        ...item,
                        marketWeight: mWeight,
                        marketRate: mRate,
                        grossMarketFreight: gross,
                        marketCommission: comm,
                        marketAdvance: adv,
                        netMarketFreight: net,
                      });
                    }}
                    className="text-xs text-stone-950 bg-[#FFB700] hover:bg-[#e6a500] font-black border border-amber-500 px-3 py-1 rounded-xl transition-all shadow-xs flex items-center space-x-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Pre-fill from Billing Weight ({item.weight} MT)</span>
                  </button>
                )}
              </div>

              {/* Grid 1: Market Weight, Market Rate, Gross Market Freight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Market Weight */}
                <div>
                  <label className="block text-xs font-black text-amber-950 mb-1">
                    Market Weight (MT) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 22.00"
                    value={item.marketWeight || ''}
                    onChange={(e) => {
                      const mWeight = parseFloat(e.target.value) || 0;
                      const gross = calculateGrossMarketFreight(mWeight, item.marketRate || 0);
                      const net = calculateNetMarketFreight(gross, item.marketCommission || 0, item.marketAdvance || 0);
                      onChange({
                        ...item,
                        marketWeight: mWeight,
                        grossMarketFreight: gross,
                        netMarketFreight: net,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-950 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-600 font-semibold mt-0.5 block">Weight contracted to vehicle</span>
                </div>

                {/* Market Rate */}
                <div>
                  <label className="block text-xs font-black text-amber-950 mb-1">
                    Market Rate (₹ / MT) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 2800"
                    value={item.marketRate || ''}
                    onChange={(e) => {
                      const mRate = parseFloat(e.target.value) || 0;
                      const gross = calculateGrossMarketFreight(item.marketWeight || 0, mRate);
                      const net = calculateNetMarketFreight(gross, item.marketCommission || 0, item.marketAdvance || 0);
                      onChange({
                        ...item,
                        marketRate: mRate,
                        grossMarketFreight: gross,
                        netMarketFreight: net,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-950 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-600 font-semibold mt-0.5 block">Rate agreed with market carrier</span>
                </div>

                {/* Gross Market Freight */}
                <div>
                  <label className="block text-xs font-black text-amber-950 mb-1">
                    Gross Market Freight (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={item.grossMarketFreight || ''}
                    onChange={(e) => {
                      const gross = parseFloat(e.target.value) || 0;
                      const net = calculateNetMarketFreight(gross, item.marketCommission || 0, item.marketAdvance || 0);
                      onChange({
                        ...item,
                        grossMarketFreight: gross,
                        netMarketFreight: net,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl text-sm font-black text-amber-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                  <span className="text-[10px] text-amber-900/90 font-bold block mt-0.5 font-mono">
                    Auto: {item.marketWeight || 0} MT × ₹{item.marketRate || 0}
                  </span>
                </div>
              </div>

              {/* Deductions: Commission and Advance */}
              <div className="bg-white p-4 rounded-xl border border-amber-300 space-y-3 shadow-xs">
                <div className="text-xs font-black text-amber-950 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span>Deductions from Transporter</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">TDS / Charges</span>
                  </div>
                  <span className="text-slate-800 text-xs font-mono font-bold">
                    Total Deductions: <strong className="text-rose-700 font-black">-{formatCurrency((Number(item.marketCommission) || 0) + (Number(item.marketAdvance) || 0))}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Deduction 1: Commission */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Commission / Brokerage (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 500"
                      value={item.marketCommission || ''}
                      onChange={(e) => {
                        const comm = parseFloat(e.target.value) || 0;
                        const net = calculateNetMarketFreight(item.grossMarketFreight || 0, comm, item.marketAdvance || 0);
                        onChange({
                          ...item,
                          marketCommission: comm,
                          netMarketFreight: net,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">Commission deducted from lorry hire</span>
                  </div>

                  {/* Deduction 2: Advance */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Advance Paid to Market Vehicle (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 20000"
                      value={item.marketAdvance || ''}
                      onChange={(e) => {
                        const adv = parseFloat(e.target.value) || 0;
                        const net = calculateNetMarketFreight(item.grossMarketFreight || 0, item.marketCommission || 0, adv);
                        onChange({
                          ...item,
                          marketAdvance: adv,
                          netMarketFreight: net,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">Diesel / Cash advance handed to driver</span>
                  </div>
                </div>
              </div>

              {/* Net Market Freight & LR Profit Margin */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs bg-white p-3.5 rounded-xl border border-amber-300 shadow-xs">
                <div>
                  <span className="text-slate-600 block text-[10px] uppercase font-black">
                    Net Market Freight (Balance Payable to Transporter)
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-xl font-black text-amber-950 font-mono">
                      {formatCurrency(item.netMarketFreight || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      = Gross ({formatCurrency(item.grossMarketFreight || 0)}) - Deductions ({formatCurrency((item.marketCommission || 0) + (item.marketAdvance || 0))})
                    </span>
                  </div>
                </div>

                {item.freightAmount > 0 && (item.grossMarketFreight || 0) > 0 && (
                  <div className="text-right sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                    <span className="text-slate-600 block text-[10px] uppercase font-bold flex items-center space-x-1 justify-end">
                      <TrendingUp className="h-3 w-3 text-emerald-700" />
                      <span>LR Operating Margin</span>
                    </span>
                    <div className="font-mono font-black text-base text-emerald-800">
                      {formatCurrency(item.freightAmount - (item.grossMarketFreight || 0))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({(((item.freightAmount - (item.grossMarketFreight || 0)) / item.freightAmount) * 100).toFixed(1)}% margin)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 7: Remarks / Cargo Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              LR Remarks & Goods Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 500 Bags PPC Cement, Handle with care, Palletized"
              value={item.remarks || ''}
              onChange={(e) => onChange({ ...item, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
