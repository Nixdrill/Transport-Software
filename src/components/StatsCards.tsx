import React from 'react';
import { DispatchRecord } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { Truck, Scale, IndianRupee, ShieldCheck } from 'lucide-react';

interface StatsCardsProps {
  records: DispatchRecord[];
  onFilterPlacement?: (placement: 'All' | 'Market' | 'Own') => void;
  activePlacementFilter?: 'All' | 'Market' | 'Own';
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  records,
  onFilterPlacement,
  activePlacementFilter = 'All',
}) => {
  const totalDispatches = records.length;
  const totalLrs = records.reduce((sum, r) => sum + (r.totalLrsCount || r.lrs?.length || 0), 0);
  const totalWeight = records.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
  const totalFreight = records.reduce((sum, r) => sum + (Number(r.totalFreightAmount) || 0), 0);
  const marketCount = records.filter((r) => r.placement === 'Market').length;
  const ownCount = records.filter((r) => r.placement === 'Own').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Freight Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-wider uppercase">Total Freight</span>
          <div className="h-8 w-8 rounded-xl bg-[#00E676] text-slate-950 font-black flex items-center justify-center shadow-xs">
            <IndianRupee className="h-4 w-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-mono">
          {formatCurrency(totalFreight)}
        </div>
        <div className="mt-1.5 text-xs text-slate-600 font-medium flex items-center space-x-1">
          <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] font-mono">
            {totalLrs} LRs
          </span>
          <span>processed to date</span>
        </div>
      </div>

      {/* 2. Total Dispatches Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-wider uppercase">Total Dispatches</span>
          <div className="h-8 w-8 rounded-xl bg-[#00D2FF] text-slate-950 font-black flex items-center justify-center shadow-xs">
            <Truck className="h-4 w-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-mono">
          {totalDispatches}
        </div>
        <div className="mt-1.5 text-xs text-slate-600 font-medium flex items-center space-x-1.5">
          <span className="text-cyan-800 font-bold bg-cyan-100 px-1.5 py-0.5 rounded text-[11px] font-mono">
            {records.filter((r) => r.status === 'In Transit').length} Active
          </span>
          <span>in transit on road</span>
        </div>
      </div>

      {/* 3. Total Weight Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-wider uppercase">Cargo Weight</span>
          <div className="h-8 w-8 rounded-xl bg-[#FFB700] text-slate-950 font-black flex items-center justify-center shadow-xs">
            <Scale className="h-4 w-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-mono">
          {totalWeight.toFixed(2)}{' '}
          <span className="text-xs font-bold text-slate-500">MT</span>
        </div>
        <div className="mt-1.5 text-xs text-slate-600 font-medium flex items-center space-x-1">
          <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded text-[11px] font-mono">
            {totalDispatches > 0 ? (totalWeight / totalDispatches).toFixed(1) : 0} MT/trip
          </span>
          <span>average load</span>
        </div>
      </div>

      {/* 4. Fleet Placement Ratio */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-wider uppercase">Placement</span>
          <div className="h-8 w-8 rounded-xl bg-[#9333EA] text-white font-bold flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2 font-mono">
          <span className="text-xl sm:text-2xl font-black text-slate-950">
            {marketCount}
          </span>
          <span className="text-xs font-bold text-amber-700">Mkt</span>
          <span className="text-slate-300">/</span>
          <span className="text-xl sm:text-2xl font-black text-[#0096C7]">
            {ownCount}
          </span>
          <span className="text-xs font-bold text-[#0096C7]">Own</span>
        </div>
        <div className="mt-1.5 flex items-center space-x-2 text-[11px]">
          {onFilterPlacement && (
            <div className="flex space-x-1 w-full bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => onFilterPlacement('All')}
                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                  activePlacementFilter === 'All'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onFilterPlacement('Market')}
                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                  activePlacementFilter === 'Market'
                    ? 'bg-[#FFB700] text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mkt ({marketCount})
              </button>
              <button
                onClick={() => onFilterPlacement('Own')}
                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                  activePlacementFilter === 'Own'
                    ? 'bg-[#00D2FF] text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Own ({ownCount})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
