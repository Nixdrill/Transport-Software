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
import { DispatchRecord } from '../types/dispatch';
import { 
  getMasters, 
  saveMasters, 
  resetMastersToDefaults,
  extractPanFromGstin,
  restoreMasters,
  batchSyncDispatchesToMasters
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
  ExternalLink,
  Landmark,
  CheckCircle2,
  FileJson,
  Layers,
  Copy,
  CheckCheck,
  CheckSquare,
  Square
} from 'lucide-react';

interface MastersViewProps {
  dispatches?: DispatchRecord[];
  onMastersUpdated?: (updated: AllMasters) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type MasterCategory = 'parties' | 'vehicles' | 'transporters' | 'routes' | 'drivers' | 'commodities';

export const MastersView: React.FC<MastersViewProps> = ({
  dispatches = [],
  onMastersUpdated,
  showNotification,
}) => {
  const [masters, setMasters] = useState<AllMasters>(() => getMasters());
  const [activeCategory, setActiveCategory] = useState<MasterCategory>('parties');
  const [searchQuery, setSearchQuery] = useState('');

  // Single & Multi-Selection for Master items
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Backup & Restore with Overwrite / Merge
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    masters: AllMasters;
    partiesCount: number;
    vehiclesCount: number;
    transportersCount: number;
    routesCount: number;
    driversCount: number;
    commoditiesCount: number;
    totalRecords: number;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [restoreError, setRestoreError] = useState<string | null>(null);

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
      version: '2.5',
      exportedAt: new Date().toISOString(),
      totalMasters: {
        parties: masters.parties.length,
        vehicles: masters.vehicles.length,
        transporters: masters.transporters.length,
        routes: masters.routes.length,
        drivers: masters.drivers.length,
        commodities: masters.commodities.length,
      },
      masters,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_Masters_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showNotification('Masters dataset exported to JSON backup file.', 'success');
  };

  // Import / Select backup file for Restore
  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const candidate: AllMasters = parsed.masters || parsed;

        if (!candidate || (!Array.isArray(candidate.parties) && !Array.isArray(candidate.vehicles))) {
          throw new Error('Selected file does not contain valid LogiTrack Master data.');
        }

        const validMasters: AllMasters = {
          parties: Array.isArray(candidate.parties) ? candidate.parties : [],
          vehicles: Array.isArray(candidate.vehicles) ? candidate.vehicles : [],
          transporters: Array.isArray(candidate.transporters) ? candidate.transporters : [],
          routes: Array.isArray(candidate.routes) ? candidate.routes : [],
          drivers: Array.isArray(candidate.drivers) ? candidate.drivers : [],
          commodities: Array.isArray(candidate.commodities) ? candidate.commodities : [],
          lastUpdated: candidate.lastUpdated || new Date().toISOString(),
        };

        const totalRecords =
          validMasters.parties.length +
          validMasters.vehicles.length +
          validMasters.transporters.length +
          validMasters.routes.length +
          validMasters.drivers.length +
          validMasters.commodities.length;

        if (totalRecords === 0) {
          throw new Error('Backup file contains 0 master records.');
        }

