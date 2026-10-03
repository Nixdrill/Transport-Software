import React, { useState, useRef } from 'react';
import { DispatchRecord } from '../types/dispatch';
import { 
  downloadExcelTemplate, 
  parseAndValidateExcel, 
  ImportValidationResult 
} from '../lib/excelService';
import { formatCurrency } from '../lib/calculations';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  Truck, 
  FileText, 
  RefreshCw,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: DispatchRecord[];
  onImportSuccess: (importedDispatches: DispatchRecord[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingRecords,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setValidationResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMsg('Please select a valid Excel workbook file (.xlsx or .xls).');
      return;
    }

    setSelectedFile(file);
    setIsValidating(true);

    try {
      const result = await parseAndValidateExcel(file, existingRecords);
      setValidationResult(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to read or parse the Excel file.');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = () => {
    if (!validationResult || validationResult.validDispatches.length === 0) return;
    setIsImporting(true);
    try {
      onImportSuccess(validationResult.validDispatches);
      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred during import.');
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setErrorMsg(null);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Import Data from Excel (.xlsx)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-normal border border-emerald-500/30">
                  Duplicate Protected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bulk upload dispatches & multiple LRs with automated validation and duplicate rejection.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300 flex-1">
          {/* Top Banner: Template Download */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block text-xs">
                  Need the Excel Import Format?
                </span>
                <p className="text-[11px] text-indigo-200/80 mt-0.5">
                  Download our pre-structured template containing sample LRs, multiple invoice formatting, and column specifications.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 flex-shrink-0 self-start sm:self-auto transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template (.xlsx)</span>
            </button>
          </div>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl p-6 text-center transition-all">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-modal-upload"
            />
            <label htmlFor="excel-file-modal-upload" className="cursor-pointer space-y-2 block">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                {isValidating ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedFile ? selectedFile.name : 'Click to select Excel spreadsheet (.xlsx)'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Select your filled LogiTrack template or transport dispatch sheet
                </span>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Validation & Duplicate Detection Results */}
          {validationResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Duplicate Detection Alert (CRITICAL USER REQUIREMENT: Do not allow duplicate entries) */}
              {validationResult.duplicates.length > 0 ? (
                <div className="p-4 bg-rose-950/40 border border-rose-600/50 rounded-xl space-y-2.5">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    <span>
                      Duplicate Protection: {validationResult.duplicates.length} Duplicate LR(s) Blocked
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-200/90">
                    The following LR numbers were flagged because they already exist in the database or are duplicated within your file. To preserve data integrity, <strong>duplicate entries are rejected</strong> and will NOT be imported:
                  </p>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {validationResult.duplicates.map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900/90 border border-rose-900/60 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                            {dup.lrNumber}
                          </span>
                          <span className="text-slate-400">
                            {dup.reason === 'already_exists_in_database'
                              ? 'Already in Database'
                              : 'Duplicated in File'}
                          </span>
                        </div>
                        <span className="text-slate-300 font-mono text-[10px]">
                          {dup.existingRecordInfo || `Vehicle: ${dup.vehicleNumber}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>No duplicate LR numbers detected. All entries are unique.</span>
                </div>
              )}

              {/* Invalid Rows Alert (if any) */}
              {validationResult.invalidRows.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>{validationResult.invalidRows.length} Row(s) Skipped due to Missing Fields</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-200/80 space-y-0.5 max-h-24 overflow-y-auto">
                    {validationResult.invalidRows.map((inv, idx) => (
                      <li key={idx}>
                        Row #{inv.rowIndex} {inv.lrNumber ? `(${inv.lrNumber})` : ''}: {inv.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Valid Dispatches Ready to Import */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Ready to Import: Valid Records Summary</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {validationResult.validDispatches.length} Trips / {validationResult.validLRCount} LRs
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Vehicle Trips</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {validationResult.validDispatches.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Lorry Receipts</span>
                    <span className="text-sm font-bold text-indigo-400 font-mono">
                      {validationResult.validLRCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Cargo (MT)</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {validationResult.validDispatches.reduce((s, r) => s + (r.totalWeight || 0), 0).toFixed(2)} MT
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Freight</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatCurrency(
                        validationResult.validDispatches.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Preview Trips Table */}
                <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] text-slate-400 uppercase">
                      <tr>
                        <th className="p-2">Date & Vehicle</th>
                        <th className="p-2">Transporter & Route</th>
                        <th className="p-2">LR Count</th>
                        <th className="p-2 text-right">Freight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-[11px]">
                      {validationResult.validDispatches.map((dsp) => (
                        <tr key={dsp.id} className="hover:bg-slate-800/40">
                          <td className="p-2 font-mono">
                            <span className="text-white block font-bold">{dsp.vehicleNumber}</span>
                            <span className="text-slate-400 text-[10px]">{dsp.date} • {dsp.placement}</span>
                          </td>
                          <td className="p-2">
                            <span className="text-slate-200 block truncate max-w-[200px]">{dsp.transporterName}</span>
                            <span className="text-slate-400 text-[10px] truncate max-w-[200px] block">
                              {dsp.fromParty} → {dsp.toParty}
                            </span>
                          </td>
                          <td className="p-2 font-mono">
                            <span className="text-indigo-300 font-bold">{dsp.lrs.length} LRs</span>
                            <span className="text-slate-500 text-[10px] block">
                              {(dsp.lrNumbers || []).slice(0, 2).join(', ')}
                              {(dsp.lrNumbers || []).length > 2 ? '...' : ''}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono text-emerald-400 font-semibold">
                            {formatCurrency(dsp.totalFreightAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {validationResult?.canImport
              ? `Ready to import ${validationResult.validDispatches.length} dispatch trips into database.`
              : 'Select an .xlsx file to validate and import.'}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult?.canImport || isImporting}
              onClick={handleExecuteImport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    Import {validationResult?.validDispatches.length || 0} Valid Trips
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
