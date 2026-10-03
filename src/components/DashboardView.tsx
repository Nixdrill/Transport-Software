import React, { useState } from 'react';
import { DispatchRecord } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Truck, 
  IndianRupee, 
  Scale, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  Award,
  Filter
} from 'lucide-react';

interface DashboardViewProps {
  records: DispatchRecord[];
  onSelectTransporterFilter?: (transporter: string) => void;
  onSelectPlacementFilter?: (placement: 'Market' | 'Own') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  onSelectTransporterFilter,
  onSelectPlacementFilter,
}) => {
  const [transporterMetric, setTransporterMetric] = useState<'value' | 'volume'>('value');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Overall Aggregates
  const totalFreight = records.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);
  const totalWeight = records.reduce((s, r) => s + (Number(r.totalWeight) || 0), 0);
  const totalTrips = records.length;
  const totalLrs = records.reduce((s, r) => s + (r.totalLrsCount || r.lrs?.length || 0), 0);
  const avgRatePerMT = totalWeight > 0 ? Math.round(totalFreight / totalWeight) : 0;

  // 1. DATA VISUALIZATION: Total Freight Amount by Month
  const monthlyDataMap = new Map<string, {
    monthKey: string;
    label: string;
    freight: number;
    weight: number;
    trips: number;
    lrs: number;
  }>();

  // Populate last 6 months or all months present in records
  for (const rec of records) {
    if (!rec.date) continue;
    const dateObj = new Date(rec.date);
    const monthKey = rec.date.substring(0, 7); // YYYY-MM
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const current = monthlyDataMap.get(monthKey) || {
      monthKey,
      label: monthLabel,
      freight: 0,
      weight: 0,
      trips: 0,
      lrs: 0,
    };

    current.freight += Number(rec.totalFreightAmount) || 0;
    current.weight += Number(rec.totalWeight) || 0;
    current.trips += 1;
    current.lrs += rec.totalLrsCount || rec.lrs?.length || 0;

    monthlyDataMap.set(monthKey, current);
  }

  // Sort chronologically
  const monthlyList = Array.from(monthlyDataMap.values()).sort(
    (a, b) => a.monthKey.localeCompare(b.monthKey)
  );

  const maxMonthlyFreight = Math.max(...monthlyList.map((m) => m.freight), 1);

  // 2. DATA VISUALIZATION: Breakdown of Placements (Market vs. Own)
  const marketRecords = records.filter((r) => r.placement === 'Market');
  const ownRecords = records.filter((r) => r.placement === 'Own');

  const marketTrips = marketRecords.length;
  const ownTrips = ownRecords.length;
  const marketFreight = marketRecords.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);
  const ownFreight = ownRecords.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);
  const marketWeight = marketRecords.reduce((s, r) => s + (Number(r.totalWeight) || 0), 0);
  const ownWeight = ownRecords.reduce((s, r) => s + (Number(r.totalWeight) || 0), 0);

  const marketTripsPct = totalTrips > 0 ? Math.round((marketTrips / totalTrips) * 100) : 0;
  const ownTripsPct = totalTrips > 0 ? 100 - marketTripsPct : 0;

  const marketFreightPct = totalFreight > 0 ? Math.round((marketFreight / totalFreight) * 100) : 0;
  const ownFreightPct = totalFreight > 0 ? 100 - marketFreightPct : 0;

  const marketWeightPct = totalWeight > 0 ? Math.round((marketWeight / totalWeight) * 100) : 0;
  const ownWeightPct = totalWeight > 0 ? 100 - marketWeightPct : 0;

  // Donut SVG circumference math (radius 40, circum ~251.3)
  const circumference = 2 * Math.PI * 40;
  const marketStrokeDash = (marketTripsPct / 100) * circumference;

  // 3. DATA VISUALIZATION: List of Top Transporters by Volume or Value
  const transporterMap = new Map<string, {
    name: string;
    totalFreight: number;
    totalWeight: number;
    trips: number;
    lrs: number;
    placement: string;
    vehicles: Set<string>;
  }>();

  for (const rec of records) {
    const tName = (rec.transporterName || 'Unassigned').trim();
    const curr = transporterMap.get(tName) || {
      name: tName,
      totalFreight: 0,
      totalWeight: 0,
      trips: 0,
      lrs: 0,
      placement: rec.placement,
      vehicles: new Set<string>(),
    };

    curr.totalFreight += Number(rec.totalFreightAmount) || 0;
    curr.totalWeight += Number(rec.totalWeight) || 0;
    curr.trips += 1;
    curr.lrs += rec.totalLrsCount || rec.lrs?.length || 0;
    if (rec.vehicleNumber) curr.vehicles.add(rec.vehicleNumber);

    transporterMap.set(tName, curr);
  }

  const transportersList = Array.from(transporterMap.values());

  // Sort by Value or Volume
  transportersList.sort((a, b) => {
    if (transporterMetric === 'value') {
      return b.totalFreight - a.totalFreight;
    } else {
      return b.totalWeight - a.totalWeight;
    }
  });

  const maxTransporterMetricValue = Math.max(
    ...transportersList.map((t) =>
      transporterMetric === 'value' ? t.totalFreight : t.totalWeight
    ),
    1
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dashboard Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Fleet & Logistics Analytics Dashboard</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Live DB Data
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time insights across {records.length} dispatches and {totalLrs} LRs stored in database.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Freight / MT</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ₹{avgRatePerMT.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-l border-slate-700 pl-3 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Transporters</span>
              <span className="font-mono font-bold text-white text-sm">
                {transportersList.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Chart 1 (Monthly Freight Trend) & Chart 2 (Market vs Own Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Total Freight Amount by Month (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Total Freight Amount by Month
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {monthlyList.length} Month(s) Recorded
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Monthly freight volume & billing trend generated from database records.
            </p>
          </div>

          {/* Bar Chart Area */}
          {monthlyList.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500 italic">
              No monthly data records available.
            </div>
          ) : (
            <div className="space-y-2 pt-4">
              {/* Tooltip detail row */}
              <div className="h-7 text-xs flex items-center justify-between px-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
                {hoveredMonth ? (
                  (() => {
                    const m = monthlyList.find((i) => i.monthKey === hoveredMonth);
                    return m ? (
                      <>
                        <span className="text-slate-300 font-semibold">{m.label} ({m.monthKey})</span>
                        <div className="flex space-x-3 font-mono">
                          <span className="text-emerald-400 font-bold">{formatCurrency(m.freight)}</span>
                          <span className="text-amber-400">{m.weight.toFixed(1)} MT</span>
                          <span className="text-indigo-400">{m.trips} Trips ({m.lrs} LRs)</span>
                        </div>
                      </>
                    ) : null;
                  })()
                ) : (
                  <span className="text-slate-500 text-[11px] italic">
                    Hover over any month bar below to inspect detailed breakdown
                  </span>
                )}
              </div>

              {/* Responsive SVG/CSS Bars */}
              <div className="h-52 flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-800">
                {monthlyList.map((m) => {
                  const heightPercent = Math.max(12, Math.round((m.freight / maxMonthlyFreight) * 100));
                  const isHovered = hoveredMonth === m.monthKey;

                  return (
                    <div
                      key={m.monthKey}
                      onMouseEnter={() => setHoveredMonth(m.monthKey)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    >
                      {/* Value Tag above bar */}
                      <span className={`text-[10px] font-mono mb-1 transition-all ${
                        isHovered ? 'text-emerald-300 font-bold scale-110' : 'text-slate-400'
                      }`}>
                        ₹{Math.round(m.freight / 1000)}k
                      </span>

                      {/* Bar Pillar */}
                      <div className="w-full max-w-[48px] bg-slate-800 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isHovered
                              ? 'bg-gradient-to-t from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20'
                              : 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300'
                          }`}
                        />
                      </div>

                      {/* Month Label */}
                      <span className={`text-[11px] font-medium mt-2 transition-colors ${
                        isHovered ? 'text-white font-bold' : 'text-slate-400'
                      }`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Summary Footer */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase block">Total Freight</span>
              <strong className="text-white font-mono text-xs sm:text-sm">{formatCurrency(totalFreight)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase block">Total Cargo</span>
              <strong className="text-amber-400 font-mono text-xs sm:text-sm">{totalWeight.toFixed(1)} MT</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase block">Total LRs</span>
              <strong className="text-indigo-400 font-mono text-xs sm:text-sm">{totalLrs}</strong>
            </div>
          </div>
        </div>

        {/* CHART 2: Breakdown of Placements (Market vs. Own) (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Fleet Placement Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Market hired vehicles vs. Own internal company fleet.
            </p>
          </div>

          {/* Donut and Statistics Area */}
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            {/* SVG Circular Donut */}
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-800"
                  fill="transparent"
                />
                {/* Own Fleet Slice */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-indigo-500"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset="0"
                />
                {/* Market Fleet Slice */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-amber-500 transition-all duration-500"
                  fill="transparent"
                  strokeDasharray={`${marketStrokeDash} ${circumference}`}
                  strokeDashoffset="0"
                />
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-white font-mono">{totalTrips}</span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Trips</span>
              </div>
            </div>

            {/* Placement Breakdown Legend & Details */}
            <div className="space-y-3 w-full sm:w-48 text-xs">
              {/* Market */}
              <div
                onClick={() => onSelectPlacementFilter && onSelectPlacementFilter('Market')}
                className="bg-slate-800/40 hover:bg-slate-800 p-2.5 rounded-xl border border-amber-500/20 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-white">Market Vehicle</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">{marketTripsPct}%</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>{marketTrips} trips</span>
                  <span className="font-mono text-slate-300">{formatCurrency(marketFreight)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Weight: {marketWeight.toFixed(1)} MT
                </div>
              </div>

              {/* Own */}
              <div
                onClick={() => onSelectPlacementFilter && onSelectPlacementFilter('Own')}
                className="bg-slate-800/40 hover:bg-slate-800 p-2.5 rounded-xl border border-indigo-500/20 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span className="font-bold text-white">Own Fleet</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-400">{ownTripsPct}%</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>{ownTrips} trips</span>
                  <span className="font-mono text-slate-300">{formatCurrency(ownFreight)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Weight: {ownWeight.toFixed(1)} MT
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Progress Bars */}
          <div className="pt-2 border-t border-slate-800 text-xs space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Freight Cost Share: Market vs Own</span>
                <span className="font-mono">{marketFreightPct}% / {ownFreightPct}%</span>
              </div>
              <div className="h-2 w-full bg-indigo-600 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${marketFreightPct}%` }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHART 3: List of Top Transporters by Volume or Value */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Top Transporters & Carrier Leaderboard
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked carrier performance analysis based on total freight value or cargo weight volume.
            </p>
          </div>

          {/* Toggle: By Value vs By Volume */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setTransporterMetric('value')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                transporterMetric === 'value'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <IndianRupee className="h-3.5 w-3.5" />
              <span>By Value (Freight ₹)</span>
            </button>
            <button
              onClick={() => setTransporterMetric('volume')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                transporterMetric === 'volume'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>By Volume (Weight MT)</span>
            </button>
          </div>
        </div>

        {/* Transporters Ranked List */}
        {transportersList.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No transporters recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {transportersList.map((transporter, idx) => {
              const metricVal =
                transporterMetric === 'value'
                  ? transporter.totalFreight
                  : transporter.totalWeight;
              const barPercent = Math.max(
                8,
                Math.round((metricVal / maxTransporterMetricValue) * 100)
              );

              return (
                <div
                  key={transporter.name}
                  onClick={() => onSelectTransporterFilter && onSelectTransporterFilter(transporter.name)}
                  className="bg-slate-950/70 hover:bg-slate-800/60 p-3.5 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    {/* Rank & Name */}
                    <div className="flex items-center space-x-3">
                      <div className={`h-7 w-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : idx === 1
                          ? 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
                          : idx === 2
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                            {transporter.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {transporter.placement}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>{transporter.trips} Trips</span>
                          <span>•</span>
                          <span>{transporter.lrs} LRs</span>
                          <span>•</span>
                          <span>{transporter.vehicles.size} Vehicles</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Values */}
                    <div className="flex items-center space-x-4 text-right sm:text-right font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">
                          Cargo Volume
                        </span>
                        <span className="text-amber-400 font-bold text-xs sm:text-sm">
                          {transporter.totalWeight.toFixed(1)} MT
                        </span>
                      </div>

                      <div className="border-l border-slate-800 pl-4">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">
                          Freight Value
                        </span>
                        <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                          {formatCurrency(transporter.totalFreight)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Relative Volume/Value Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        transporterMetric === 'value'
                          ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
