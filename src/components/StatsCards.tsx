import React from 'react';
import { DispatchRecord } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { Truck, Receipt, Scale, IndianRupee, ShieldCheck } from 'lucide-react';

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
      {/* Total Freight Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium tracking-wide uppercase">Total Freight</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {formatCurrency(totalFreight)}
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center space-x-1">
          <span className="text-emerald-400 font-semibold">{totalLrs}</span>
          <span>total LRs processed</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Total Dispatches Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium tracking-wide uppercase">Total Dispatches</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Truck className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {totalDispatches}
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center space-x-1.5">
          <span className="text-indigo-400 font-semibold">{records.filter((r) => r.status === 'In Transit').length}</span>
          <span>active in transit</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Total Weight Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium tracking-wide uppercase">Cargo Weight</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Scale className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {totalWeight.toFixed(2)}{' '}
          <span className="text-xs font-normal text-slate-400">MT</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center space-x-1">
          <span>Avg</span>
          <span className="text-amber-400 font-medium">
            {totalDispatches > 0 ? (totalWeight / totalDispatches).toFixed(1) : 0} MT
          </span>
          <span>/ vehicle</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Fleet Placement Ratio */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium tracking-wide uppercase">Placement</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl sm:text-2xl font-bold text-white">
            {marketCount}
          </span>
          <span className="text-xs text-slate-400">Market</span>
          <span className="text-slate-600">/</span>
          <span className="text-xl sm:text-2xl font-bold text-indigo-400">
            {ownCount}
          </span>
          <span className="text-xs text-slate-400">Own</span>
        </div>
        <div className="mt-1 flex items-center space-x-2 text-[11px]">
          {onFilterPlacement && (
            <div className="flex space-x-1">
              <button
                onClick={() => onFilterPlacement('All')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activePlacementFilter === 'All'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onFilterPlacement('Market')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activePlacementFilter === 'Market'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Market ({marketCount})
              </button>
              <button
                onClick={() => onFilterPlacement('Own')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activePlacementFilter === 'Own'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Own ({ownCount})
              </button>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>
    </div>
  );
};
