import React, { useState, useRef } from 'react';
import { DispatchRecord } from '../types/dispatch';
import { AVAILABLE_THEMES, ThemeConfig } from '../lib/theme';
import { formatCurrency } from '../lib/calculations';
import { exportToExcel, downloadExcelTemplate } from '../lib/excelService';
import { ExcelImportModal } from './ExcelImportModal';
import { 
  Download, 
  Upload, 
  Trash2, 
  Palette, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  FileSpreadsheet, 
  RotateCcw, 
  HardDrive, 
  Clock, 
  Sparkles,
  Info,
  Check,
  FileJson
} from 'lucide-react';

interface SettingsViewProps {
  records: DispatchRecord[];
  activeTheme: string;
  onThemeChange: (themeId: string) => void;
  onBackupData: () => void;
  onRestoreData: (restoredRecords: DispatchRecord[], mode: 'replace' | 'merge') => void;
  onDeleteAllData: () => Promise<void>;
  onResetSampleData: () => void;
  onClearLocalCache: () => void;
  onImportExcel?: (dispatches: DispatchRecord[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  records,
  activeTheme,
  onThemeChange,
  onBackupData,
  onRestoreData,
  onDeleteAllData,
  onResetSampleData,
  onClearLocalCache,
  onImportExcel,
}) => {
  // Excel import modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Restore file handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    records: DispatchRecord[];
    count: number;
    lrCount: number;
    totalFreight: number;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

        // Accept array of dispatches directly or { dispatches: [...] }
        const dataList: DispatchRecord[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.dispatches)
          ? parsed.dispatches
          : [];

        if (dataList.length === 0) {
          throw new Error('No valid dispatch records found in this backup file.');
        }

        // Validate basic structure
        const validRecords = dataList.filter((r) => r.id && r.vehicleNumber && r.date);
        if (validRecords.length === 0) {
          throw new Error('Backup format does not match LogiTrack dispatch schema.');
        }

        const lrCount = validRecords.reduce((s, r) => s + (r.lrs?.length || r.totalLrsCount || 0), 0);
        const totalFreight = validRecords.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);

