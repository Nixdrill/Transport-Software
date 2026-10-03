import React, { useState, useEffect } from 'react';
import { analyzeRouteWithMaps, RouteAnalysisResult } from '../lib/geminiService';
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Sparkles, 
  X, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Truck, 
  Clock, 
  Milestone,
  Route
} from 'lucide-react';

interface AIRouteMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrigin?: string;
  defaultDestination?: string;
  vehicleType?: string;
  cargoWeight?: number;
  onApplyDistance?: (distanceKm: number) => void;
}

export const AIRouteMapsModal: React.FC<AIRouteMapsModalProps> = ({
  isOpen,
  onClose,
  defaultOrigin = '',
  defaultDestination = '',
  vehicleType = 'Commercial Multi-Axle Truck',
  cargoWeight,
  onApplyDistance,
}) => {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (defaultOrigin) setOrigin(defaultOrigin);
    if (defaultDestination) setDestination(defaultDestination);
  }, [defaultOrigin, defaultDestination]);

  // Automatically analyze if both origin and destination are provided when modal opens
  useEffect(() => {
    if (isOpen && defaultOrigin.trim() && defaultDestination.trim() && !result && !loading) {
      handleAnalyze(defaultOrigin.trim(), defaultDestination.trim());
    }
  }, [isOpen, defaultOrigin, defaultDestination]);

  if (!isOpen) return null;

  const handleAnalyze = async (origToUse = origin, destToUse = destination) => {
    if (!origToUse.trim() || !destToUse.trim()) {
      setError('Please provide both Origin and Destination locations.');
      return;
    }

    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const data = await analyzeRouteWithMaps(origToUse.trim(), destToUse.trim(), {
        vehicleType,
        cargoWeight,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze route via Google Maps Grounding.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result?.estDistanceKm && onApplyDistance) {
      onApplyDistance(result.estDistanceKm);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-900 flex items-center justify-center border border-cyan-200">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <span>Google Maps Route & Distance Intelligence</span>
                <span className="text-[10px] bg-cyan-100 text-cyan-950 border border-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  Maps Grounded
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Real-world highway corridors, commercial transit distance & verified place references.
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

        {/* Input Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                <span>Origin (Loading Point)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Jamshedpur, Jharkhand"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E676] shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>Destination (Unloading Point)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Maharashtra"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E676] shadow-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 flex items-center space-x-2 font-medium">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              <span>{vehicleType}</span>
              {cargoWeight ? <span>• {cargoWeight} MT Cargo</span> : null}
            </div>

            <button
              type="button"
              disabled={loading || !origin.trim() || !destination.trim()}
              onClick={() => handleAnalyze()}
              className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all ml-auto"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Querying Google Maps...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Analyze Highway Route</span>
                </>
              )}
            </button>
          </div>
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
              <div className="h-10 w-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 animate-pulse">
                <Route className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">Connecting to Google Maps Grounding...</p>
              <p className="text-[11px] text-slate-500">Calculating driving distance, toll plazas, and transit highway corridors.</p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Quick Distance Metric Card */}
              {result.estDistanceKm && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                      <Milestone className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-900 font-bold uppercase block">
                        Estimated Driving Distance
                      </span>
                      <span className="text-xl font-black text-emerald-950 font-mono">
                        ~{result.estDistanceKm} KM
                      </span>
                    </div>
                  </div>

                  {onApplyDistance && (
                    <button
                      type="button"
                      onClick={handleApply}
                      className="px-3.5 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-lg text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-1"
                    >
                      {applied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Applied to Dispatch!</span>
                        </>
                      ) : (
                        <>
                          <span>Use Distance ({result.estDistanceKm} km)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Comprehensive Highway Corridor Analysis */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-slate-950 uppercase tracking-wider block flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>Transit & Highway Corridor Report</span>
                </span>
                <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {result.report}
                </div>
              </div>

              {/* Google Maps Verified Links (Skill Requirement) */}
              {result.mapsLinks && result.mapsLinks.length > 0 && (
                <div className="p-4 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center space-x-2 text-cyan-950 font-black text-xs">
                    <MapPin className="h-4 w-4 text-cyan-700" />
                    <span>Verified Google Maps Place Sources</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Direct Google Maps location citations extracted from grounding metadata:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {result.mapsLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-cyan-300 text-cyan-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs hover:border-cyan-400"
                      >
                        <MapPin className="h-3 w-3 text-cyan-600" />
                        <span className="truncate max-w-[220px]">{link.title}</span>
                        <ExternalLink className="h-3 w-3 text-cyan-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !result && !error && (
            <div className="py-10 text-center space-y-2 text-slate-400">
              <Route className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Enter Origin & Destination above to generate route intelligence.</p>
              <p className="text-[11px] text-slate-400">Grounded with up-to-date Google Maps transit routes, highway distances, and commercial corridor rates.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
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
