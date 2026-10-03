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
  RefreshCw,
  Info
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <span>Import Data from Excel (.xlsx)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-300">
                  Duplicate Protected
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Bulk upload dispatches & multiple LRs with automated validation and duplicate rejection.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* Top Banner: Template Download */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-indigo-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-slate-950 block text-xs">
                  Need the Excel Import Format?
                </span>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Download our pre-structured template containing sample LRs, multiple invoice formatting, and column specifications.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center space-x-1.5 flex-shrink-0 self-start sm:self-auto transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template (.xlsx)</span>
            </button>
          </div>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-[#00E676] hover:bg-emerald-50/30 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-modal-upload"
            />
            <label htmlFor="excel-file-modal-upload" className="cursor-pointer space-y-2 block">
              <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
                {isValidating ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <div>
                <span className="text-xs font-black text-slate-950 block">
                  {selectedFile ? selectedFile.name : 'Click to select Excel spreadsheet (.xlsx)'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Select your filled LogiTrack template or transport dispatch sheet
                </span>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Validation & Duplicate Detection Results */}
          {validationResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Duplicate Detection Alert (CRITICAL REQUIREMENT: Do not allow duplicate entries) */}
              {validationResult.duplicates.length > 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2.5 shadow-xs">
                  <div className="flex items-center space-x-2 text-rose-900 font-black text-xs">
                    <ShieldAlert className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>
                      Duplicate Protection: {validationResult.duplicates.length} Duplicate LR(s) Blocked
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-medium">
                    The following LR numbers were flagged because they already exist in the database or are duplicated within your file. To preserve data integrity, <strong>duplicate entries are rejected</strong> and will NOT be imported:
                  </p>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {validationResult.duplicates.map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-white border border-rose-200 flex items-center justify-between text-[11px] shadow-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-mono font-black border border-rose-300">
                            {dup.lrNumber}
                          </span>
                          <span className="text-slate-600 font-semibold">
                            {dup.reason === 'already_exists_in_database'
                              ? 'Already in Database'
                              : 'Duplicated in File'}
                          </span>
                        </div>
                        <span className="text-slate-700 font-mono text-[10px] font-bold">
                          {dup.existingRecordInfo || `Vehicle: ${dup.vehicleNumber}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center space-x-2 font-bold shadow-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                  <span>No duplicate LR numbers detected. All entries are unique.</span>
                </div>
              )}

              {/* Invalid Rows Alert (if any) */}
              {validationResult.invalidRows.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl space-y-1.5 shadow-xs">
                  <div className="flex items-center space-x-2 font-black">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>{validationResult.invalidRows.length} Row(s) Skipped due to Missing Fields</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-900 font-medium space-y-0.5 max-h-24 overflow-y-auto">
                    {validationResult.invalidRows.map((inv, idx) => (
                      <li key={idx}>
                        Row #{inv.rowIndex} {inv.lrNumber ? `(${inv.lrNumber})` : ''}: {inv.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Valid Dispatches Ready to Import */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span>Ready to Import: Valid Records Summary</span>
                  </span>
                  <span className="font-mono text-emerald-800 font-black">
                    {validationResult.validDispatches.length} Trips / {validationResult.validLRCount} LRs
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Vehicle Trips</span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {validationResult.validDispatches.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Lorry Receipts</span>
                    <span className="text-base font-black text-indigo-700 font-mono">
                      {validationResult.validLRCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Cargo (MT)</span>
                    <span className="text-base font-black text-amber-800 font-mono">
                      {validationResult.validDispatches.reduce((s, r) => s + (r.totalWeight || 0), 0).toFixed(2)} MT
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Freight</span>
                    <span className="text-base font-black text-emerald-800 font-mono">
                      {formatCurrency(
                        validationResult.validDispatches.reduce((s, r) => s + (Number(r.totalFreightAmount) || 0), 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Preview Trips Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date & Vehicle</th>
                        <th className="p-2.5">Transporter & Route</th>
                        <th className="p-2.5">LR Count</th>
                        <th className="p-2.5 text-right">Freight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {validationResult.validDispatches.map((dsp) => (
                        <tr key={dsp.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">
                            <span className="text-slate-950 block font-bold">{dsp.vehicleNumber}</span>
                            <span className="text-slate-500 text-[10px]">{dsp.date} • {dsp.placement}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-slate-900 font-semibold block truncate max-w-[200px]">{dsp.transporterName}</span>
                            <span className="text-slate-500 text-[10px] truncate max-w-[200px] block">
                              {dsp.fromParty} → {dsp.toParty}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono">
                            <span className="text-indigo-800 font-bold">{dsp.lrs.length} LRs</span>
                            <span className="text-slate-400 text-[10px] block">
                              {(dsp.lrNumbers || []).slice(0, 2).join(', ')}
                              {(dsp.lrNumbers || []).length > 2 ? '...' : ''}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-800 font-black">
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
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-600 font-medium">
            {validationResult?.canImport
              ? `Ready to import ${validationResult.validDispatches.length} dispatch trips into database.`
              : 'Select an .xlsx file to validate and import.'}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult?.canImport || isImporting}
              onClick={handleExecuteImport}
              className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] disabled:opacity-40 text-slate-950 rounded-xl text-xs font-black shadow-xs border border-emerald-400 flex items-center space-x-1.5 transition-all"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
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