        setRestorePreview({
          records: validRecords,
          count: validRecords.length,
          lrCount,
          totalFreight,
        });
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
      onRestoreData(restorePreview.records, restoreMode);
      setRestoreSuccess(
        `Successfully restored ${restorePreview.count} dispatch records (${restorePreview.lrCount} LRs) via ${
          restoreMode === 'replace' ? 'database replacement' : 'database merge'
        }!`
      );
      setRestorePreview(null);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setRestoreError(err?.message || 'Error occurred while restoring database records.');
    }
  };

  // Perform Total Delete
  const handleExecuteDelete = async () => {
    if (confirmDeleteText.trim() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await onDeleteAllData();
      setShowDeleteModal(false);
      setConfirmDeleteText('');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalLrs = records.reduce((s, r) => s + (r.lrs?.length || r.totalLrsCount || 0), 0);
  const totalFreight = records.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <span>System Settings & Data Management</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage system theme, create encrypted JSON backups, restore historical data, and control database storage.
        </p>
      </div>

      {/* SECTION 1: THEME CUSTOMIZATION (7+ THEMES) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Theme Customization ({AVAILABLE_THEMES.length} Available Themes)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Selected: <strong className="text-white capitalize">{AVAILABLE_THEMES.find(t => t.id === activeTheme)?.name}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Choose a visual theme optimized for dispatch desks, night transport hubs, or daylight dock supervision. Changes are saved automatically.
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
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10 scale-[1.02]'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Top: Name & Checkmark */}
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="font-bold text-xs text-white block group-hover:text-indigo-300 transition-colors">
                      {theme.name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {theme.category} Mode
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {/* Color Palette Preview Swatch */}
                <div className="flex space-x-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                  {theme.previewColors.map((color, idx) => (
                    <div
                      key={idx}
                      style={{ backgroundColor: color }}
                      className="flex-1 h-5 rounded border border-white/10"
                    />
                  ))}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {theme.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: BACKUP DATA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Download className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            2. Backup Data
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Export full database snapshot including all vehicle dispatches, multiple LRs, invoices, e-waybills, rates, and market vehicle hire contracts.
        </p>

        {/* Database Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Total Dispatches</span>
            <span className="font-bold text-white font-mono text-sm">{records.length} records</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Total LRs Attached</span>
            <span className="font-bold text-indigo-400 font-mono text-sm">{totalLrs} Lorry Receipts</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Total Freight Turnover</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{formatCurrency(totalFreight)}</span>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={onBackupData}
            disabled={records.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all disabled:opacity-40"
          >
            <FileJson className="h-4 w-4" />
            <span>Download Full JSON Backup</span>
          </button>

          <button
            onClick={() => exportToExcel(records)}
            disabled={records.length === 0}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export to Excel (.xlsx) Workbook</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: RESTORE & IMPORT DATA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Upload className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            3. Restore & Import Data (JSON / Excel)
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Restore records from a previously generated LogiTrack JSON backup, or bulk import consignment dispatches from an Excel (.xlsx) spreadsheet with strict duplicate prevention.
        </p>

        {/* Excel Import Quick Action Card */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block">
                Excel Spreadsheet (.xlsx) Bulk Import
              </span>
              <p className="text-[11px] text-emerald-200/80">
                Imports multiple LRs per vehicle trip with auto-grouping and duplicate rejection.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get Template</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import .xlsx</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {restoreError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        {restoreSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{restoreSuccess}</span>
          </div>
        )}

        {/* File Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-2xl p-6 text-center transition-all">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-upload"
          />
          <label htmlFor="backup-file-upload" className="cursor-pointer space-y-2 block">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {restoreFile ? restoreFile.name : 'Click to select LogiTrack JSON backup file'}
              </span>
              <span className="text-[11px] text-slate-400">
                Supports standard .json backup files generated by LogiTrack
              </span>
            </div>
          </label>
        </div>

        {/* Preview & Action Options */}
        {restorePreview && (
          <div className="p-4 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Backup Validated: Ready to Restore</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {restorePreview.count} Dispatches ({restorePreview.lrCount} LRs)
              </span>
            </div>

            {/* Mode Selector: Replace vs Merge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRestoreMode('replace')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  restoreMode === 'replace'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <strong className="block text-xs">Replace Current Data</strong>
                <span className="text-[10px] text-slate-400">
                  Completely replace current entries with the backup file.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  restoreMode === 'merge'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <strong className="block text-xs">Merge with Existing Data</strong>
                <span className="text-[10px] text-slate-400">
                  Append new dispatches from the backup without deleting current ones.
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
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Confirm & Restore Now</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: DELETE DATA (DANGER ZONE) */}
      <div className="bg-slate-900/90 border border-rose-900/40 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-rose-900/30 pb-3 text-rose-400">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            4. Danger Zone & Data Deletion
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Options to clear offline browser cache, restore sample demo dataset, or permanently purge all database records.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Action 1: Clear Offline Cache */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-xs text-white block">Clear Local Cache</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Clears offline queued storage and forces a clean sync from the cloud database.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearLocalCache}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Cache</span>
            </button>
          </div>

          {/* Action 2: Reset Sample Dataset */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-xs text-white block">Reset to Sample Data</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Populates realistic multi-LR logistics dispatches with market contracts.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetSampleData}
              className="py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Load Sample Records</span>
            </button>
          </div>

          {/* Action 3: Total Delete */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-xs text-rose-300 block">Purge All Records</span>
              <p className="text-[11px] text-rose-300/80 mt-1">
                Permanently deletes all {records.length} dispatches and {totalLrs} LRs from database.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-md shadow-rose-600/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete All Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR TOTAL PURGE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Delete All Database Data?</h4>
                <p className="text-xs text-slate-400">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              You are about to permanently erase all <strong className="text-white">{records.length} dispatches</strong> and{' '}
              <strong className="text-white">{totalLrs} LRs</strong> from both local storage and the Firestore cloud database.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <label className="block text-slate-400 text-[11px] mb-1">
                Type <strong className="text-rose-400 font-mono">DELETE</strong> in uppercase to confirm:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Type DELETE"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono uppercase text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmDeleteText('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmDeleteText.trim() !== 'DELETE' || isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting Records...' : 'Permanently Delete'}</span>
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
