import React, { useState } from 'react';
import { DispatchRecord } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  IndianRupee, 
  Scale, 
  Award,
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center border border-slate-200">
              <BarChart3 className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 tracking-tight flex items-center space-x-2">
                <span>Fleet & Logistics Analytics Dashboard</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 font-mono font-bold">
                  Live DB Data
                </span>
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Real-time insights across {records.length} dispatches and {totalLrs} LRs stored in database.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Freight / MT</span>
              <span className="font-mono font-black text-emerald-700 text-sm">
                ₹{avgRatePerMT.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-l border-slate-300 pl-4 text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Transporters</span>
              <span className="font-mono font-black text-slate-950 text-sm">
                {transportersList.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Chart 1 (Monthly Freight Trend) & Chart 2 (Market vs Own Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Total Freight Amount by Month (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                  Total Freight Amount by Month
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {monthlyList.length} Month(s) Recorded
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Monthly freight volume & billing trend generated from database records.
            </p>
          </div>

          {/* Bar Chart Area */}
          {monthlyList.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 italic">
              No monthly data records available.
            </div>
          ) : (
            <div className="space-y-2 pt-4">
              {/* Tooltip detail row */}
              <div className="h-8 text-xs flex items-center justify-between px-3 bg-slate-50 rounded-xl border border-slate-200">
                {hoveredMonth ? (
                  (() => {
                    const m = monthlyList.find((i) => i.monthKey === hoveredMonth);
                    return m ? (
                      <>
                        <span className="text-slate-900 font-bold">{m.label} ({m.monthKey})</span>
                        <div className="flex space-x-3 font-mono font-bold">
                          <span className="text-emerald-700">{formatCurrency(m.freight)}</span>
                          <span className="text-amber-800">{m.weight.toFixed(1)} MT</span>
                          <span className="text-indigo-800">{m.trips} Trips ({m.lrs} LRs)</span>
                        </div>
                      </>
                    ) : null;
                  })()
                ) : (
                  <span className="text-slate-500 text-[11px] italic font-medium">
                    Hover over any month bar below to inspect detailed breakdown
                  </span>
                )}
              </div>

              {/* Responsive Bars */}
              <div className="h-52 flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-200">
                {monthlyList.map((m) => {
                  const heightPercent = Math.max(14, Math.round((m.freight / maxMonthlyFreight) * 100));
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
                        isHovered ? 'text-emerald-800 font-black scale-110' : 'text-slate-500 font-bold'
                      }`}>
                        {m.freight >= 100000
                          ? `₹${(m.freight / 100000).toFixed(1)}L`
                          : `₹${Math.round(m.freight / 1000)}k`}
                      </span>

                      {/* Bar Body */}
                      <div className="w-full bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl transition-all duration-300 ${
                            isHovered
                              ? 'bg-[#00E676] shadow-sm'
                              : 'bg-emerald-500/80 group-hover:bg-[#00E676]'
                          }`}
                        />
                      </div>

                      {/* Month Label */}
                      <span className={`text-[11px] mt-2 font-mono transition-colors ${
                        isHovered ? 'text-slate-950 font-black' : 'text-slate-600 font-semibold'
                      }`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Metrics Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold block text-slate-500">Cumulative Freight</span>
              <strong className="text-emerald-800 font-mono text-xs sm:text-sm font-black">
                {formatCurrency(totalFreight)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold block text-slate-500">Cumulative Weight</span>
              <strong className="text-amber-800 font-mono text-xs sm:text-sm font-black">
                {totalWeight.toFixed(1)} MT
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold block text-slate-500">Total LRs</span>
              <strong className="text-slate-950 font-mono text-xs sm:text-sm font-black">{totalLrs}</strong>
            </div>
          </div>
        </div>

        {/* CHART 2: Breakdown of Placements (Market vs. Own) (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-cyan-100 text-cyan-800">
                <PieChart className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                Fleet Placement Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
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
                  className="text-slate-100"
                  fill="transparent"
                />
                {/* Own Fleet Slice */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-[#00D2FF]"
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
                  className="text-[#FFB700] transition-all duration-500"
                  fill="transparent"
                  strokeDasharray={`${marketStrokeDash} ${circumference}`}
                  strokeDashoffset="0"
                />
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-950 font-mono">{totalTrips}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total Trips</span>
              </div>
            </div>

            {/* Placement Breakdown Legend & Details */}
            <div className="space-y-3 w-full sm:w-48 text-xs">
              {/* Market */}
              <div
                onClick={() => onSelectPlacementFilter && onSelectPlacementFilter('Market')}
                className="bg-[#FFFBEB] hover:bg-amber-100/70 p-3 rounded-xl border border-amber-300 cursor-pointer transition-all shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFB700]" />
                    <span className="font-black text-amber-950">Market Vehicle</span>
                  </div>
                  <span className="font-mono font-black text-amber-900">{marketTripsPct}%</span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between font-medium">
                  <span>{marketTrips} trips</span>
                  <span className="font-mono text-slate-900 font-bold">{formatCurrency(marketFreight)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                  Weight: {marketWeight.toFixed(1)} MT
                </div>
              </div>

              {/* Own */}
              <div
                onClick={() => onSelectPlacementFilter && onSelectPlacementFilter('Own')}
                className="bg-[#ECFEFF] hover:bg-cyan-100/70 p-3 rounded-xl border border-cyan-300 cursor-pointer transition-all shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00D2FF]" />
                    <span className="font-black text-cyan-950">Own Fleet</span>
                  </div>
                  <span className="font-mono font-black text-cyan-900">{ownTripsPct}%</span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between font-medium">
                  <span>{ownTrips} trips</span>
                  <span className="font-mono text-slate-900 font-bold">{formatCurrency(ownFreight)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                  Weight: {ownWeight.toFixed(1)} MT
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Progress Bars */}
          <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 font-bold mb-1">
                <span>Freight Cost Share: Market vs Own</span>
                <span className="font-mono">{marketFreightPct}% / {ownFreightPct}%</span>
              </div>
              <div className="h-2 w-full bg-[#00D2FF] rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${marketFreightPct}%` }}
                  className="h-full bg-[#FFB700]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHART 3: List of Top Transporters by Volume or Value */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                <Award className="h-5 w-5 text-amber-600" />
              </span>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                Top Transporters & Carrier Leaderboard
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Ranked carrier performance analysis based on total freight value or cargo weight volume.
            </p>
          </div>

          {/* Toggle: By Value vs By Volume */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTransporterMetric('value')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                transporterMetric === 'value'
                  ? 'bg-[#00E676] text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <IndianRupee className="h-3.5 w-3.5" />
              <span>By Value (Freight ₹)</span>
            </button>
            <button
              onClick={() => setTransporterMetric('volume')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                transporterMetric === 'volume'
                  ? 'bg-[#00E676] text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>By Volume (Weight MT)</span>
            </button>
          </div>
        </div>

        {/* Transporters Ranked List */}
        {transportersList.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
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
                  className="bg-slate-50/70 hover:bg-slate-100/80 p-3.5 sm:p-4 rounded-xl border border-slate-200 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    {/* Rank & Name */}
                    <div className="flex items-center space-x-3">
                      <div className={`h-7 w-7 rounded-lg font-mono font-black text-xs flex items-center justify-center shadow-xs ${
                        idx === 0
                          ? 'bg-[#FFB700] text-stone-950 border border-amber-400'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-900 border border-slate-300'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-950 border border-orange-300'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}>
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-950 text-sm group-hover:text-emerald-800 transition-colors">
                            {transporter.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            transporter.placement === 'Market'
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : 'bg-cyan-100 text-cyan-950 border border-cyan-300'
                          }`}>
                            {transporter.placement}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 flex items-center space-x-2 font-medium">
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
                        <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">
                          Cargo Volume
                        </span>
                        <span className="text-amber-800 font-black text-xs sm:text-sm">
                          {transporter.totalWeight.toFixed(1)} MT
                        </span>
                      </div>

                      <div className="border-l border-slate-200 pl-4">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">
                          Freight Value
                        </span>
                        <span className="text-emerald-800 font-black text-xs sm:text-sm">
                          {formatCurrency(transporter.totalFreight)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Relative Volume/Value Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        transporterMetric === 'value'
                          ? 'bg-[#00E676]'
                          : 'bg-[#FFB700]'
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