        setRestorePreview({
          masters: validMasters,
          partiesCount: validMasters.parties.length,
          vehiclesCount: validMasters.vehicles.length,
          transportersCount: validMasters.transporters.length,
          routesCount: validMasters.routes.length,
          driversCount: validMasters.drivers.length,
          commoditiesCount: validMasters.commodities.length,
          totalRecords,
        });
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        showNotification(err?.message || 'Failed to read Masters backup JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Masters Restore via Overwrite or Merge
  const handleExecuteMastersRestore = () => {
    if (!restorePreview) return;
    try {
      const restored = restoreMasters(restorePreview.masters, restoreMode);
      persistChanges(restored);
      setIsRestoreModalOpen(false);
      setRestorePreview(null);
      showNotification(
        `Successfully restored ${restorePreview.totalRecords} master items via ${
          restoreMode === 'overwrite' ? 'complete overwrite & replacement' : 'safe merge'
        }!`,
        'success'
      );
    } catch (err: any) {
      setRestoreError(err?.message || 'Restore failed.');
    }
  };

  // Auto-sync / scan all dispatches into Masters
  const handleAutoSyncFromDispatches = () => {
    if (!dispatches || dispatches.length === 0) {
      showNotification('No dispatches currently available to sync into Masters.', 'info');
      return;
    }
    const result = batchSyncDispatchesToMasters(dispatches);
    if (result.totalAdded > 0) {
      const refreshed = getMasters();
      persistChanges(refreshed);
      showNotification(
        `Auto-stored ${result.totalAdded} new entries in Masters! (${result.addedParties} Parties, ${result.addedVehicles} Vehicles, ${result.addedTransporters} Transporters, ${result.addedRoutes} Corridors)`,
        'success'
      );
    } else {
      showNotification('All parties, vehicles, transporters, and routes from dispatches are already up to date in Masters!', 'info');
    }
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
        p.state.toLowerCase().includes(q) ||
        (p.pincode && p.pincode.includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)) ||
        (p.panNumber && p.panNumber.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.bankName && p.bankName.toLowerCase().includes(q)) ||
        (p.bankAccountNumber && p.bankAccountNumber.includes(q))
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

  // Active Category Items & Selection Logic
  const currentVisibleItems = useMemo(() => {
    switch (activeCategory) {
      case 'parties': return filteredParties;
      case 'vehicles': return filteredVehicles;
      case 'transporters': return filteredTransporters;
      case 'routes': return filteredRoutes;
      case 'drivers': return filteredDrivers;
      case 'commodities': return filteredCommodities;
      default: return [];
    }
  }, [activeCategory, filteredParties, filteredVehicles, filteredTransporters, filteredRoutes, filteredDrivers, filteredCommodities]);

  const currentAllCategoryItems = useMemo(() => {
    return masters[activeCategory] || [];
  }, [masters, activeCategory]);

  const isAllVisibleSelected = currentVisibleItems.length > 0 && currentVisibleItems.every((item) => selectedMasterIds.includes(item.id));
  const isSomeVisibleSelected = currentVisibleItems.some((item) => selectedMasterIds.includes(item.id));

  const handleToggleSelectMaster = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMasterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = currentVisibleItems.map((i) => i.id);
    setSelectedMasterIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...visibleIds]));
      }
    });
  };

  const handleSelectAllCategory = () => {
    setSelectedMasterIds(currentAllCategoryItems.map((i) => i.id));
  };

  const handleClearSelection = () => {
    setSelectedMasterIds([]);
  };

  const handleInvertSelection = () => {
    const visibleIds = currentVisibleItems.map((i) => i.id);
    setSelectedMasterIds((prev) => {
      const remaining = prev.filter((id) => !visibleIds.includes(id));
      const newlySelected = visibleIds.filter((id) => !prev.includes(id));
      return [...remaining, ...newlySelected];
    });
  };

  const handleBatchDeleteMasters = () => {
    if (selectedMasterIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${selectedMasterIds.length} selected items from ${activeCategory}?`)) return;

    const updated = { ...masters };
    const idSet = new Set(selectedMasterIds);

    if (activeCategory === 'parties') {
      updated.parties = updated.parties.filter((p) => !idSet.has(p.id));
    } else if (activeCategory === 'vehicles') {
      updated.vehicles = updated.vehicles.filter((v) => !idSet.has(v.id));
    } else if (activeCategory === 'transporters') {
      updated.transporters = updated.transporters.filter((t) => !idSet.has(t.id));
    } else if (activeCategory === 'routes') {
      updated.routes = updated.routes.filter((r) => !idSet.has(r.id));
    } else if (activeCategory === 'drivers') {
      updated.drivers = updated.drivers.filter((d) => !idSet.has(d.id));
    } else if (activeCategory === 'commodities') {
      updated.commodities = updated.commodities.filter((c) => !idSet.has(c.id));
    }

    persistChanges(updated);
    const count = selectedMasterIds.length;
    setSelectedMasterIds([]);
    showNotification(`Deleted ${count} items from ${activeCategory} master.`, 'info');
  };

  const handleBatchExportMastersJSON = () => {
    if (selectedMasterIds.length === 0) return;
    const idSet = new Set(selectedMasterIds);
    const selectedItems = currentAllCategoryItems.filter((i) => idSet.has(i.id));

    const payload = {
      app: 'LogiTrack Transport Masters',
      category: activeCategory,
      count: selectedItems.length,
      exportedAt: new Date().toISOString(),
      items: selectedItems,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_${activeCategory}_Selected_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showNotification(`Exported ${selectedItems.length} selected ${activeCategory} to JSON.`, 'success');
  };

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
          {/* Auto-Sync from Dispatches */}
          <button
            type="button"
            onClick={handleAutoSyncFromDispatches}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-xs flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            title="Scan all dispatches and auto-store new parties, vehicles, transporters, and routes into Masters"
          >
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span>Auto-Sync from Dispatches</span>
          </button>

          {/* Gemini AI Corridor Benchmarker Trigger */}
          <button
            type="button"
            onClick={() => setIsAiBenchmarkerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 text-slate-900 border border-emerald-400 font-black text-xs flex items-center space-x-1.5 shadow-xs hover:bg-emerald-50 transition-all cursor-pointer"
            title="Generate Corridors and Rate Benchmarks with Gemini AI & Google Maps"
          >
            <Route className="h-4 w-4 text-emerald-700" />
            <span>AI Corridor Benchmarker</span>
          </button>

          {/* Export JSON Backup */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
            title="Export Masters to JSON Backup"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Backup</span>
          </button>

          {/* Restore with Overwrite / Merge */}
          <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer" title="Restore Masters dataset with Overwrite or Merge mode">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restore (Overwrite / Merge)</span>
            <input type="file" accept=".json" onChange={handleFileSelectForRestore} className="hidden" />
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
              onClick={() => { setActiveCategory('parties'); setSearchQuery(''); setSelectedMasterIds([]); }}
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
              onClick={() => { setActiveCategory('vehicles'); setSearchQuery(''); setSelectedMasterIds([]); }}
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
              onClick={() => { setActiveCategory('transporters'); setSearchQuery(''); setSelectedMasterIds([]); }}
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
              onClick={() => { setActiveCategory('routes'); setSearchQuery(''); setSelectedMasterIds([]); }}
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
              onClick={() => { setActiveCategory('drivers'); setSearchQuery(''); setSelectedMasterIds([]); }}
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
              onClick={() => { setActiveCategory('commodities'); setSearchQuery(''); setSelectedMasterIds([]); }}
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

      {/* SELECTION ACTION BAR & STATS STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1 font-medium">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          {/* Main Select All Filtered Checkbox */}
          {currentVisibleItems.length > 0 && (
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-xs">
              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                  }}
                  onChange={handleSelectAllVisible}
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-slate-900 text-xs">
                  {isAllVisibleSelected ? 'Deselect All' : `Select All Visible (${currentVisibleItems.length})`}
                </span>
              </label>
            </div>
          )}

          <div>
            Showing <span className="text-slate-950 font-black">{currentVisibleItems.length}</span> of{' '}
            <span className="text-slate-950 font-black">{currentAllCategoryItems.length}</span> {activeCategory}
            {searchQuery && (
              <span className="text-emerald-700 font-bold ml-1.5">(Filtered)</span>
            )}
          </div>
        </div>

        {/* Multi-Selection Fast Action Buttons */}
        {currentVisibleItems.length > 0 && (
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                isAllVisibleSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <CheckCheck className="h-3 w-3" />
              <span>{isAllVisibleSelected ? 'Deselect Visible' : `Select All Visible (${currentVisibleItems.length})`}</span>
            </button>

            {currentAllCategoryItems.length > currentVisibleItems.length && (
              <button
                type="button"
                onClick={handleSelectAllCategory}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold transition-colors"
              >
                Select All {currentAllCategoryItems.length}
              </button>
            )}

            {selectedMasterIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[11px] font-medium"
                >
                  Invert
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold"
                >
                  Clear ({selectedMasterIds.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* FLOATING / STICKY BATCH ACTIONS BAR (when master items are selected) */}
      {selectedMasterIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-slate-950 text-white rounded-2xl p-3 sm:p-4 shadow-xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-3 duration-150">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Selection Stats */}
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-[#00E676] flex items-center justify-center font-mono font-black text-sm border border-emerald-500/40">
                {selectedMasterIds.length}
              </div>
              <div>
                <div className="font-black text-white text-xs flex items-center space-x-1.5">
                  <span>{selectedMasterIds.length} {activeCategory} Selected</span>
                  <span>•</span>
                  <span className="text-emerald-400 capitalize">{activeCategory} Master</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Perform batch actions or export selected master items
                </div>
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
              {/* Batch Export Selected to JSON */}
              <button
                type="button"
                onClick={handleBatchExportMastersJSON}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors"
                title="Export selected master records to JSON"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export Selected ({selectedMasterIds.length})</span>
              </button>

              {/* Batch Delete */}
              <button
                type="button"
                onClick={handleBatchDeleteMasters}
                className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-rose-500/40 transition-colors"
                title="Delete Selected Masters"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedMasterIds.length})</span>
              </button>

              {/* Clear Selection */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Deselect All"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER LIST TABLE / CARDS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* CATEGORY 1: PARTIES */}
        {activeCategory === 'parties' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[180px]">Party Name & Role</th>
                  <th className="py-3 px-4 min-w-[160px]">GSTIN & PAN Details</th>
                  <th className="py-3 px-4 min-w-[220px]">Facility / Billing Address (Wrap Text)</th>
                  <th className="py-3 px-4 min-w-[140px]">City, State & PIN</th>
                  <th className="py-3 px-4 min-w-[180px]">Bank Account (Optional)</th>
                  <th className="py-3 px-4 min-w-[140px]">Contact Person</th>
                  <th className="py-3 px-4 min-w-[110px]">Payment Terms</th>
                  <th className="py-3 px-4 text-right min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                      No parties match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((pty) => {
                    const derivedPan = extractPanFromGstin(pty.gstin);
                    const effectivePan = pty.panNumber || derivedPan;
                    const isAutoPan = derivedPan && effectivePan === derivedPan;
                    const isSelected = selectedMasterIds.includes(pty.id);

                    return (
                      <tr 
                        key={pty.id} 
                        className={`transition-colors align-top ${
                          isSelected ? 'bg-emerald-50/60 hover:bg-emerald-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectMaster(pty.id, e as any)}
                            className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Party Name & Role with Logo */}
                        <td className="py-3 px-4">
                          <div className="flex items-start space-x-3">
                            {/* Logo Thumbnail or Avatar Badge */}
                            <div className="flex-shrink-0 mt-0.5">
                              {pty.logoUrl ? (
                                <img
                                  src={pty.logoUrl}
                                  alt={`${pty.name} Logo`}
                                  className="h-10 w-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs"
                                />
                              ) : (
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                  pty.type === 'Billing Party (Issuer)'
                                    ? 'bg-emerald-500/20 text-emerald-950 border-emerald-400'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  <Building2 className="h-5 w-5 text-slate-500" />
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="font-black text-slate-950 text-sm leading-tight">
                                {pty.name}
                              </div>
                              {pty.tagline && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5 font-medium line-clamp-1 max-w-xs">
                                  {pty.tagline}
                                </div>
                              )}
                              <div className="mt-1 flex items-center space-x-1 flex-wrap gap-y-1">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                                  pty.type === 'Billing Party (Issuer)'
                                    ? 'bg-[#00E676] text-slate-950 border border-emerald-400 font-black shadow-2xs'
                                    : pty.type === 'Consignor'
                                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                    : pty.type === 'Consignee'
                                    ? 'bg-sky-100 text-sky-950 border border-sky-300'
                                    : 'bg-purple-100 text-purple-950 border border-purple-300'
                                }`}>
                                  {pty.type === 'Billing Party (Issuer)' ? '★ Billing Party (Issuer)' : pty.type}
                                </span>
                                {pty.cinNumber && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[9px] font-semibold border border-slate-200">
                                    CIN: {pty.cinNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* GSTIN & PAN Details with Auto-Fetch */}
                        <td className="py-3 px-4 font-mono">
                          <div className="space-y-1">
                            {pty.gstin ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[9px] uppercase font-sans font-bold text-slate-400">GST:</span>
                                <span className="font-bold text-slate-900 text-xs tracking-tight">
                                  {pty.gstin}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-sans italic text-[11px]">No GSTIN</span>
                            )}

                            {effectivePan && (
                              <div className="flex items-center space-x-1.5 pt-0.5">
                                <span className="text-[9px] uppercase font-sans font-bold text-emerald-700">PAN:</span>
                                <span className="font-bold text-emerald-950 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                                  {effectivePan}
                                </span>
                                {isAutoPan && (
                                  <span className="text-[9px] font-sans font-black bg-emerald-100 text-emerald-800 px-1 rounded" title="Auto-extracted from GSTIN digits 3 to 12">
                                    ⚡ Auto
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Address with Wrap Text */}
                        <td className="py-3 px-4 max-w-xs">
                          {pty.address ? (
                            <div className="text-[11px] text-slate-700 font-medium whitespace-normal break-words leading-relaxed bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/70">
                              {pty.address}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No address specified</span>
                          )}
                        </td>

                        {/* City, State & PIN */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {pty.city}, {pty.state}
                          </div>
                          {pty.pincode && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              PIN: {pty.pincode}
                            </div>
                          )}
                        </td>

                        {/* Bank Account Details (Optional) */}
                        <td className="py-3 px-4">
                          {pty.bankAccountNumber ? (
                            <div className="space-y-1 bg-slate-50/80 p-2 rounded-xl border border-slate-200/70">
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5 text-[11px]">
                                <Landmark className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                <span className="truncate">{pty.bankName || 'Bank Account'}</span>
                              </div>
                              <div className="font-mono text-[11px] text-slate-700">
                                A/C: <span className="font-black text-slate-950">{pty.bankAccountNumber}</span>
                              </div>
                              <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-600">
                                {pty.bankIfsc && (
                                  <span className="bg-slate-200/80 text-slate-800 px-1 rounded font-bold">
                                    {pty.bankIfsc}
                                  </span>
                                )}
                                {pty.bankBranch && (
                                  <span className="truncate text-[10px] text-slate-500 font-sans">
                                    • {pty.bankBranch}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Optional / Not added</span>
                          )}
                        </td>

                        {/* Contact Person & Phone */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{pty.contactPerson || '-'}</div>
                          <div className="text-slate-500 font-mono text-[11px] mt-0.5">{pty.phone || '-'}</div>
                          {pty.email && (
                            <div className="text-slate-400 text-[10px] truncate max-w-[120px]">{pty.email}</div>
                          )}
                        </td>

                        {/* Payment Terms */}
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            {pty.defaultPaymentTerms || 'Standard'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setEditingItem(pty);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                              title="Edit Party Details"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(pty.id, pty.name)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Party"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                      No vehicles match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((veh) => {
                    const isSelected = selectedMasterIds.includes(veh.id);

                    return (
                      <tr 
                        key={veh.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-amber-50/60 hover:bg-amber-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectMaster(veh.id, e as any)}
                            className="h-4 w-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
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
                    );
                  })
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                      No transporters match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredTransporters.map((trn) => {
                    const isSelected = selectedMasterIds.includes(trn.id);

                    return (
                      <tr 
                        key={trn.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-indigo-50/60 hover:bg-indigo-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectMaster(trn.id, e as any)}
                            className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
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
                    );
                  })
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                      No corridors match your search query. Try the "AI Corridor Benchmarker" button above!
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((rt) => {
                    const isSelected = selectedMasterIds.includes(rt.id);

                    return (
                      <tr 
                        key={rt.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-sky-50/60 hover:bg-sky-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectMaster(rt.id, e as any)}
                            className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>
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
                    );
                  })
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                      No drivers match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((drv) => {
                    const isSelected = selectedMasterIds.includes(drv.id);

                    return (
                      <tr 
                        key={drv.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/60 hover:bg-teal-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectMaster(drv.id, e as any)}
                            className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
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
                    );
                  })
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No commodities match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredCommodities.map((cmd) => {
                    const isSelected = selectedMasterIds.includes(cmd.id);

                    return (
                      <tr 
                        key={cmd.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-rose-50/60 hover:bg-rose-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectMaster(cmd.id, e as any)}
                            className="h-4 w-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>
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
                    );
                  })
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

      {/* RESTORE & BACKUP MASTERS MODAL (OVERWRITE & MERGE MODES) */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-black tracking-tight">
                  Restore Masters Database
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRestorePreview(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {restorePreview && (
                <>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-950 text-sm flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Backup File Validated</span>
                      </span>
                      <span className="font-mono text-emerald-800 font-black text-xs">
                        {restorePreview.totalRecords} Total Records
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Parties</span>
                        <span className="font-bold text-slate-900">{restorePreview.partiesCount}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Vehicles</span>
                        <span className="font-bold text-slate-900">{restorePreview.vehiclesCount}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Transporters</span>
                        <span className="font-bold text-slate-900">{restorePreview.transportersCount}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Corridors</span>
                        <span className="font-bold text-slate-900">{restorePreview.routesCount}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Drivers</span>
                        <span className="font-bold text-slate-900">{restorePreview.driversCount}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Commodities</span>
                        <span className="font-bold text-slate-900">{restorePreview.commoditiesCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-900 text-xs">
                      Select Restore & Ingestion Mode:
                    </label>

                    {/* OVERWRITE MODE */}
                    <div
                      onClick={() => setRestoreMode('overwrite')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        restoreMode === 'overwrite'
                          ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="restore_mode"
                            checked={restoreMode === 'overwrite'}
                            onChange={() => setRestoreMode('overwrite')}
                            className="text-rose-600 focus:ring-rose-500 h-4 w-4"
                          />
                          <strong className="text-slate-950 font-black text-xs">
                            ⚡ Overwrite Existing Masters (Full Replace)
                          </strong>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                          Overwrite
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium pl-6 mt-1">
                        Completely erases current Master records and replaces them 100% with the backup file data.
                      </p>
                    </div>

                    {/* MERGE MODE */}
                    <div
                      onClick={() => setRestoreMode('merge')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        restoreMode === 'merge'
                          ? 'border-[#00E676] bg-emerald-50/80 ring-2 ring-emerald-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="restore_mode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-emerald-600 focus:ring-[#00E676] h-4 w-4"
                          />
                          <strong className="text-slate-950 font-black text-xs">
                            Merge & Update Existing Masters
                          </strong>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                          Safe Merge
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium pl-6 mt-1">
                        Preserves current records, updates any existing matching parties or vehicles, and appends new records.
                      </p>
                    </div>
                  </div>

                  {restoreError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRestoreModalOpen(false);
                        setRestorePreview(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteMastersRestore}
                      className={`px-5 py-2 rounded-xl font-black text-xs sm:text-sm shadow-xs border transition-all ${
                        restoreMode === 'overwrite'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                          : 'bg-[#00E676] hover:bg-[#00c864] text-slate-950 border-emerald-400'
                      }`}
                    >
                      {restoreMode === 'overwrite' ? 'Proceed with Overwrite' : 'Proceed with Merge'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
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
      return { 
        name: '', 
        type: 'Consignor', 
        city: '', 
        state: '', 
        pincode: '',
        gstin: '', 
        panNumber: '',
        address: '', 
        contactPerson: '', 
        phone: '', 
        email: '', 
        defaultPaymentTerms: '30 Days Net',
        bankName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankBranch: '',
        accountHolderName: ''
      };
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
              {/* Company Name & Role Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role Type</label>
                  <select
                    value={formData.type || 'Consignor'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        isBillingParty: newType === 'Billing Party (Issuer)'
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#00E676]"
                  >
                    <option value="Consignor">Consignor (Origin)</option>
                    <option value="Consignee">Consignee (Destination)</option>
                    <option value="Both">Both (Consignor & Consignee)</option>
                    <option value="Billing Party (Issuer)">★ Billing Party (Issuer / Billing From)</option>
                  </select>
                </div>
              </div>

              {/* Logo Upload & Branding Block */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Company Logo & Branding (Auto-used in Invoices & Bills)</span>
                  </span>
                  {formData.type === 'Billing Party (Issuer)' && (
                    <span className="px-2 py-0.5 rounded bg-[#00E676]/20 text-emerald-950 font-black text-[10px] border border-emerald-400">
                      BILLING FROM ENTITY
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {formData.logoUrl ? (
                      <div className="relative group">
                        <img
                          src={formData.logoUrl}
                          alt="Party Logo Preview"
                          className="h-16 w-16 object-contain rounded-xl border border-slate-300 bg-white p-1 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '' })}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-xs transition-colors"
                          title="Remove Logo"
                        >
                          <X className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="h-6 w-6 text-slate-300" />
                        <span className="text-[8px] font-bold mt-0.5">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Trigger & URL */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors">
                        <Upload className="h-3.5 w-3.5 text-[#00E676]" />
                        <span>Upload Logo File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              if (dataUrl) setFormData({ ...formData, logoUrl: dataUrl });
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">PNG, JPG, WebP or SVG</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste direct image URL (https://...)"
                      value={formData.logoUrl || ''}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Company Tagline & CIN Registration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Company Tagline / Subtitle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Premier Surface Transport & Pan-India Fleet Logistics"
                      value={formData.tagline || ''}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      CIN / MSME Udyam Reg. No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. U60231PN2021PTC199882 / UDYAM-MH-26..."
                      value={formData.cinNumber || ''}
                      onChange={(e) => setFormData({ ...formData, cinNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Website & UPI ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. www.logitrackfreight.in"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      UPI ID for Scan-to-Pay QR (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. logitrack@hdfcbank"
                      value={formData.upiId || ''}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-emerald-800 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Identifiers: GSTIN with instant PAN Auto-fetch */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">Tax Identifiers & Compliance</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Auto-Fetch Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GSTIN (15 Digits)</label>
                    <input
                      type="text"
                      placeholder="e.g. 20AAACT2727Q1ZS"
                      value={formData.gstin || ''}
                      onChange={(e) => {
                        const gstinVal = e.target.value.toUpperCase();
                        const autoPan = extractPanFromGstin(gstinVal);
                        setFormData((prev: any) => ({
                          ...prev,
                          gstin: gstinVal,
                          panNumber: autoPan || prev.panNumber,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase font-bold text-slate-950 focus:ring-2 focus:ring-[#00E676]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">PAN Number (10 Digits)</label>
                      {formData.gstin && (
                        <button
                          type="button"
                          onClick={() => {
                            const derived = extractPanFromGstin(formData.gstin);
                            if (derived) {
                              setFormData({ ...formData, panNumber: derived });
                            }
                          }}
                          className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          ⚡ Auto-Fetch
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. AAACT2727Q"
                      value={formData.panNumber || ''}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase font-bold text-emerald-950 focus:ring-2 focus:ring-[#00E676]"
                    />
                  </div>
                </div>

                {formData.gstin && extractPanFromGstin(formData.gstin) === formData.panNumber && formData.panNumber && (
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>PAN verified and auto-extracted from digits 3-12 of GSTIN.</span>
                  </p>
                )}
              </div>

              {/* Address with Wrap Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Facility / Billing Address (Wrap Text)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Auto-wraps in table & printouts
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Enter full factory / warehouse address, industrial area, gate or plot number..."
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-normal whitespace-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] resize-y"
                />
              </div>

              {/* Location: City, State, Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 831001"
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Contact Person & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98321..."
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 Days Net"
                    value={formData.defaultPaymentTerms || ''}
                    onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Bank Account Details (Optional) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-xs">
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  <span>Bank Account Details (Optional for direct RTGS/NEFT settlement)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India, HDFC"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 38192019284"
                      value={formData.bankAccountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001827"
                      value={formData.bankIfsc || ''}
                      onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Bistupur Branch"
                      value={formData.bankBranch || ''}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">A/C Holder Name</label>
                    <input
                      type="text"
                      placeholder={formData.name || 'Account Beneficiary'}
                      value={formData.accountHolderName || ''}
                      onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
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
