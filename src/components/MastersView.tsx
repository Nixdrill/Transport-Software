import React, { useState, useMemo } from 'react';
import { 
  PartyMaster, 
  VehicleMaster, 
  TransporterMaster, 
  RouteMaster, 
  DriverMaster, 
  CommodityMaster, 
  AllMasters 
} from '../types/masters';
import { 
  getMasters, 
  saveMasters, 
  resetMastersToDefaults 
} from '../lib/mastersService';
import { analyzeRouteWithMaps } from '../lib/geminiService';
import { generateSafeId, formatCurrency } from '../lib/calculations';
import { 
  Building2, 
  Truck, 
  Users, 
  Route, 
  UserCheck, 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  MapPin, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle,
  ArrowRight,
  Shield,
  Phone,
  FileText,
  Percent,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface MastersViewProps {
  onMastersUpdated?: (updated: AllMasters) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type MasterCategory = 'parties' | 'vehicles' | 'transporters' | 'routes' | 'drivers' | 'commodities';

export const MastersView: React.FC<MastersViewProps> = ({
  onMastersUpdated,
  showNotification,
}) => {
  const [masters, setMasters] = useState<AllMasters>(() => getMasters());
  const [activeCategory, setActiveCategory] = useState<MasterCategory>('parties');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Gemini AI Corridor Benchmarker State inside Masters
  const [isAiBenchmarkerOpen, setIsAiBenchmarkerOpen] = useState(false);
  const [aiOrigin, setAiOrigin] = useState('');
  const [aiDestination, setAiDestination] = useState('');
  const [aiVehicleType, setAiVehicleType] = useState('Multi-Axle Commercial Truck (25 MT)');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Helper to commit changes
  const persistChanges = (updated: AllMasters) => {
    saveMasters(updated);
    setMasters(updated);
    if (onMastersUpdated) {
      onMastersUpdated(updated);
    }
  };

  // Reset to default sample masters
  const handleResetDefaults = () => {
    if (confirm('Reset all masters to default logistics dataset? Any custom records will be replaced.')) {
      const def = resetMastersToDefaults();
      setMasters(def);
      if (onMastersUpdated) onMastersUpdated(def);
      showNotification('Masters data reset to Indian logistics master standard dataset.', 'success');
    }
  };

  // Export masters to JSON file
  const handleExportJSON = () => {
    const payload = {
      app: 'LogiTrack Transport Masters',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      masters,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_Masters_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showNotification('Masters dataset exported to JSON file.', 'success');
  };

  // Import masters from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedMasters = parsed.masters || parsed;
        if (!importedMasters.parties || !importedMasters.vehicles) {
          throw new Error('Invalid masters JSON format.');
        }
        persistChanges(importedMasters);
        showNotification('Masters imported successfully with full records.', 'success');
      } catch (err: any) {
        showNotification(err?.message || 'Failed to import masters JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Delete an item
  const handleDeleteItem = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from masters?`)) return;

    const updated = { ...masters };
    if (activeCategory === 'parties') {
      updated.parties = updated.parties.filter((p) => p.id !== id);
    } else if (activeCategory === 'vehicles') {
      updated.vehicles = updated.vehicles.filter((v) => v.id !== id);
    } else if (activeCategory === 'transporters') {
      updated.transporters = updated.transporters.filter((t) => t.id !== id);
    } else if (activeCategory === 'routes') {
      updated.routes = updated.routes.filter((r) => r.id !== id);
    } else if (activeCategory === 'drivers') {
      updated.drivers = updated.drivers.filter((d) => d.id !== id);
    } else if (activeCategory === 'commodities') {
      updated.commodities = updated.commodities.filter((c) => c.id !== id);
    }

    persistChanges(updated);
    showNotification(`Removed "${name}" from ${activeCategory} master.`, 'info');
  };

  // Gemini AI Benchmarking for Routes
  const handleRunAiBenchmark = async () => {
    if (!aiOrigin.trim() || !aiDestination.trim()) {
      setAiError('Please enter both origin and destination cities.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const res = await analyzeRouteWithMaps(aiOrigin.trim(), aiDestination.trim(), {
        vehicleType: aiVehicleType,
        cargoWeight: 25,
      });

      // Extract details
      const distance = res.estDistanceKm || 500;
      const days = Math.max(1, Math.ceil(distance / 450));
      const estRate = Math.round(distance * 3.5); // Approx rate guideline per MT

      setAiResult({
        ...res,
        distance,
        days,
        estRate,
      });
    } catch (err: any) {
      setAiError(err?.message || 'Failed to generate corridor benchmark via Gemini AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Save AI-benchmarked corridor into Route Master with 1 click
  const handleSaveAiBenchmarkToRoutes = () => {
    if (!aiResult) return;

    const newRoute: RouteMaster = {
      id: generateSafeId('rt'),
      origin: aiOrigin.trim(),
      destination: aiDestination.trim(),
      distanceKm: aiResult.distance,
      transitDays: aiResult.days,
      benchmarkRatePerMT: aiResult.estRate,
      primaryHighways: 'Google Maps Grounded Highway Corridor',
      standardCommission: 500,
      defaultAdvancePercent: 75,
      tollChargesApprox: Math.round(aiResult.distance * 4.5),
      notes: aiResult.report?.slice(0, 200) + '...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = {
      ...masters,
      routes: [newRoute, ...masters.routes],
    };

    persistChanges(updated);
    showNotification(`Added corridor ${aiOrigin} → ${aiDestination} (${aiResult.distance} km) to Route Master!`, 'success');
    setIsAiBenchmarkerOpen(false);
    setActiveCategory('routes');
  };

  // Filtered Items based on search query
  const filteredParties = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masters.parties;
    return masters.parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(q))
    );
  }, [masters.parties, searchQuery]);

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masters.vehicles;
    return masters.vehicles.filter(
      (v) =>
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.vehicleType.toLowerCase().includes(q) ||
        (v.transporterName && v.transporterName.toLowerCase().includes(q)) ||
        (v.driverName && v.driverName.toLowerCase().includes(q))
    );
  }, [masters.vehicles, searchQuery]);

  const filteredTransporters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masters.transporters;
    return masters.transporters.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.city && t.city.toLowerCase().includes(q)) ||
        (t.panNumber && t.panNumber.toLowerCase().includes(q)) ||
        (t.contactPerson && t.contactPerson.toLowerCase().includes(q))
    );
  }, [masters.transporters, searchQuery]);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masters.routes;
    return masters.routes.filter(
      (r) =>
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        (r.primaryHighways && r.primaryHighways.toLowerCase().includes(q))
    );
  }, [masters.routes, searchQuery]);

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masters.drivers;
    return masters.drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q)) ||
        (d.associatedVehicle && d.associatedVehicle.toLowerCase().includes(q))
    );
  }, [masters.drivers, searchQuery]);

  const filteredCommodities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masters.commodities;
    return masters.commodities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.hsnCode && c.hsnCode.includes(q)) ||
        (c.packagingType && c.packagingType.toLowerCase().includes(q))
    );
  }, [masters.commodities, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
              <Building2 className="h-6 w-6 text-slate-900" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Logistics Master Data Center
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Auto-Fill & Automation
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Maintain verified Parties, Vehicles, Transporters, Corridors, Drivers, and Commodities for 1-click dispatch auto-fill.
          </p>
        </div>

        {/* Global Master Operations */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Gemini AI Corridor Benchmarker Trigger */}
          <button
            type="button"
            onClick={() => setIsAiBenchmarkerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 text-slate-900 border border-emerald-400 font-black text-xs flex items-center space-x-1.5 shadow-xs hover:bg-emerald-50 transition-all cursor-pointer"
            title="Generate Corridors and Rate Benchmarks with Gemini AI & Google Maps"
          >
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span>AI Corridor Benchmarker</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors"
            title="Export Masters to JSON"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-bold transition-colors"
            title="Reset to Sample Logistics Masters"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setActiveCategory('parties')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeCategory === 'parties'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Parties</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-950 font-mono mt-1">
            {masters.parties.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Consignors/Clients</div>
        </div>

        <div 
          onClick={() => setActiveCategory('vehicles')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeCategory === 'vehicles'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Vehicles</span>
            <Truck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-950 font-mono mt-1">
            {masters.vehicles.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {masters.vehicles.filter((v) => v.placement === 'Market').length} Mkt / {masters.vehicles.filter((v) => v.placement === 'Own').length} Own
          </div>
        </div>

        <div 
          onClick={() => setActiveCategory('transporters')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeCategory === 'transporters'
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Transporters</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-950 font-mono mt-1">
            {masters.transporters.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Lorry Suppliers</div>
        </div>

        <div 
          onClick={() => setActiveCategory('routes')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeCategory === 'routes'
              ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Corridors</span>
            <Route className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-slate-950 font-mono mt-1">
            {masters.routes.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Rate Benchmarks</div>
        </div>

        <div 
          onClick={() => setActiveCategory('drivers')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeCategory === 'drivers'
              ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Drivers</span>
            <UserCheck className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-slate-950 font-mono mt-1">
            {masters.drivers.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Licensed Crew</div>
        </div>

        <div 
          onClick={() => setActiveCategory('commodities')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeCategory === 'commodities'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Commodities</span>
            <Package className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-slate-950 font-mono mt-1">
            {masters.commodities.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">HSN & Cargo</div>
        </div>
      </div>

      {/* Navigation Subtabs & Search / Add Row */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Subtabs */}
          <div className="flex space-x-1.5 overflow-x-auto">
            <button
              onClick={() => { setActiveCategory('parties'); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeCategory === 'parties'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Parties</span>
            </button>

            <button
              onClick={() => { setActiveCategory('vehicles'); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeCategory === 'vehicles'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Vehicles</span>
            </button>

            <button
              onClick={() => { setActiveCategory('transporters'); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeCategory === 'transporters'
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Transporters</span>
            </button>

            <button
              onClick={() => { setActiveCategory('routes'); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeCategory === 'routes'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <Route className="h-3.5 w-3.5" />
              <span>Corridors</span>
            </button>

            <button
              onClick={() => { setActiveCategory('drivers'); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeCategory === 'drivers'
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Drivers</span>
            </button>

            <button
              onClick={() => { setActiveCategory('commodities'); setSearchQuery(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                activeCategory === 'commodities'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Commodities</span>
            </button>
          </div>

          {/* Add Record Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 text-xs font-black shadow-xs border border-emerald-400 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add New {activeCategory.slice(0, -1)}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeCategory} by name, city, GSTIN, code, or phone...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MASTER LIST TABLE / CARDS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* CATEGORY 1: PARTIES */}
        {activeCategory === 'parties' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Role / Type</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No parties match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((pty) => (
                    <tr key={pty.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-950 text-sm">
                        {pty.name}
                        {pty.address && (
                          <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                            {pty.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                          pty.type === 'Consignor'
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : pty.type === 'Consignee'
                            ? 'bg-sky-100 text-sky-950 border border-sky-300'
                            : 'bg-purple-100 text-purple-950 border border-purple-300'
                        }`}>
                          {pty.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {pty.city}, {pty.state}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {pty.gstin || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{pty.contactPerson || '-'}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{pty.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {pty.defaultPaymentTerms || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(pty);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                            title="Edit Party"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(pty.id, pty.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Party"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CATEGORY 2: VEHICLES */}
        {activeCategory === 'vehicles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Vehicle Number</th>
                  <th className="py-3 px-4">Placement</th>
                  <th className="py-3 px-4">Type & Capacity</th>
                  <th className="py-3 px-4">Transporter / Fleet</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No vehicles match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((veh) => (
                    <tr key={veh.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-slate-950 text-sm tracking-wide bg-slate-100 px-2 py-1 rounded border border-slate-300">
                          {veh.vehicleNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                          veh.placement === 'Market'
                            ? 'bg-[#FFB700] text-stone-950 border border-amber-500'
                            : 'bg-[#00E676] text-slate-950 border border-emerald-500'
                        }`}>
                          {veh.placement}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900">{veh.vehicleType}</div>
                        <div className="text-slate-500 font-bold font-mono text-[11px]">
                          Capacity: {veh.capacityMT} MT
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {veh.transporterName || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{veh.driverName || '-'}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{veh.driverPhone || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          <Check className="h-3 w-3" />
                          <span>{veh.status}</span>
                        </span>
                        {veh.fitnessExpiry && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Fit exp: {veh.fitnessExpiry}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(veh);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                            title="Edit Vehicle"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(veh.id, veh.vehicleNumber)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CATEGORY 3: TRANSPORTERS */}
        {activeCategory === 'transporters' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Transporter Name</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">PAN & GSTIN</th>
                  <th className="py-3 px-4">Default Commission</th>
                  <th className="py-3 px-4">Default Advance</th>
                  <th className="py-3 px-4">TDS Declaration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransporters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No transporters match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredTransporters.map((trn) => (
                    <tr key={trn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-950 text-sm">{trn.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {trn.contactPerson} • {trn.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {trn.city || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        <div>PAN: {trn.panNumber || '-'}</div>
                        <div className="text-[11px] text-slate-500 font-normal">GST: {trn.gstin || '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-amber-800 text-sm">
                        {formatCurrency(trn.defaultCommission || 500)}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                        {trn.defaultAdvancePercent || 70}%
                      </td>
                      <td className="py-3 px-4">
                        {trn.tdsDeclaration ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-[10px] uppercase">
                            Sec 194C Nil
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[10px] uppercase">
                            Standard TDS
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(trn);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                            title="Edit Transporter"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(trn.id, trn.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Transporter"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CATEGORY 4: CORRIDORS / ROUTES */}
        {activeCategory === 'routes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Corridor (Origin → Destination)</th>
                  <th className="py-3 px-4">Distance (km)</th>
                  <th className="py-3 px-4">Transit Time</th>
                  <th className="py-3 px-4">Primary Highways</th>
                  <th className="py-3 px-4">Benchmark Rate</th>
                  <th className="py-3 px-4">Est. Toll Charges</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No corridors match your search query. Try the "AI Corridor Benchmarker" button above!
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((rt) => (
                    <tr key={rt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2 font-black text-slate-950 text-sm">
                          <span>{rt.origin}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <span>{rt.destination}</span>
                        </div>
                        {rt.notes && (
                          <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs mt-0.5">
                            {rt.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 text-sm">
                        {rt.distanceKm} km
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {rt.transitDays} {rt.transitDays === 1 ? 'Day' : 'Days'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {rt.primaryHighways || 'National Highway'}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                        ₹{rt.benchmarkRatePerMT} / MT
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {rt.tollChargesApprox ? formatCurrency(rt.tollChargesApprox) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(rt);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                            title="Edit Corridor"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(rt.id, `${rt.origin} → ${rt.destination}`)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Corridor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CATEGORY 5: DRIVERS */}
        {activeCategory === 'drivers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Driver Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Driving License #</th>
                  <th className="py-3 px-4">License Expiry</th>
                  <th className="py-3 px-4">Assigned Vehicle</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No drivers match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((drv) => (
                    <tr key={drv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-950 text-sm">
                        {drv.name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {drv.phone}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {drv.licenseNumber || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {drv.licenseExpiry || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {drv.associatedVehicle || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {drv.emergencyContact || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(drv);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                            title="Edit Driver"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(drv.id, drv.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CATEGORY 6: COMMODITIES */}
        {activeCategory === 'commodities' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Commodity / Material</th>
                  <th className="py-3 px-4">HSN Code</th>
                  <th className="py-3 px-4">Default Weight Unit</th>
                  <th className="py-3 px-4">Default Rate Type</th>
                  <th className="py-3 px-4">Packaging Standard</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCommodities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                      No commodities match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredCommodities.map((cmd) => (
                    <tr key={cmd.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-950 text-sm">
                        {cmd.name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {cmd.hsnCode || '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {cmd.defaultWeightUnit}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium capitalize">
                        {cmd.defaultRateType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {cmd.packagingType || 'Bulk'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(cmd);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                            title="Edit Commodity"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(cmd.id, cmd.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Commodity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIRECT IN-APP GEMINI AI CORRIDOR BENCHMARKER MODAL */}
      {isAiBenchmarkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-emerald-300 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-[#00E676] text-slate-950 shadow-xs border border-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950 tracking-tight">
                    Gemini AI Corridor Benchmarker
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Google Maps Grounded route distance, transit days & market rate guideline generator
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiBenchmarkerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Origin Hub / City <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai or Pune"
                    value={aiOrigin}
                    onChange={(e) => setAiOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Destination Hub / City <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad or Delhi"
                    value={aiDestination}
                    onChange={(e) => setAiDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Vehicle Type / Tonnage
                </label>
                <select
                  value={aiVehicleType}
                  onChange={(e) => setAiVehicleType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                >
                  <option value="Multi-Axle Commercial Truck (25 MT)">14 Wheeler Multi-Axle (25 MT)</option>
                  <option value="32 Ft MXL Container (18 MT)">32 Ft MXL Container (18 MT)</option>
                  <option value="40 Ft High-Bed Trailer (35 MT)">40 Ft Trailer (35 MT)</option>
                  <option value="20 Ft Taurus (16 MT)">20 Ft Taurus (16 MT)</option>
                </select>
              </div>

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Action trigger */}
              <button
                type="button"
                onClick={handleRunAiBenchmark}
                disabled={aiLoading}
                className="w-full py-2.5 px-4 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black text-xs sm:text-sm rounded-xl border border-emerald-400 flex items-center justify-center space-x-2 transition-all shadow-xs disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Analyzing Route via Google Maps & Gemini 2.5...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-slate-950" />
                    <span>Generate AI Corridor Distance & Rate Benchmark</span>
                  </>
                )}
              </button>

              {/* AI Result Card */}
              {aiResult && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Driving Distance</div>
                      <div className="text-base font-black text-slate-950 font-mono mt-0.5">{aiResult.distance} km</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Transit Time</div>
                      <div className="text-base font-black text-slate-950 font-mono mt-0.5">{aiResult.days} Days</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Benchmark Rate</div>
                      <div className="text-base font-black text-emerald-800 font-mono mt-0.5">₹{aiResult.estRate} / MT</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed max-h-36 overflow-y-auto">
                    {aiResult.report}
                  </div>

                  {aiResult.mapsLinks && aiResult.mapsLinks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-600">Maps Grounding:</span>
                      {aiResult.mapsLinks.map((link: any, idx: number) => (
                        <a
                          key={idx}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-800 font-semibold bg-sky-50 border border-sky-300 px-2 py-0.5 rounded flex items-center space-x-1 hover:underline"
                        >
                          <MapPin className="h-3 w-3 text-sky-600" />
                          <span>{link.title}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAiBenchmarkToRoutes}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-colors border border-emerald-400"
                  >
                    <Check className="h-4 w-4 text-[#00E676]" />
                    <span>Save This Corridor to Route Master (1-Click)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL FOR MASTER ITEMS */}
      {isModalOpen && (
        <MasterItemModal
          isOpen={isModalOpen}
          category={activeCategory}
          editingItem={editingItem}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={(itemData) => {
            const updated = { ...masters };
            if (activeCategory === 'parties') {
              if (editingItem) {
                updated.parties = updated.parties.map((p) => p.id === editingItem.id ? { ...p, ...itemData, updatedAt: new Date().toISOString() } : p);
              } else {
                updated.parties = [{ ...itemData, id: generateSafeId('pty'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...updated.parties];
              }
            } else if (activeCategory === 'vehicles') {
              if (editingItem) {
                updated.vehicles = updated.vehicles.map((v) => v.id === editingItem.id ? { ...v, ...itemData, updatedAt: new Date().toISOString() } : v);
              } else {
                updated.vehicles = [{ ...itemData, id: generateSafeId('veh'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...updated.vehicles];
              }
            } else if (activeCategory === 'transporters') {
              if (editingItem) {
                updated.transporters = updated.transporters.map((t) => t.id === editingItem.id ? { ...t, ...itemData, updatedAt: new Date().toISOString() } : t);
              } else {
                updated.transporters = [{ ...itemData, id: generateSafeId('trn'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...updated.transporters];
              }
            } else if (activeCategory === 'routes') {
              if (editingItem) {
                updated.routes = updated.routes.map((r) => r.id === editingItem.id ? { ...r, ...itemData, updatedAt: new Date().toISOString() } : r);
              } else {
                updated.routes = [{ ...itemData, id: generateSafeId('rt'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...updated.routes];
              }
            } else if (activeCategory === 'drivers') {
              if (editingItem) {
                updated.drivers = updated.drivers.map((d) => d.id === editingItem.id ? { ...d, ...itemData, updatedAt: new Date().toISOString() } : d);
              } else {
                updated.drivers = [{ ...itemData, id: generateSafeId('drv'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...updated.drivers];
              }
            } else if (activeCategory === 'commodities') {
              if (editingItem) {
                updated.commodities = updated.commodities.map((c) => c.id === editingItem.id ? { ...c, ...itemData, updatedAt: new Date().toISOString() } : c);
              } else {
                updated.commodities = [{ ...itemData, id: generateSafeId('cmd'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...updated.commodities];
              }
            }

            persistChanges(updated);
            showNotification(`${editingItem ? 'Updated' : 'Added'} ${activeCategory.slice(0, -1)} master record!`, 'success');
            setIsModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

// ================= DYNAMIC MODAL FOR ADDING / EDITING MASTERS =================

interface MasterItemModalProps {
  isOpen: boolean;
  category: MasterCategory;
  editingItem?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const MasterItemModal: React.FC<MasterItemModalProps> = ({
  isOpen,
  category,
  editingItem,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<any>(() => {
    if (editingItem) return { ...editingItem };
    if (category === 'parties') {
      return { name: '', type: 'Consignor', city: '', state: '', gstin: '', contactPerson: '', phone: '', email: '', defaultPaymentTerms: '30 Days Net' };
    }
    if (category === 'vehicles') {
      return { vehicleNumber: '', vehicleType: '14 Wheeler Multi-Axle (25 MT)', placement: 'Market', capacityMT: 25, transporterName: '', driverName: '', driverPhone: '', status: 'Active' };
    }
    if (category === 'transporters') {
      return { name: '', panNumber: '', gstin: '', contactPerson: '', phone: '', city: '', defaultCommission: 500, defaultAdvancePercent: 70, tdsDeclaration: true, status: 'Active' };
    }
    if (category === 'routes') {
      return { origin: '', destination: '', distanceKm: 500, transitDays: 2, primaryHighways: 'NH-48', benchmarkRatePerMT: 2400, standardCommission: 500, defaultAdvancePercent: 70 };
    }
    if (category === 'drivers') {
      return { name: '', phone: '', licenseNumber: '', licenseExpiry: '', associatedVehicle: '', emergencyContact: '', status: 'Active' };
    }
    return { name: '', hsnCode: '', defaultWeightUnit: 'MT', defaultRateType: 'per_mt', packagingType: 'Bulk / Palletized' };
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="bg-[#F8FAFC] border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">
            {editingItem ? 'Edit' : 'Add New'} {category.slice(0, -1).toUpperCase()} Master
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {category === 'parties' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Steel BSL Ltd"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role Type</label>
                  <select
                    value={formData.type || 'Consignor'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="Consignor">Consignor (Origin)</option>
                    <option value="Consignee">Consignee (Destination)</option>
                    <option value="Both">Both (Consignor & Consignee)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 20AAACT2727Q1ZS"
                    value={formData.gstin || ''}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jamshedpur"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jharkhand"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {category === 'vehicles' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH 12 RN 4589"
                    value={formData.vehicleNumber || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black uppercase text-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Placement Type *</label>
                  <select
                    value={formData.placement || 'Market'}
                    onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="Market">Market Vehicle</option>
                    <option value="Own">Own Fleet</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Type / Configuration</label>
                  <input
                    type="text"
                    placeholder="e.g. 14 Wheeler (25 MT)"
                    value={formData.vehicleType || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rated Capacity (MT) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.capacityMT || ''}
                    onChange={(e) => setFormData({ ...formData, capacityMT: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Transporter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Patel Roadways Logistics Ltd"
                  value={formData.transporterName || ''}
                  onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regular Driver Name</label>
                  <input
                    type="text"
                    value={formData.driverName || ''}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Phone</label>
                  <input
                    type="text"
                    value={formData.driverPhone || ''}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {category === 'transporters' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transporter / Broker Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patel Roadways Logistics Ltd"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="AAACP1234K"
                    value={formData.panNumber || ''}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operating City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Standard Broker Commission (₹)</label>
                  <input
                    type="number"
                    value={formData.defaultCommission || 500}
                    onChange={(e) => setFormData({ ...formData, defaultCommission: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Standard Driver Advance (%)</label>
                  <input
                    type="number"
                    value={formData.defaultAdvancePercent || 70}
                    onChange={(e) => setFormData({ ...formData, defaultAdvancePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>
            </>
          )}

          {category === 'routes' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Origin City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={formData.origin || ''}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmedabad"
                    value={formData.destination || ''}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Distance (km) *</label>
                  <input
                    type="number"
                    required
                    value={formData.distanceKm || ''}
                    onChange={(e) => setFormData({ ...formData, distanceKm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transit Days *</label>
                  <input
                    type="number"
                    required
                    value={formData.transitDays || ''}
                    onChange={(e) => setFormData({ ...formData, transitDays: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Benchmark Rate (₹/MT) *</label>
                  <input
                    type="number"
                    required
                    value={formData.benchmarkRatePerMT || ''}
                    onChange={(e) => setFormData({ ...formData, benchmarkRatePerMT: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-emerald-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Highway Corridor</label>
                <input
                  type="text"
                  placeholder="e.g. NH-48 / Western Express Highway"
                  value={formData.primaryHighways || ''}
                  onChange={(e) => setFormData({ ...formData, primaryHighways: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </>
          )}

          {category === 'drivers' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driving License Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber || ''}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Vehicle Number</label>
                <input
                  type="text"
                  value={formData.associatedVehicle || ''}
                  onChange={(e) => setFormData({ ...formData, associatedVehicle: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
            </>
          )}

          {category === 'commodities' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Commodity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steel Coils / TMT Bars"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    placeholder="7214"
                    value={formData.hsnCode || ''}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Weight Unit</label>
                  <select
                    value={formData.defaultWeightUnit || 'MT'}
                    onChange={(e) => setFormData({ ...formData, defaultWeightUnit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="MT">MT (Metric Ton)</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Quintal">Quintal</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl border border-emerald-400 shadow-xs"
            >
              {editingItem ? 'Save Changes' : 'Create Master Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
