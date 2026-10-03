import React, { useState, useMemo } from 'react';
import { DispatchRecord, LRItem } from '../types/dispatch';
import { formatCurrency } from '../lib/calculations';
import { exportToExcel, downloadExcelTemplate } from '../lib/excelService';
import { ExcelImportModal } from './ExcelImportModal';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Edit3, 
  Trash2, 
  Copy, 
  FileSpreadsheet, 
  Download, 
  Upload,
  Truck, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  FileText, 
  Calendar, 
  MapPin, 
  PlusCircle,
  X,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  Hash
} from 'lucide-react';

interface DispatchesListProps {
  records: DispatchRecord[];
  onEdit: (record: DispatchRecord) => void;
  onDelete: (id: string) => void;
  onDuplicate: (record: DispatchRecord) => void;
  onPrint: (record: DispatchRecord) => void;
  onNewEntry: () => void;
  onLoadSampleData: () => void;
  onImportExcel?: (dispatches: DispatchRecord[]) => void;
  initialTransporterFilter?: string;
  initialPlacementFilter?: 'All' | 'Market' | 'Own';
}

export const DispatchesList: React.FC<DispatchesListProps> = ({
  records,
  onEdit,
  onDelete,
  onDuplicate,
  onPrint,
  onNewEntry,
  onLoadSampleData,
  onImportExcel,
  initialTransporterFilter,
  initialPlacementFilter,
}) => {
  // Search & Filter States
  const [keywordQuery, setKeywordQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterExactDate, setFilterExactDate] = useState('');
  const [filterLrNumber, setFilterLrNumber] = useState('');
  const [filterFromParty, setFilterFromParty] = useState('');
  const [filterToParty, setFilterToParty] = useState('');
  const [filterTransporter, setFilterTransporter] = useState(initialTransporterFilter || '');
  const [placementFilter, setPlacementFilter] = useState<'All' | 'Market' | 'Own'>(
    initialPlacementFilter || 'All'
  );
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // UI States
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Distinct parties and transporters for filter dropdowns
  const distinctFromParties = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.fromParty).filter(Boolean))).sort();
  }, [records]);

  const distinctToParties = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.toParty).filter(Boolean))).sort();
  }, [records]);

  const distinctTransporters = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.transporterName).filter(Boolean))).sort();
  }, [records]);

  // Quick Date Range Presets
  const handleDatePreset = (preset: 'today' | '7days' | 'month' | 'clear') => {
    if (preset === 'clear') {
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterExactDate('');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (preset === 'today') {
      setFilterExactDate(today);
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === '7days') {
      const past = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      setFilterStartDate(past);
      setFilterEndDate(today);
      setFilterExactDate('');
    } else if (preset === 'month') {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setFilterStartDate(firstDay);
      setFilterEndDate(today);
      setFilterExactDate('');
    }
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    keywordQuery.trim() ||
    filterStartDate ||
    filterEndDate ||
    filterExactDate ||
    filterLrNumber.trim() ||
    filterFromParty ||
    filterToParty ||
    filterTransporter ||
    placementFilter !== 'All' ||
    statusFilter !== 'All'
  );

  // Clear all filters
  const handleClearAllFilters = () => {
    setKeywordQuery('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterExactDate('');
    setFilterLrNumber('');
    setFilterFromParty('');
    setFilterToParty('');
    setFilterTransporter('');
    setPlacementFilter('All');
    setStatusFilter('All');
  };

  // Filtering Logic
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // 1. Placement Filter
      if (placementFilter !== 'All' && rec.placement !== placementFilter) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'All' && rec.status !== statusFilter) {
        return false;
      }

      // 3. Exact Date Filter
      if (filterExactDate && rec.date !== filterExactDate) {
        return false;
      }

      // 4. Date Range Filter
      if (filterStartDate && rec.date < filterStartDate) {
        return false;
      }
      if (filterEndDate && rec.date > filterEndDate) {
        return false;
      }

      // 5. From Party Filter
      if (filterFromParty && rec.fromParty.toLowerCase() !== filterFromParty.toLowerCase()) {
        return false;
      }

      // 6. To Party Filter
      if (filterToParty && rec.toParty.toLowerCase() !== filterToParty.toLowerCase()) {
        return false;
      }

      // 7. Transporter Filter
      if (filterTransporter && rec.transporterName.toLowerCase() !== filterTransporter.toLowerCase()) {
        return false;
      }

      // 8. LR Number Filter (exact or prefix match in top-level or inside LRs)
      if (filterLrNumber.trim()) {
        const lrQ = filterLrNumber.trim().toLowerCase();
        const topLevelMatches = (rec.lrNumbers || []).some((num) =>
          num.toLowerCase().includes(lrQ)
        );
        const nestedMatches = (rec.lrs || []).some((lr) =>
          lr.lrNumber.toLowerCase().includes(lrQ)
        );
        if (!topLevelMatches && !nestedMatches) {
          return false;
        }
      }

      // 9. Universal Keyword Search (across all fields)
      if (keywordQuery.trim()) {
        const q = keywordQuery.toLowerCase();
        const inTrip =
          rec.date.toLowerCase().includes(q) ||
          rec.fromParty.toLowerCase().includes(q) ||
          rec.toParty.toLowerCase().includes(q) ||
          rec.transporterName.toLowerCase().includes(q) ||
          rec.vehicleNumber.toLowerCase().includes(q) ||
          (rec.driverName && rec.driverName.toLowerCase().includes(q)) ||
          (rec.notes && rec.notes.toLowerCase().includes(q));

        if (inTrip) return true;

        const inLRs = (rec.lrs || []).some((lr) => {
          return (
            lr.lrNumber.toLowerCase().includes(q) ||
            lr.consignorName.toLowerCase().includes(q) ||
            lr.consignorCity.toLowerCase().includes(q) ||
            lr.consigneeName.toLowerCase().includes(q) ||
            lr.consigneeCity.toLowerCase().includes(q) ||
            (lr.invoiceNumbers || []).some((inv) => inv.toLowerCase().includes(q)) ||
            (lr.ewaybillNumbers || []).some((ewb) => ewb.toLowerCase().includes(q)) ||
            (lr.remarks && lr.remarks.toLowerCase().includes(q))
          );
        });

        if (!inLRs) return false;
      }

      return true;
    });
  }, [
    records,
    placementFilter,
    statusFilter,
    filterExactDate,
    filterStartDate,
    filterEndDate,
    filterFromParty,
    filterToParty,
    filterTransporter,
    filterLrNumber,
    keywordQuery,
  ]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      'Dispatch Date',
      'Vehicle Number',
      'Placement',
      'Transporter Name',
      'From Party',
      'To Party',
      'LR Number',
      'Consignor Name',
      'Consignor City',
      'Consignee Name',
      'Consignee City',
      'Invoice Numbers',
      'E-Waybill Numbers',
      'Weight (MT)',
      'Freight Rate',
      'Rate Basis',
      'Freight Amount (INR)',
      'Advance Amount',
      'Extra Charges',
      'Net Payable',
      'Market Weight (MT)',
      'Market Rate',
      'Gross Market Freight',
      'Deductions: Commission',
      'Deductions: Advance',
      'Net Market Freight',
      'Status',
    ];

    const rows: string[][] = [];

    for (const dsp of filteredRecords) {
      if (dsp.lrs && dsp.lrs.length > 0) {
        for (const lr of dsp.lrs) {
          rows.push([
            `"${dsp.date}"`,
            `"${dsp.vehicleNumber}"`,
            `"${dsp.placement}"`,
            `"${dsp.transporterName.replace(/"/g, '""')}"`,
            `"${dsp.fromParty.replace(/"/g, '""')}"`,
            `"${dsp.toParty.replace(/"/g, '""')}"`,
            `"${lr.lrNumber}"`,
            `"${lr.consignorName.replace(/"/g, '""')}"`,
            `"${lr.consignorCity}"`,
            `"${lr.consigneeName.replace(/"/g, '""')}"`,
            `"${lr.consigneeCity}"`,
            `"${(lr.invoiceNumbers || []).join('; ')}"`,
            `"${(lr.ewaybillNumbers || []).join('; ')}"`,
            `"${lr.weight}"`,
            `"${lr.rate}"`,
            `"${lr.rateType}"`,
            `"${lr.freightAmount}"`,
            `"${lr.advanceAmount || 0}"`,
            `"${lr.extraCharges || 0}"`,
            `"${(lr.freightAmount || 0) + (lr.extraCharges || 0) - (lr.advanceAmount || 0)}"`,
            `"${lr.marketWeight || ''}"`,
            `"${lr.marketRate || ''}"`,
            `"${lr.grossMarketFreight || ''}"`,
            `"${lr.marketCommission || ''}"`,
            `"${lr.marketAdvance || ''}"`,
            `"${lr.netMarketFreight || ''}"`,
            `"${dsp.status}"`,
          ]);
        }
      }
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Filtered_Dispatches_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. PRIMARY SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Universal Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword: LR #, party, transporter, vehicle, invoice #, e-waybill..."
              value={keywordQuery}
              onChange={(e) => setKeywordQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] focus:border-[#00E676] shadow-inner font-medium"
            />
            {keywordQuery && (
              <button
                onClick={() => setKeywordQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Controls & Toggle Advanced Filters */}
          <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap">
            {/* Placement Quick Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {(['All', 'Market', 'Own'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlacementFilter(p)}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                    placementFilter === p
                      ? p === 'Market'
                        ? 'bg-[#FFB700] text-slate-950 shadow-xs'
                        : p === 'Own'
                        ? 'bg-[#00D2FF] text-slate-950 shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Toggle Filter Drawer Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-[#00E676] animate-pulse" />
              )}
            </button>

            {/* Excel (.xlsx) Operations Suite */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {/* Import Excel */}
              <button
                onClick={() => setIsExcelImportOpen(true)}
                title="Import dispatches and multiple LRs from Excel (.xlsx) - with duplicate protection"
                className="px-3 py-1.5 rounded-lg bg-[#00E676] hover:bg-[#00c864] text-slate-950 border border-emerald-400 text-xs font-black flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-slate-950" />
                <span>Import .xlsx</span>
              </button>

              {/* Export Excel (.xlsx) */}
              <button
                onClick={() => exportToExcel(filteredRecords)}
                disabled={filteredRecords.length === 0}
                title="Export filtered dispatches and nested LRs to Excel workbook (.xlsx)"
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold flex items-center space-x-1.5 border border-slate-200 disabled:opacity-40 transition-colors shadow-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export</span>
                <span>.xlsx</span>
              </button>

              {/* Template Download */}
              <button
                onClick={downloadExcelTemplate}
                title="Download formatted Excel Import Template (.xlsx)"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              title="Export filtered records to CSV"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold hidden md:flex items-center space-x-1"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 2. ADVANCED FILTERS DRAWER (Date, LR Number, From Party, To Party) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Field 1: LR Number Filter */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center space-x-1">
                  <Hash className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Filter by LR Number</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. LR-MH-8901"
                    value={filterLrNumber}
                    onChange={(e) => setFilterLrNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 uppercase font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                  />
                  {filterLrNumber && (
                    <button
                      onClick={() => setFilterLrNumber('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Field 2: From Party Filter */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center space-x-1">
                  <Building2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>From Party (Origin)</span>
                </label>
                <select
                  value={filterFromParty}
                  onChange={(e) => setFilterFromParty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676] cursor-pointer"
                >
                  <option value="">All From Parties</option>
                  {distinctFromParties.map((party) => (
                    <option key={party} value={party}>
                      {party}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: To Party Filter */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center space-x-1">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>To Party (Destination)</span>
                </label>
                <select
                  value={filterToParty}
                  onChange={(e) => setFilterToParty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676] cursor-pointer"
                >
                  <option value="">All To Parties</option>
                  {distinctToParties.map((party) => (
                    <option key={party} value={party}>
                      {party}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 4: Transporter Filter */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center space-x-1">
                  <Truck className="h-3.5 w-3.5 text-purple-600" />
                  <span>Transporter / Fleet</span>
                </label>
                <select
                  value={filterTransporter}
                  onChange={(e) => setFilterTransporter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00E676] cursor-pointer"
                >
                  <option value="">All Transporters</option>
                  {distinctTransporters.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filters: Range or Exact Date + Quick Presets */}
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Date Filters & Ranges:</span>
                </span>

                {/* Quick Presets */}
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleDatePreset('today')}
                    className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-[11px] text-slate-700 font-semibold"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleDatePreset('7days')}
                    className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-[11px] text-slate-700 font-semibold"
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => handleDatePreset('month')}
                    className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-[11px] text-slate-700 font-semibold"
                  >
                    This Month
                  </button>
                  {(filterStartDate || filterEndDate || filterExactDate) && (
                    <button
                      onClick={() => handleDatePreset('clear')}
                      className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] font-bold"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-0.5">Exact Dispatch Date</label>
                  <input
                    type="date"
                    value={filterExactDate}
                    onChange={(e) => {
                      setFilterExactDate(e.target.value);
                      if (e.target.value) {
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-0.5">From Date (Range Start)</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setFilterExactDate('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-semibold mb-0.5">To Date (Range End)</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setFilterExactDate('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. ACTIVE FILTER CHIPS BAR */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px] uppercase font-bold">Active:</span>

            {keywordQuery && (
              <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span>Keyword: "{keywordQuery}"</span>
                <button onClick={() => setKeywordQuery('')}><X className="h-3 w-3 text-slate-500 hover:text-slate-900" /></button>
              </span>
            )}

            {filterLrNumber && (
              <span className="inline-flex items-center space-x-1 bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono">
                <span>LR: {filterLrNumber}</span>
                <button onClick={() => setFilterLrNumber('')}><X className="h-3 w-3 text-indigo-600 hover:text-indigo-950" /></button>
              </span>
            )}

            {filterFromParty && (
              <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span>From: {filterFromParty}</span>
                <button onClick={() => setFilterFromParty('')}><X className="h-3 w-3 text-amber-700 hover:text-amber-950" /></button>
              </span>
            )}

            {filterToParty && (
              <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span>To: {filterToParty}</span>
                <button onClick={() => setFilterToParty('')}><X className="h-3 w-3 text-emerald-700 hover:text-emerald-950" /></button>
              </span>
            )}

            {filterTransporter && (
              <span className="inline-flex items-center space-x-1 bg-purple-50 text-purple-900 border border-purple-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span>Transporter: {filterTransporter}</span>
                <button onClick={() => setFilterTransporter('')}><X className="h-3 w-3 text-purple-700 hover:text-purple-950" /></button>
              </span>
            )}

            {filterExactDate && (
              <span className="inline-flex items-center space-x-1 bg-sky-50 text-sky-900 border border-sky-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono">
                <span>Date: {filterExactDate}</span>
                <button onClick={() => setFilterExactDate('')}><X className="h-3 w-3 text-sky-700 hover:text-sky-950" /></button>
              </span>
            )}

            {(filterStartDate || filterEndDate) && (
              <span className="inline-flex items-center space-x-1 bg-sky-50 text-sky-900 border border-sky-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono">
                <span>{filterStartDate || 'Start'} → {filterEndDate || 'End'}</span>
                <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}><X className="h-3 w-3 text-sky-700 hover:text-sky-950" /></button>
              </span>
            )}

            {placementFilter !== 'All' && (
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                placementFilter === 'Market'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : 'bg-cyan-100 text-cyan-950 border border-cyan-300'
              }`}>
                <span>{placementFilter} Fleet</span>
                <button onClick={() => setPlacementFilter('All')}><X className="h-3 w-3" /></button>
              </span>
            )}

            <button
              onClick={handleClearAllFilters}
              className="text-rose-600 hover:text-rose-800 text-[11px] underline ml-auto font-bold"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count & Quick Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1 font-medium">
        <div>
          Showing <span className="text-slate-950 font-black">{filteredRecords.length}</span> of{' '}
          <span className="text-slate-950 font-black">{records.length}</span> dispatches
          {hasActiveFilters && (
            <span className="text-emerald-700 font-bold ml-1.5">(Filtered)</span>
          )}
        </div>

        {records.length === 0 && (
          <button
            onClick={onLoadSampleData}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center space-x-1"
          >
            <span>Load Sample Fleet & LR Data</span>
          </button>
        )}
      </div>

      {/* 4. FILTERED RECORDS TABLE / CARDS */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <Search className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">No Matching Dispatches</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 font-medium">
              {hasActiveFilters
                ? 'No records match your selected filter criteria. Try broadening your date range or clearing individual filters.'
                : 'Get started by creating your first vehicle dispatch and LR record, or load realistic sample records.'}
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            {hasActiveFilters ? (
              <button
                onClick={handleClearAllFilters}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onNewEntry}
                  className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 text-xs font-black rounded-xl shadow-xs border border-emerald-400 transition-all flex items-center space-x-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create New Dispatch</span>
                </button>
                <button
                  onClick={onLoadSampleData}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all"
                >
                  Load Sample Records
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRecords.map((dsp) => {
            const isExpanded = expandedId === dsp.id;

            return (
              <div
                key={dsp.id}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
              >
                {/* Main Card Header / Summary Row */}
                <div
                  className="p-4 sm:p-5 cursor-pointer select-none"
                  onClick={() => toggleExpand(dsp.id)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Date, Vehicle, Transporter & Route */}
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                          <Truck className="h-5 w-5 text-slate-900" />
                        </div>
                      </div>

                      <div>
                        {/* Vehicle Number & Placement Badge */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-mono font-black text-base sm:text-lg text-slate-950 tracking-tight">
                            {dsp.vehicleNumber}
                          </span>
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider ${
                              dsp.placement === 'Market'
                                ? 'bg-[#FFB700] text-slate-950 border border-amber-400'
                                : 'bg-[#00D2FF] text-slate-950 border border-cyan-400'
                            }`}
                          >
                            {dsp.placement}
                          </span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase ${
                              dsp.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : dsp.status === 'In Transit'
                                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {dsp.status}
                          </span>

                          {/* Sync Status Badge */}
                          {dsp.syncStatus === 'pending' ? (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-300 flex items-center space-x-1">
                              <Clock className="h-2.5 w-2.5 text-amber-700" />
                              <span>Offline Pending</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Cloud Synced</span>
                            </span>
                          )}
                        </div>

                        {/* Transporter and Route */}
                        <div className="text-xs text-slate-700 font-medium mt-1">
                          <span className="text-slate-500 font-normal">Transporter:</span>{' '}
                          <span className="text-slate-950 font-bold">{dsp.transporterName}</span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center space-x-1.5 mt-0.5 font-medium">
                          <span className={filterFromParty ? 'text-amber-800 font-bold bg-amber-50 px-1 rounded' : ''}>
                            {dsp.fromParty}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className={filterToParty ? 'text-emerald-800 font-bold bg-emerald-50 px-1 rounded' : 'text-slate-800 font-semibold'}>
                            {dsp.toParty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: LRs and Cargo Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-xs border-t lg:border-t-0 border-slate-100 pt-2 lg:pt-0">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          LR Count
                        </div>
                        <div className="font-black text-slate-950 font-mono text-sm">
                          {dsp.totalLrsCount || dsp.lrs?.length || 0} LRs
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-4">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Weight
                        </div>
                        <div className="font-black text-amber-800 font-mono text-sm">
                          {dsp.totalWeight} MT
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-4">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Total Freight
                        </div>
                        <div className="font-black text-emerald-700 font-mono text-base">
                          {formatCurrency(dsp.totalFreightAmount)}
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-4 hidden sm:block">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Date
                        </div>
                        <div className="text-slate-700 font-mono text-xs font-semibold">
                          {dsp.date}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div
                      className="flex items-center space-x-1.5 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onPrint(dsp)}
                        title="Print Lorry Receipt Slip"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors border border-slate-200"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(dsp)}
                        title="Edit Dispatch"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-700 hover:text-indigo-950 transition-colors border border-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicate(dsp)}
                        title="Duplicate as new dispatch"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors border border-slate-200"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(dsp.id)}
                        title="Delete Dispatch"
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors border border-rose-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(dsp.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* LR Numbers quick pills on summary card */}
                  {dsp.lrNumbers && dsp.lrNumbers.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        LRs:
                      </span>
                      {dsp.lrNumbers.map((lrNum) => {
                        const isMatch = filterLrNumber && lrNum.toLowerCase().includes(filterLrNumber.toLowerCase());
                        return (
                          <span
                            key={lrNum}
                            className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                              isMatch
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {lrNum}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expanded Details: Nested LRs, Invoices, E-Waybills */}
                {isExpanded && (
                  <div className="bg-[#F8FAFC] border-t border-slate-200 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Attached Lorry Receipts (LR Details)</span>
                      </h4>
                      <span className="text-xs text-slate-600 font-bold">
                        Total {dsp.lrs?.length || 0} LR Item(s)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(dsp.lrs || []).map((lr, idx) => (
                        <div
                          key={lr.id || idx}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs space-y-2.5 shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="h-5 w-5 rounded bg-slate-100 text-slate-800 font-black flex items-center justify-center font-mono text-[10px]">
                                #{idx + 1}
                              </span>
                              <span className="font-black text-slate-950 font-mono text-sm">
                                LR: {lr.lrNumber}
                              </span>
                              {lr.lrDate && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  ({lr.lrDate})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-3 font-mono">
                              <span className="text-slate-700 font-bold">
                                {lr.weight} {lr.weightUnit} @ ₹{lr.rate}
                              </span>
                              <span className="font-black text-emerald-700 text-sm">
                                {formatCurrency(lr.freightAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Consignor -> Consignee Route */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                            <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                Consignor (Sender)
                              </span>
                              <div className="font-bold text-slate-950 mt-0.5">{lr.consignorName}</div>
                              <div className="text-slate-600 text-[11px] flex items-center space-x-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-indigo-600" />
                                <span>{lr.consignorCity}</span>
                              </div>
                            </div>

                            <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                Consignee (Receiver)
                              </span>
                              <div className="font-bold text-slate-950 mt-0.5">{lr.consigneeName}</div>
                              <div className="text-slate-600 text-[11px] flex items-center space-x-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-emerald-600" />
                                <span>{lr.consigneeCity}</span>
                              </div>
                            </div>
                          </div>

                          {/* Multiple Invoices and E-Waybills Badges */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                                Invoices ({lr.invoiceNumbers?.length || 0}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {lr.invoiceNumbers && lr.invoiceNumbers.length > 0 ? (
                                  lr.invoiceNumbers.map((inv) => (
                                    <span
                                      key={inv}
                                      className="bg-amber-100 border border-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                                    >
                                      {inv}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">
                                    None entered
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                                E-waybills ({lr.ewaybillNumbers?.length || 0}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {lr.ewaybillNumbers && lr.ewaybillNumbers.length > 0 ? (
                                  lr.ewaybillNumbers.map((ewb) => (
                                    <span
                                      key={ewb}
                                      className="bg-cyan-100 border border-cyan-300 text-cyan-950 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                                    >
                                      {ewb}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">
                                    None entered
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Charges Breakdown */}
                          {(lr.advanceAmount > 0 || lr.extraCharges > 0) && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-[11px] text-slate-600">
                              {lr.advanceAmount > 0 && (
                                <span>
                                  Client Advance: <strong className="text-slate-900 font-bold">{formatCurrency(lr.advanceAmount)}</strong>
                                </span>
                              )}
                              {lr.extraCharges > 0 && (
                                <span>
                                  Extra Charges: <strong className="text-slate-900 font-bold">{formatCurrency(lr.extraCharges)}</strong>
                                </span>
                              )}
                              <span>
                                Net Client Balance: <strong className="text-slate-950 font-black">{formatCurrency((lr.freightAmount || 0) + (lr.extraCharges || 0) - (lr.advanceAmount || 0))}</strong>
                              </span>
                            </div>
                          )}

                          {/* MARKET VEHICLE PLACEMENT DATA SCHEME (When placement === 'Market') */}
                          {dsp.placement === 'Market' && (lr.grossMarketFreight || lr.marketWeight || lr.netMarketFreight) ? (
                            <div className="mt-2 p-3 rounded-xl bg-[#FFFBEB] border border-amber-300 text-[11px] space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between text-amber-950 font-bold border-b border-amber-200 pb-1">
                                <span className="flex items-center space-x-1">
                                  <Truck className="h-3.5 w-3.5 text-amber-700" />
                                  <span>Market Vehicle Hire Contract & Deductions</span>
                                </span>
                                <span className="font-mono text-xs text-amber-950 font-black bg-amber-200/80 px-2 py-0.5 rounded">
                                  Net Payable: {formatCurrency(lr.netMarketFreight || 0)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800 font-mono">
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans font-semibold">Market Weight</span>
                                  <span className="font-bold">{lr.marketWeight || lr.weight} MT</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans font-semibold">Market Rate</span>
                                  <span className="font-bold">₹{lr.marketRate || 0}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans font-semibold">Gross Market Hire</span>
                                  <span className="text-amber-900 font-black">{formatCurrency(lr.grossMarketFreight || 0)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans font-semibold">Deductions (Comm + Adv)</span>
                                  <span className="text-rose-700 font-bold">
                                    -{formatCurrency((lr.marketCommission || 0) + (lr.marketAdvance || 0))}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-amber-200">
                                <span>Commission: {formatCurrency(lr.marketCommission || 0)} | Vehicle Advance: {formatCurrency(lr.marketAdvance || 0)}</span>
                                {lr.freightAmount > 0 && (lr.grossMarketFreight || 0) > 0 && (
                                  <span className="text-emerald-800 font-black font-mono">
                                    LR Margin: {formatCurrency(lr.freightAmount - (lr.grossMarketFreight || 0))}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => onPrint(dsp)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs"
                      >
                        <Printer className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Print Consignment Slip</span>
                      </button>
                      <button
                        onClick={() => onEdit(dsp)}
                        className="px-3.5 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-lg text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-1"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit This Dispatch</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Excel Import Modal with Duplicate Protection & Template */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        existingRecords={records}
        onImportSuccess={(validDispatches) => {
          if (onImportExcel) {
            onImportExcel(validDispatches);
          }
          setIsExcelImportOpen(false);
        }}
      />
    </div>
  );
};
