import React, { useState, useRef, useEffect } from 'react';
import { DispatchRecord } from '../types/dispatch';
import { AllMasters } from '../types/masters';
import { AVAILABLE_THEMES } from '../lib/theme';
import { formatCurrency } from '../lib/calculations';
import { exportToExcel, downloadExcelTemplate } from '../lib/excelService';
import { ExcelImportModal } from './ExcelImportModal';
import { 
  getMasters, 
  saveMasters, 
  clearAllMasters, 
  clearMasterCategory, 
  resetMastersToDefaults 
} from '../lib/mastersService';
import { 
  Download, 
  Upload, 
  Trash2, 
  Palette, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Database,
  FileJson,
  FileSpreadsheet,
  ShieldAlert,
  Sparkles,
  Layers,
  Users,
  Truck,
  Building2,
  Navigation,
  UserCheck,
  Package,
  RefreshCw,
  X
} from 'lucide-react';

interface SettingsViewProps {
  records: DispatchRecord[];
  activeTheme: string;
  onThemeChange: (themeId: string) => void;
  onBackupData: () => void;
  onBackupMastersOnly?: () => void;
  onRestoreData: (records: DispatchRecord[], mode: 'replace' | 'merge', masters?: AllMasters) => void;
  onDeleteAllData: () => Promise<void>;
  onClearMastersData?: () => void;
  onResetMastersData?: () => void;
  onDeleteAllWithMasters?: () => Promise<void>;
  onResetSampleData: () => void;
  onClearLocalCache: () => void;
  onImportExcel?: (dispatches: DispatchRecord[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  records,
  activeTheme,
  onThemeChange,
  onBackupData,
  onBackupMastersOnly,
  onRestoreData,
  onDeleteAllData,
  onClearMastersData,
  onResetMastersData,
  onDeleteAllWithMasters,
  onResetSampleData,
  onClearLocalCache,
  onImportExcel,
}) => {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Live Masters State for Settings
  const [currentMasters, setCurrentMasters] = useState<AllMasters>(() => getMasters());

  const refreshMastersState = () => {
    setCurrentMasters(getMasters());
  };

  useEffect(() => {
    refreshMastersState();
  }, []);

  // Restore file handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    records: DispatchRecord[];
    count: number;
    lrCount: number;
    totalFreight: number;
    masters?: AllMasters;
    mastersCount?: number;
    partiesCount?: number;
    vehiclesCount?: number;
    transportersCount?: number;
    routesCount?: number;
    driversCount?: number;
    commoditiesCount?: number;
  } | null>(null);

  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreScope, setRestoreScope] = useState<'all' | 'dispatches_only' | 'masters_only'>('all');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalType, setDeleteModalType] = useState<
    'dispatches_only' | 'masters_all' | 'category' | 'total_wipe' | null
  >(null);
  const [targetCategoryToDelete, setTargetCategoryToDelete] = useState<
    'parties' | 'vehicles' | 'transporters' | 'routes' | 'drivers' | 'commodities' | null
  >(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle file select for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setRestoreError('Please select a valid .json backup file.');
      return;
    }

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Accept array of dispatches directly or { dispatches: [...] } or { masters: {...} }
        const dataList: DispatchRecord[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.dispatches)
          ? parsed.dispatches
          : [];

        // Check if masters are present at root or within masters property
        let parsedMasters: AllMasters | undefined = undefined;
        if (parsed.masters && typeof parsed.masters === 'object') {
          parsedMasters = parsed.masters;
        } else if (parsed.parties && Array.isArray(parsed.parties)) {
          parsedMasters = parsed as AllMasters;
        }

        let mastersCount = 0;
        let partiesCount = 0;
        let vehiclesCount = 0;
        let transportersCount = 0;
        let routesCount = 0;
        let driversCount = 0;
        let commoditiesCount = 0;

        if (parsedMasters) {
          partiesCount = parsedMasters.parties?.length || 0;
          vehiclesCount = parsedMasters.vehicles?.length || 0;
          transportersCount = parsedMasters.transporters?.length || 0;
          routesCount = parsedMasters.routes?.length || 0;
          driversCount = parsedMasters.drivers?.length || 0;
          commoditiesCount = parsedMasters.commodities?.length || 0;
          mastersCount = partiesCount + vehiclesCount + transportersCount + routesCount + driversCount + commoditiesCount;
        }

        if (dataList.length === 0 && mastersCount === 0) {
          throw new Error('No valid dispatch records or master records found in this backup file.');
        }

        // Validate basic structure
        const validRecords = dataList.filter((r) => r.id && r.vehicleNumber && r.date);
        const lrCount = validRecords.reduce((s, r) => s + (r.lrs?.length || r.totalLrsCount || 0), 0);
        const totalFreight = validRecords.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);

        setRestorePreview({
          records: validRecords,
          count: validRecords.length,
          lrCount,
          totalFreight,
          masters: parsedMasters,
          mastersCount,
          partiesCount,
          vehiclesCount,
          transportersCount,
          routesCount,
          driversCount,
          commoditiesCount,
        });

        // Set default scope
        if (validRecords.length > 0 && mastersCount > 0) {
          setRestoreScope('all');
        } else if (validRecords.length > 0) {
          setRestoreScope('dispatches_only');
        } else {
          setRestoreScope('masters_only');
        }
      } catch (err: any) {
        setRestoreError(err?.message || 'Failed to read or parse the JSON file.');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Perform Restore
  const handleExecuteRestore = () => {
    if (!restorePreview) return;
    try {
      const recordsToRestore = restoreScope === 'masters_only' ? [] : restorePreview.records;
      const mastersToRestore = restoreScope === 'dispatches_only' ? undefined : restorePreview.masters;

      onRestoreData(recordsToRestore, restoreMode, mastersToRestore);
      refreshMastersState();

      let summaryText = '';
      if (restoreScope === 'all') {
        summaryText = `${restorePreview.count} dispatches (${restorePreview.lrCount} LRs) and ${restorePreview.mastersCount || 0} master records`;
      } else if (restoreScope === 'dispatches_only') {
        summaryText = `${restorePreview.count} dispatch records (${restorePreview.lrCount} LRs)`;
      } else {
        summaryText = `${restorePreview.mastersCount || 0} master records`;
      }

      setRestoreSuccess(
        `Successfully restored ${summaryText} via ${
          restoreMode === 'replace' ? 'database replacement (overwrite)' : 'database merge'
        }!`
      );
      setRestorePreview(null);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setRestoreError(err?.message || 'Error occurred while restoring database records.');
    }
  };

  // Master Deletion Handlers
  const handleClearAllMasters = () => {
    if (onClearMastersData) {
      onClearMastersData();
    } else {
      clearAllMasters();
    }
    refreshMastersState();
    setDeleteModalType(null);
    setConfirmDeleteText('');
  };

  const handleClearSpecificCategory = (cat: 'parties' | 'vehicles' | 'transporters' | 'routes' | 'drivers' | 'commodities') => {
    clearMasterCategory(cat);
    refreshMastersState();
    setDeleteModalType(null);
    setTargetCategoryToDelete(null);
    setConfirmDeleteText('');
  };

  const handleResetMasters = () => {
    if (onResetMastersData) {
      onResetMastersData();
    } else {
      resetMastersToDefaults();
    }
    refreshMastersState();
    setRestoreSuccess('Master records restored to default Indian Logistics dataset.');
  };

  // Perform Total Delete
  const handleExecuteDelete = async () => {
    if (confirmDeleteText.trim() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      if (deleteModalType === 'dispatches_only') {
        await onDeleteAllData();
      } else if (deleteModalType === 'masters_all') {
        handleClearAllMasters();
      } else if (deleteModalType === 'category' && targetCategoryToDelete) {
        handleClearSpecificCategory(targetCategoryToDelete);
      } else if (deleteModalType === 'total_wipe') {
        if (onDeleteAllWithMasters) {
          await onDeleteAllWithMasters();
        } else {
          await onDeleteAllData();
          clearAllMasters();
        }
        refreshMastersState();
      }
      setDeleteModalType(null);
      setConfirmDeleteText('');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalLrs = records.reduce((s, r) => s + (r.lrs?.length || r.totalLrsCount || 0), 0);
  const totalFreight = records.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);

  const totalMasterItems = 
    currentMasters.parties.length +
    currentMasters.vehicles.length +
    currentMasters.transporters.length +
    currentMasters.routes.length +
    currentMasters.drivers.length +
    currentMasters.commodities.length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center space-x-2">
          <span className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
            <Database className="h-5 w-5" />
          </span>
          <span>System Settings & Data Management</span>
        </h2>
        <p className="text-xs text-slate-600 font-medium mt-1">
          Manage system theme, create full database JSON backups, restore historical records with overwrite/merge modes, and control Masters directory storage.
        </p>
      </div>

      {/* SECTION 1: THEME CUSTOMIZATION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-amber-100 text-amber-900">
              <Palette className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              1. Theme Customization ({AVAILABLE_THEMES.length} Available Themes)
            </h3>
          </div>
          <span className="text-xs text-slate-600 font-medium">
            Active: <strong className="text-slate-950 font-black">{AVAILABLE_THEMES.find(t => t.id === activeTheme)?.name}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Choose a visual theme optimized for dispatch desks, logistics control towers, or daylight docks. Changes are saved automatically.
        </p>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {AVAILABLE_THEMES.map((theme) => {
            const isSelected = activeTheme === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 group ${
                  isSelected
                    ? 'border-[#00E676] bg-emerald-50/40 shadow-xs scale-[1.02]'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                {/* Top: Name & Checkmark */}
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="font-black text-xs text-slate-950 block group-hover:text-emerald-800 transition-colors">
                      {theme.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      {theme.category} Mode
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-[#00E676] text-slate-950 flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Color Palette Preview Swatch */}
                <div className="flex space-x-1.5 p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  {theme.previewColors.map((color, idx) => (
                    <div
                      key={idx}
                      style={{ backgroundColor: color }}
                      className="flex-1 h-5 rounded border border-slate-300"
                    />
                  ))}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                  {theme.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: MASTERS DATA CENTER & DELETION CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-indigo-100 text-indigo-900">
              <Layers className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              2. Masters Directory & Deletion Controls
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={refreshMastersState}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Refresh Master counts"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
            <span className="text-xs bg-indigo-50 text-indigo-900 font-black px-2.5 py-1 rounded-lg border border-indigo-200">
              {totalMasterItems} Total Masters
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Manage, clear, reset, or export Master data entities including Parties (GSTIN/PAN/Address/Bank), Fleet Vehicles, Transporters, Corridors, Drivers, and Commodities.
        </p>

        {/* Master Categories Live Breakdown Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
          {/* Parties */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="font-mono font-black text-slate-950 text-sm">{currentMasters.parties.length}</span>
              </div>
              <span className="text-slate-600 font-bold block text-[11px] mt-1">Parties</span>
            </div>
            <button
              type="button"
              disabled={currentMasters.parties.length === 0}
              onClick={() => {
                setTargetCategoryToDelete('parties');
                setDeleteModalType('category');
              }}
              className="mt-2 text-[10px] text-rose-700 font-bold hover:underline opacity-80 group-hover:opacity-100 disabled:opacity-30 text-left"
            >
              Clear Parties
            </button>
          </div>

          {/* Vehicles */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span className="font-mono font-black text-slate-950 text-sm">{currentMasters.vehicles.length}</span>
              </div>
              <span className="text-slate-600 font-bold block text-[11px] mt-1">Vehicles</span>
            </div>
            <button
              type="button"
              disabled={currentMasters.vehicles.length === 0}
              onClick={() => {
                setTargetCategoryToDelete('vehicles');
                setDeleteModalType('category');
              }}
              className="mt-2 text-[10px] text-rose-700 font-bold hover:underline opacity-80 group-hover:opacity-100 disabled:opacity-30 text-left"
            >
              Clear Vehicles
            </button>
          </div>

          {/* Transporters */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span className="font-mono font-black text-slate-950 text-sm">{currentMasters.transporters.length}</span>
              </div>
              <span className="text-slate-600 font-bold block text-[11px] mt-1">Transporters</span>
            </div>
            <button
              type="button"
              disabled={currentMasters.transporters.length === 0}
              onClick={() => {
                setTargetCategoryToDelete('transporters');
                setDeleteModalType('category');
              }}
              className="mt-2 text-[10px] text-rose-700 font-bold hover:underline opacity-80 group-hover:opacity-100 disabled:opacity-30 text-left"
            >
              Clear Transporters
            </button>
          </div>

          {/* Routes / Corridors */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Navigation className="h-4 w-4 text-amber-600" />
                <span className="font-mono font-black text-slate-950 text-sm">{currentMasters.routes.length}</span>
              </div>
              <span className="text-slate-600 font-bold block text-[11px] mt-1">Corridors</span>
            </div>
            <button
              type="button"
              disabled={currentMasters.routes.length === 0}
              onClick={() => {
                setTargetCategoryToDelete('routes');
                setDeleteModalType('category');
              }}
              className="mt-2 text-[10px] text-rose-700 font-bold hover:underline opacity-80 group-hover:opacity-100 disabled:opacity-30 text-left"
            >
              Clear Corridors
            </button>
          </div>

          {/* Drivers */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <UserCheck className="h-4 w-4 text-cyan-600" />
                <span className="font-mono font-black text-slate-950 text-sm">{currentMasters.drivers.length}</span>
              </div>
              <span className="text-slate-600 font-bold block text-[11px] mt-1">Drivers</span>
            </div>
            <button
              type="button"
              disabled={currentMasters.drivers.length === 0}
              onClick={() => {
                setTargetCategoryToDelete('drivers');
                setDeleteModalType('category');
              }}
              className="mt-2 text-[10px] text-rose-700 font-bold hover:underline opacity-80 group-hover:opacity-100 disabled:opacity-30 text-left"
            >
              Clear Drivers
            </button>
          </div>

          {/* Commodities */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Package className="h-4 w-4 text-teal-600" />
                <span className="font-mono font-black text-slate-950 text-sm">{currentMasters.commodities.length}</span>
              </div>
              <span className="text-slate-600 font-bold block text-[11px] mt-1">Commodities</span>
            </div>
            <button
              type="button"
              disabled={currentMasters.commodities.length === 0}
              onClick={() => {
                setTargetCategoryToDelete('commodities');
                setDeleteModalType('category');
              }}
              className="mt-2 text-[10px] text-rose-700 font-bold hover:underline opacity-80 group-hover:opacity-100 disabled:opacity-30 text-left"
            >
              Clear Commodities
            </button>
          </div>
        </div>

        {/* Master Control Operations */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Backup Masters Only */}
          <button
            type="button"
            onClick={onBackupMastersOnly ? onBackupMastersOnly : () => {
              const payload = { app: 'LogiTrack Transport Masters', version: '2.5', exportedAt: new Date().toISOString(), masters: currentMasters };
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', `LogiTrack_Masters_Backup_${new Date().toISOString().split('T')[0]}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              document.body.removeChild(downloadAnchor);
            }}
            disabled={totalMasterItems === 0}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 rounded-xl text-xs font-bold border border-indigo-200 flex items-center space-x-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-indigo-700" />
            <span>Export Masters JSON Only</span>
          </button>

          {/* Reset Masters to Defaults */}
          <button
            type="button"
            onClick={handleResetMasters}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <span>Reset Masters to Defaults</span>
          </button>

          {/* Delete All Masters Data */}
          <button
            type="button"
            onClick={() => setDeleteModalType('masters_all')}
            disabled={totalMasterItems === 0}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-bold border border-rose-200 flex items-center space-x-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span>Delete All Masters Data</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: BACKUP DATA (FULL SNAPSHOT) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <span className="p-1 rounded-lg bg-emerald-100 text-emerald-900">
            <Download className="h-5 w-5" />
          </span>
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
            3. Backup Full Database (Dispatches & Masters)
          </h3>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Export full database snapshot including all vehicle dispatches, multiple LRs, invoices, e-waybills, rates, market vehicle contracts, and full Masters directory.
        </p>

        {/* Database Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Dispatches</span>
            <span className="font-black text-slate-950 font-mono text-sm">{records.length} records</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Total LRs Attached</span>
            <span className="font-black text-indigo-700 font-mono text-sm">{totalLrs} Lorry Receipts</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Master Records</span>
            <span className="font-black text-purple-800 font-mono text-sm">{totalMasterItems} Master items</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Freight Turnover</span>
            <span className="font-black text-emerald-800 font-mono text-sm">{formatCurrency(totalFreight)}</span>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={onBackupData}
            disabled={records.length === 0 && totalMasterItems === 0}
            className="px-4 py-2.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-2 transition-all disabled:opacity-40"
          >
            <FileJson className="h-4 w-4" />
            <span>Download Full JSON Backup (Dispatches + Masters)</span>
          </button>

          <button
            onClick={() => exportToExcel(records)}
            disabled={records.length === 0}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-xs disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>Export to Excel (.xlsx) Workbook</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: RESTORE & IMPORT WITH OVERWRITE / MERGE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <span className="p-1 rounded-lg bg-cyan-100 text-cyan-900">
            <Upload className="h-5 w-5" />
          </span>
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
            4. Restore & Import (Overwrite vs Merge)
          </h3>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Restore records from a previously generated LogiTrack JSON backup with complete Overwrite (full replace) or Safe Merge (appends new records), or bulk import consignment dispatches from an Excel spreadsheet.
        </p>

        {/* Excel Import Quick Action Card */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black text-xs text-slate-950 block">
                Excel Spreadsheet (.xlsx) Bulk Import
              </span>
              <p className="text-[11px] text-emerald-900 font-medium">
                Imports multiple LRs per vehicle trip with auto-grouping and duplicate rejection.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get Template</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-1.5 transition-all"
            >
              <Upload className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Import .xlsx</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {restoreError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        {restoreSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
            <span>{restoreSuccess}</span>
          </div>
        )}

        {/* File Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-[#00E676] hover:bg-emerald-50/30 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-upload"
          />
          <label htmlFor="backup-file-upload" className="cursor-pointer space-y-2 block">
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-950 block">
                {restoreFile ? restoreFile.name : 'Click to select LogiTrack JSON backup file'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Supports standard .json backup files (Dispatches, Masters, or Full Database)
              </span>
            </div>
          </label>
        </div>

        {/* Preview & Action Options */}
        {restorePreview && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-black text-slate-950 flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Backup Validated: Ready to Ingest</span>
              </span>
              <div className="flex items-center space-x-2 font-mono text-xs">
                {restorePreview.count > 0 && (
                  <span className="bg-emerald-100 text-emerald-950 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {restorePreview.count} Dispatches ({restorePreview.lrCount} LRs)
                  </span>
                )}
                {restorePreview.mastersCount && restorePreview.mastersCount > 0 ? (
                  <span className="bg-indigo-100 text-indigo-950 font-bold px-2 py-0.5 rounded border border-indigo-200">
                    {restorePreview.mastersCount} Master Records
                  </span>
                ) : null}
              </div>
            </div>

            {/* Masters Detailed Breakdown if present */}
            {restorePreview.mastersCount && restorePreview.mastersCount > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-center font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Parties</span>
                  <span className="font-bold text-slate-900">{restorePreview.partiesCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Vehicles</span>
                  <span className="font-bold text-slate-900">{restorePreview.vehiclesCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Transporters</span>
                  <span className="font-bold text-slate-900">{restorePreview.transportersCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Corridors</span>
                  <span className="font-bold text-slate-900">{restorePreview.routesCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Drivers</span>
                  <span className="font-bold text-slate-900">{restorePreview.driversCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Commodities</span>
                  <span className="font-bold text-slate-900">{restorePreview.commoditiesCount || 0}</span>
                </div>
              </div>
            )}

            {/* Restore Scope (if file contains both) */}
            {restorePreview.count > 0 && restorePreview.mastersCount && restorePreview.mastersCount > 0 && (
              <div className="p-2.5 bg-slate-100 rounded-lg space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">Restore Target Scope:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="restore_scope"
                      checked={restoreScope === 'all'}
                      onChange={() => setRestoreScope('all')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-slate-900">All (Dispatches & Masters)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="restore_scope"
                      checked={restoreScope === 'dispatches_only'}
                      onChange={() => setRestoreScope('dispatches_only')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">Dispatches Only</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="restore_scope"
                      checked={restoreScope === 'masters_only'}
                      onChange={() => setRestoreScope('masters_only')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">Masters Only</span>
                  </label>
                </div>
              </div>
            )}

            {/* Mode Selector: Overwrite vs Merge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRestoreMode('replace')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  restoreMode === 'replace'
                    ? 'border-rose-500 bg-rose-50 text-slate-950 font-bold shadow-xs ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="block text-xs font-black text-rose-950">⚡ Overwrite / Replace Database</strong>
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                    Overwrite
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 block mt-1">
                  Completely erases current records and replaces with backup data.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  restoreMode === 'merge'
                    ? 'border-[#00E676] bg-emerald-50 text-slate-950 font-bold shadow-xs ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="block text-xs font-black text-emerald-950">Merge with Existing Data</strong>
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-950">
                    Safe Merge
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 block mt-1">
                  Appends new entries and updates matching parties/vehicles without deleting other data.
                </span>
              </button>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRestorePreview(null);
                  setRestoreFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-1.5"
              >
                <Upload className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Confirm & Restore Now</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: DANGER ZONE & TOTAL PURGE */}
      <div className="bg-white border border-rose-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-rose-100 pb-3 text-rose-700">
          <span className="p-1 rounded-lg bg-rose-100">
            <ShieldAlert className="h-5 w-5 text-rose-700" />
          </span>
          <h3 className="text-sm font-black uppercase tracking-wider">
            5. Danger Zone & Permanent Deletion
          </h3>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Manage local offline browser cache, restore demo dispatches, delete Master directories, or perform a total factory purge.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 pt-1">
          {/* Action 1: Clear Offline Cache */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-black text-xs text-slate-950 block">Clear Local Cache</span>
              <p className="text-[11px] text-slate-600 mt-1 font-medium">
                Clears offline queued storage and forces a clean sync from the cloud database.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearLocalCache}
              className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center space-x-1 shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Cache</span>
            </button>
          </div>

          {/* Action 2: Reset Sample Dataset */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-black text-xs text-slate-950 block">Reset Dispatches</span>
              <p className="text-[11px] text-slate-600 mt-1 font-medium">
                Populates realistic multi-LR logistics dispatches with market contracts.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetSampleData}
              className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Load Sample Dispatches</span>
            </button>
          </div>

          {/* Action 3: Purge All Dispatches */}
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-black text-xs text-rose-900 block">Purge Dispatches</span>
              <p className="text-[11px] text-rose-800 mt-1 font-medium">
                Permanently deletes all {records.length} dispatches and {totalLrs} LRs (keeps Masters intact).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteModalType('dispatches_only');
                setConfirmDeleteText('');
              }}
              className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge Dispatches</span>
            </button>
          </div>

          {/* Action 4: Total Factory Purge (Dispatches + Masters) */}
          <div className="p-4 rounded-xl bg-rose-100/60 border border-rose-300 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-black text-xs text-rose-950 block">Total Factory Purge</span>
              <p className="text-[11px] text-rose-900 mt-1 font-medium">
                Permanently wipes all Dispatches, LRs AND all Master directories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteModalType('total_wipe');
                setConfirmDeleteText('');
              }}
              className="py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-xs ring-1 ring-rose-900"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Purge Everything</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR DELETIONS */}
      {deleteModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-rose-300 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-950">
                  {deleteModalType === 'dispatches_only' && 'Delete All Dispatch Records?'}
                  {deleteModalType === 'masters_all' && 'Delete All Master Records?'}
                  {deleteModalType === 'category' && `Delete All ${targetCategoryToDelete?.toUpperCase()} Masters?`}
                  {deleteModalType === 'total_wipe' && 'Complete System Factory Purge?'}
                </h4>
                <p className="text-xs text-rose-600 font-semibold">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 font-medium">
              {deleteModalType === 'dispatches_only' && (
                <>You are about to permanently erase all <strong className="text-slate-950 font-black">{records.length} dispatches</strong> and <strong className="text-slate-950 font-black">{totalLrs} LRs</strong> from database storage.</>
              )}
              {deleteModalType === 'masters_all' && (
                <>You are about to permanently erase all <strong className="text-slate-950 font-black">{totalMasterItems} Master entries</strong> (Parties, Fleet Vehicles, Transporters, Corridors, Drivers, Commodities).</>
              )}
              {deleteModalType === 'category' && (
                <>You are about to permanently erase all records in the <strong className="text-slate-950 font-black">{targetCategoryToDelete}</strong> Master directory.</>
              )}
              {deleteModalType === 'total_wipe' && (
                <>You are about to completely wipe the entire system: <strong className="text-slate-950 font-black">{records.length} dispatches</strong>, <strong className="text-slate-950 font-black">{totalLrs} LRs</strong>, and <strong className="text-slate-950 font-black">{totalMasterItems} Master directory items</strong>.</>
              )}
            </p>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 text-xs">
              <label className="block text-slate-700 text-[11px] mb-1 font-bold">
                Type <strong className="text-rose-700 font-mono font-black">DELETE</strong> in uppercase to confirm:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Type DELETE"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-slate-900 font-mono font-bold uppercase text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteModalType(null);
                  setTargetCategoryToDelete(null);
                  setConfirmDeleteText('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmDeleteText.trim() !== 'DELETE' || isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-xs flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Purging...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        existingRecords={records}
        onImportSuccess={(validDispatches) => {
          if (onImportExcel) {
            onImportExcel(validDispatches);
          }
          setIsExcelModalOpen(false);
        }}
      />
    </div>
  );
};
