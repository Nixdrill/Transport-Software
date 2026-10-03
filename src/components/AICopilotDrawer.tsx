import React, { useState } from 'react';
import { DispatchRecord } from '../types/dispatch';
import { 
  analyzeRouteWithMaps, 
  RouteAnalysisResult, 
  auditFleetHealth, 
  FleetHealthAudit,
  chatWithCopilot 
} from '../lib/geminiService';
import { formatCurrency } from '../lib/calculations';
import { 
  Bot, 
  Send, 
  Sparkles, 
  MapPin, 
  ShieldAlert, 
  X, 
  RefreshCw, 
  ExternalLink, 
  Navigation, 
  Truck, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  MessageSquare
} from 'lucide-react';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: DispatchRecord[];
  activePlacementFilter?: string;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  records,
  activePlacementFilter = 'All',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'maps' | 'audit'>('chat');

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: `Hello! I am your **LogiTrack AI Copilot**.\nI'm connected to your active database with **${records.length} dispatches** and Google Maps Grounding.\n\nAsk me about route corridors, distance calculations, market lorry hire rates, GST e-waybill compliance, or fleet margin optimizations!`,
    },
  ]);

  // Maps Route state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mapsLoading, setMapsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteAnalysisResult | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);

  // Fleet Audit state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<FleetHealthAudit | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newHistory = [...messages, { role: 'user' as const, text: userText }];
    setMessages(newHistory);
    setChatLoading(true);

    try {
      const summaryContext = {
        totalDispatches: records.length,
        totalWeightMT: records.reduce((s, r) => s + (r.totalWeight || 0), 0),
        totalFreightAmount: records.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0),
        marketTripsCount: records.filter((r) => r.placement === 'Market').length,
        ownTripsCount: records.filter((r) => r.placement === 'Own').length,
        transporters: Array.from(new Set(records.map((r) => r.transporterName))).filter(Boolean),
        recentVehicles: records.slice(0, 8).map((r) => `${r.vehicleNumber} (${r.fromParty}→${r.toParty})`),
      };

      const reply = await chatWithCopilot(userText, newHistory, summaryContext);
      setMessages([...newHistory, { role: 'model', text: reply }]);
    } catch (err: any) {
      setMessages([
        ...newHistory,
        {
          role: 'model',
          text: `⚠️ **Error**: ${err?.message || 'Failed to connect with Gemini AI server endpoint.'}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRunMapsAnalysis = async () => {
    if (!origin.trim() || !destination.trim()) {
      setMapsError('Please enter both Origin and Destination.');
      return;
    }
    setMapsLoading(true);
    setMapsError(null);
    try {
      const data = await analyzeRouteWithMaps(origin.trim(), destination.trim());
      setRouteResult(data);
    } catch (err: any) {
      setMapsError(err?.message || 'Error querying Google Maps Grounding.');
    } finally {
      setMapsLoading(false);
    }
  };

  const handleRunFleetAudit = async () => {
    if (records.length === 0) {
      setAuditError('No dispatches recorded in the database yet to audit.');
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await auditFleetHealth(records);
      setAuditResult(data);
    } catch (err: any) {
      setAuditError(err?.message || 'Error generating fleet health audit.');
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-300">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#00E676] text-slate-950 flex items-center justify-center shadow-xs font-black">
              <Bot className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <span>Gemini AI Logistics Intelligence</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  Live Copilot
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Google Maps Grounding, rate advisory & fleet operational audits.
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

        {/* Sub-tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('chat')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeSubTab === 'chat'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>AI Copilot</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('maps')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeSubTab === 'maps'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Navigation className="h-3.5 w-3.5 text-cyan-600" />
            <span>Maps Grounding</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('audit')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeSubTab === 'audit'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>Fleet Health</span>
          </button>
        </div>

        {/* TAB 1: COPILOT CHAT */}
        {activeSubTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F0F2F6]">
            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-slate-950 text-white font-medium rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 rounded-tl-none flex items-center space-x-2 text-slate-500 shadow-xs">
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>Gemini Copilot is analyzing fleet data...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Ask about trips, routes, rates, or e-waybill rules..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] disabled:opacity-40 text-slate-950 rounded-xl font-black text-xs shadow-xs border border-emerald-400 flex items-center space-x-1"
              >
                <Send className="h-4 w-4 stroke-[2.5]" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: GOOGLE MAPS GROUNDING ROUTE INSPECTOR */}
        {activeSubTab === 'maps' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-white text-xs">
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Origin</label>
                  <input
                    type="text"
                    placeholder="e.g. Jamshedpur"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Destination</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={mapsLoading || !origin.trim() || !destination.trim()}
                onClick={handleRunMapsAnalysis}
                className="w-full py-2 bg-[#00D2FF] hover:bg-[#00b8e6] disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs border border-cyan-400 transition-all"
              >
                {mapsLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Querying Google Maps...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Calculate Transit Distance via Google Maps</span>
                  </>
                )}
              </button>
            </div>

            {mapsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{mapsError}</span>
              </div>
            )}

            {routeResult && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {routeResult.estDistanceKm && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] text-emerald-900 font-bold uppercase block">Commercial Transit Distance</span>
                      <span className="text-xl font-black text-emerald-950 font-mono">~{routeResult.estDistanceKm} KM</span>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-black text-slate-950 uppercase tracking-wider block text-xs">
                    Corridor & Highway Route Analysis
                  </span>
                  <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {routeResult.report}
                  </div>
                </div>

                {/* Google Maps Grounding Links */}
                {routeResult.mapsLinks && routeResult.mapsLinks.length > 0 && (
                  <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-xl space-y-2">
                    <span className="font-black text-cyan-950 block text-[11px] flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-cyan-700" />
                      <span>Verified Google Maps Places</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {routeResult.mapsLinks.map((l, i) => (
                        <a
                          key={i}
                          href={l.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 bg-white hover:bg-slate-50 border border-cyan-300 text-cyan-900 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-xs"
                        >
                          <span className="truncate max-w-[180px]">{l.title}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FLEET HEALTH & PROFIT MARGIN AUDITOR */}
        {activeSubTab === 'audit' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-white text-xs">
            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-2.5 shadow-xs">
              <div className="flex items-center space-x-2 text-amber-950 font-black">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <span>Automated Dispatch Health & Margin Audit</span>
              </div>
              <p className="text-slate-600 font-medium">
                Scans all {records.length} database dispatches for market freight leakage, low-margin trips, and missing compliance documents.
              </p>

              <button
                type="button"
                disabled={auditLoading || records.length === 0}
                onClick={handleRunFleetAudit}
                className="w-full py-2 bg-[#FFB700] hover:bg-[#e6a500] disabled:opacity-40 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs border border-amber-400 transition-all"
              >
                {auditLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Auditing {records.length} records with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Run Fleet Health Audit Now</span>
                  </>
                )}
              </button>
            </div>

            {auditError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{auditError}</span>
              </div>
            )}

            {auditResult && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-in fade-in duration-200 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-950 uppercase tracking-wider">
                    Executive Audit Report
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                    {auditResult.recordsAuditedCount} Dispatches Scanned
                  </span>
                </div>
                <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {auditResult.auditReport}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
