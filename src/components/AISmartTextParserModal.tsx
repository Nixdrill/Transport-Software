import React, { useState } from 'react';
import { extractDispatchFromText, ExtractedDispatch } from '../lib/geminiService';
import { 
  Sparkles, 
  X, 
  RefreshCw, 
  FileText, 
  Truck, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ClipboardPaste
} from 'lucide-react';

interface AISmartTextParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtracted: (extracted: ExtractedDispatch) => void;
}

export const AISmartTextParserModal: React.FC<AISmartTextParserModalProps> = ({
  isOpen,
  onClose,
  onApplyExtracted,
}) => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedDispatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Please paste or type the dispatch or consignment message text.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await extractDispatchFromText(rawText);
      setExtracted(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract structured dispatch with Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (extracted) {
      onApplyExtracted(extracted);
      onClose();
    }
  };

  const sampleMessages = [
    `Vehicle MH 12 RN 4589 loading from Tata Steel Processing Plant, Jamshedpur to Larsen & Toubro Infra Terminal, Mumbai. Transporter Patel Roadways. Driver Ramesh Singh 9823411204. LR #LR-2026-9081 with 24.5 MT steel coils @ 2850/MT. Invoices INV-9801, INV-9802. E-waybill 121899014521. Tarpaulin cover mandatory.`,
    `Dispatch Date 2026-10-03, Truck DL 01 AB 3412 (Market vehicle), Transporter Goyal Logistics Ltd. Origin Delhi to Destination Jaipur. Consignor Jindal Tubes Delhi, Consignee Modern Infra Jaipur. LR No: LR-8910, Weight 18 MT, Rate 1950 per MT. Market hire agreed at 1750/MT. Invoice #DL-2026-55. E-waybill 221899014521.`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <span>AI Smart Quick-Fill from Text / Message</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-300">
                  Gemini Structured Extraction
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Paste raw WhatsApp texts, driver SMS, or invoice notes to instantly auto-fill dispatch details.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-800">
          {/* Quick Sample Chips */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">
              Try Sample Message:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRawText(sampleMessages[0])}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 text-left transition-colors"
              >
                Sample 1: Multi-invoice steel coils (Jamshedpur → Mumbai)
              </button>
              <button
                type="button"
                onClick={() => setRawText(sampleMessages[1])}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 text-left transition-colors"
              >
                Sample 2: Market vehicle trip (Delhi → Jaipur)
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Paste Dispatch Message / Notes:</span>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-rose-600 hover:underline font-semibold text-[11px]"
                >
                  Clear
                </button>
              )}
            </label>
            <textarea
              rows={4}
              placeholder="Paste WhatsApp message, driver dispatch SMS, or client invoice note here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] shadow-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || !rawText.trim()}
              onClick={handleParse}
              className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Extracting with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Extract Dispatch Data</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Preview */}
          {extracted && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-black text-slate-950 flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Parsed Information Preview</span>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                  {extracted.lrs?.length || 0} LR(s)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Vehicle Number</span>
                  <span className="font-mono font-black text-slate-950 text-xs">{extracted.vehicleNumber || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Placement</span>
                  <span className="font-bold text-amber-900">{extracted.placement || 'Market'}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Transporter</span>
                  <span className="font-semibold text-slate-900 truncate block">{extracted.transporterName || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 col-span-2 sm:col-span-3">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Route</span>
                  <span className="font-semibold text-slate-950 flex items-center space-x-1.5 mt-0.5">
                    <span>{extracted.fromParty}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span>{extracted.toParty}</span>
                  </span>
                </div>
              </div>

              {/* LRs list */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Extracted LRs ({extracted.lrs?.length || 0}):
                </span>
                {extracted.lrs?.map((lr, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="text-slate-950">LR: {lr.lrNumber}</span>
                      <span className="text-emerald-800">{lr.weight} MT @ ₹{lr.rate}</span>
                    </div>
                    <div className="text-slate-600 text-[10px]">
                      {lr.consignorName} → {lr.consigneeName}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] pt-0.5">
                      {lr.invoiceNumbers && lr.invoiceNumbers.length > 0 && (
                        <span className="text-amber-900 font-mono">Inv: {lr.invoiceNumbers.join(', ')}</span>
                      )}
                      {lr.ewaybillNumbers && lr.ewaybillNumbers.length > 0 && (
                        <span className="text-cyan-900 font-mono">EWB: {lr.ewaybillNumbers.join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>

          {extracted && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs shadow-xs border border-emerald-400 flex items-center space-x-1.5 transition-all"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>Apply to Dispatch Form</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
