import React, { useState, useEffect } from 'react';
import { recommendMarketRate, MarketRateRecommendation } from '../lib/geminiService';
import { formatCurrency } from '../lib/calculations';
import { 
  TrendingUp, 
  Sparkles, 
  X, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  IndianRupee, 
  Percent, 
  Clock, 
  ShieldCheck,
  Scale
} from 'lucide-react';

interface AIMarketRateAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  weightMT: number;
  currentRate?: number;
  billingRate?: number;
  cargoType?: string;
  onApplyRate?: (recommendedRate: number, commission?: number, advancePercent?: number) => void;
}

export const AIMarketRateAdvisorModal: React.FC<AIMarketRateAdvisorModalProps> = ({
  isOpen,
  onClose,
  origin,
  destination,
  weightMT,
  currentRate,
  billingRate,
  cargoType = 'Industrial Freight / Steel / Cement',
  onApplyRate,
}) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<MarketRateRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (isOpen && origin.trim() && destination.trim() && !recommendation && !loading) {
      fetchRecommendation();
    }
  }, [isOpen, origin, destination, weightMT]);

  if (!isOpen) return null;

  const fetchRecommendation = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError('Origin and Destination are required to benchmark market lorry rates.');
      return;
    }

    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const data = await recommendMarketRate(origin.trim(), destination.trim(), weightMT || 20, {
        cargoType,
        billingRate,
      });
      setRecommendation(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to obtain AI market hire recommendation.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (recommendation && onApplyRate) {
      onApplyRate(
        recommendation.recommendedMarketRatePerMT,
        recommendation.recommendedCommission,
        recommendation.recommendedAdvancePercent
      );
      setApplied(true);
      setTimeout(() => {
        setApplied(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-stone-950 flex items-center justify-center border border-amber-300 shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <span>Gemini Market Freight Rate Advisor</span>
                <span className="text-[10px] bg-[#FFB700] text-stone-950 border border-amber-400 px-2 py-0.5 rounded-full font-mono font-black">
                  AI Benchmarked
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Corridor freight pricing, broker commission norms & negotiation advice.
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

        {/* Route Snapshot */}
        <div className="p-4 bg-amber-50/50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Route Corridor</span>
            <span className="font-black text-slate-950">
              {origin || 'Origin'} → {destination || 'Destination'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Cargo Weight</span>
            <span className="font-mono font-bold text-amber-900">{weightMT || 20} MT</span>
          </div>
          {billingRate ? (
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Client Billing Rate</span>
              <span className="font-mono font-bold text-emerald-800">₹{billingRate}/MT</span>
            </div>
          ) : null}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-800">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 animate-pulse">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">Benchmarking Market Rates with Gemini AI...</p>
              <p className="text-[11px] text-slate-500">Evaluating corridor distance, diesel indices, toll charges, and broker commissions.</p>
            </div>
          )}

          {!loading && recommendation && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Highlight Card: Recommended Rate */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-900 block">
                    Recommended Market Lorry Hire Rate
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-amber-950 font-mono">
                      ₹{recommendation.recommendedMarketRatePerMT}
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">/ MT</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium block mt-0.5">
                    Expected Market Range: <strong className="text-slate-900">₹{recommendation.marketRateRangeMin} - ₹{recommendation.marketRateRangeMax}</strong> / MT
                  </span>
                </div>

                {onApplyRate && (
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-4 py-2 bg-[#FFB700] hover:bg-[#e6a500] text-stone-950 font-black rounded-xl text-xs shadow-xs border border-amber-500 flex items-center space-x-1.5 transition-all self-end sm:self-auto"
                  >
                    {applied ? (
                      <>
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>Applied!</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>Apply Rate to LR</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Grid: Deductions & Corridor Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Standard Brokerage</span>
                  <span className="text-sm font-black text-slate-950 font-mono">
                    {formatCurrency(recommendation.recommendedCommission)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Driver Advance</span>
                  <span className="text-sm font-black text-amber-900 font-mono">
                    {recommendation.recommendedAdvancePercent}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Trip Distance</span>
                  <span className="text-sm font-black text-indigo-900 font-mono">
                    ~{recommendation.estimatedTripDistanceKm} km
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Transit Days</span>
                  <span className="text-sm font-black text-emerald-800 font-mono">
                    {recommendation.expectedTransitDays} Day(s)
                  </span>
                </div>
              </div>

              {/* Operating Margin Simulation (if client rate is present) */}
              {billingRate && billingRate > 0 && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950">Operating Profit Simulation:</span>
                    <span className="font-mono font-black text-emerald-800">
                      Margin: ₹{billingRate - recommendation.recommendedMarketRatePerMT} / MT
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    At {weightMT} MT cargo: Client Billing ₹{billingRate * weightMT} - Gross Hire ₹{recommendation.recommendedMarketRatePerMT * weightMT} = <strong className="text-emerald-900 font-bold">Estimated Profit {formatCurrency((billingRate - recommendation.recommendedMarketRatePerMT) * weightMT)}</strong>
                  </div>
                </div>
              )}

              {/* Negotiation Strategy */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-slate-950 uppercase tracking-wider block flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-700" />
                  <span>Market Carrier Negotiation Strategy</span>
                </span>
                <p className="text-slate-700 text-xs leading-relaxed font-sans">
                  {recommendation.negotiationTips}
                </p>
                {recommendation.keyHighways && (
                  <p className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-200">
                    Primary Route Corridor: {recommendation.keyHighways}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={fetchRecommendation}
            disabled={loading}
            className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Re-calculate</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
