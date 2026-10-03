import React, { useState, useMemo } from 'react';
import { 
  FreightInvoice, 
  PaymentStatus, 
  PaymentMode,
  BillerCompanyInfo 
} from '../types/invoice';
import { DispatchRecord } from '../types/dispatch';
import { 
  getInvoices, 
  saveInvoice, 
  deleteInvoice, 
  getBillerProfile, 
  saveBillerProfile,
  exportInvoicesBackupJSON,
  restoreInvoicesFromBackupJSON
} from '../lib/invoiceService';
import { getBillingParties, getMasters } from '../lib/mastersService';
import { 
  getStoredInvoiceCustomization, 
  saveStoredInvoiceCustomization 
} from '../lib/invoiceCustomizationDefaults';
import { 
  recordInvoicePaymentWithReconciliation 
} from '../lib/ledgerService';
import { formatCurrency, generateSafeId } from '../lib/calculations';
import { InvoicePrintModal } from './InvoicePrintModal';
import { InvoiceBuilderModal } from './InvoiceBuilderModal';
import { InvoiceCustomizerPanel } from './InvoiceCustomizerPanel';
import { 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Building2, 
  FileText, 
  FileSpreadsheet,
  Settings,
  Layers,
  Sparkles,
  TrendingUp,
  Receipt,
  X,
  ChevronRight,
  CheckCheck,
  CheckSquare,
  Square,
  Palette,
  Sliders,
  Upload,
  RefreshCw
} from 'lucide-react';

interface BillingViewProps {
  dispatches: DispatchRecord[];
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToDispatches?: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  dispatches,
  showNotification,
  onNavigateToDispatches,
}) => {
  // Invoices State
  const [invoices, setInvoices] = useState<FreightInvoice[]>(() => getInvoices());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [partyFilter, setPartyFilter] = useState<string>('All');

  // Single & Multi-Selection for Invoices
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Modals State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<FreightInvoice | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<FreightInvoice | null>(null);

  // Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<FreightInvoice | null>(null);
  const [paymentTypeOption, setPaymentTypeOption] = useState<'Full' | 'Partial' | 'Settlement / Excess Adjustment'>('Full');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentTdsOption, setPaymentTdsOption] = useState<'NONE' | '194C_1' | '194C_2' | 'CUSTOM'>('NONE');
  const [paymentTdsAmount, setPaymentTdsAmount] = useState<number>(0);
  const [paymentDeductionAmount, setPaymentDeductionAmount] = useState<number>(0);
  const [paymentDeductionReason, setPaymentDeductionReason] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer / NEFT / RTGS');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentNextBillsAllocations, setPaymentNextBillsAllocations] = useState<Record<string, number>>({});

  // Biller Profile Settings Modal
  const [isBillerModalOpen, setIsBillerModalOpen] = useState(false);
  const [billerProfile, setBillerProfile] = useState<BillerCompanyInfo>(() => getBillerProfile());

  // Global Invoice Customizer Modal
  const [isCustomizerModalOpen, setIsCustomizerModalOpen] = useState(false);
  const [globalCustomization, setGlobalCustomization] = useState(() => getStoredInvoiceCustomization());

  // Invoices Backup & Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    invoices: FreightInvoice[];
    totalInvoices: number;
    totalTurnover: number;
    billerName?: string;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Reload invoices from storage
  const refreshInvoices = () => {
    setInvoices(getInvoices());
  };

  // Distinct Parties for filter dropdown
  const distinctParties = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.billedTo?.partyName) set.add(inv.billedTo.partyName);
    });
    return Array.from(set).sort();
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.billedTo.partyName.toLowerCase().includes(q) ||
        (inv.billedTo.gstin && inv.billedTo.gstin.toLowerCase().includes(q)) ||
        (inv.billedTo.city && inv.billedTo.city.toLowerCase().includes(q)) ||
        inv.items.some(
          (it) =>
            it.lrNumber.toLowerCase().includes(q) ||
            it.vehicleNumber.toLowerCase().includes(q) ||
            it.origin.toLowerCase().includes(q) ||
            it.destination.toLowerCase().includes(q) ||
            it.commodity.toLowerCase().includes(q)
        );

      // Status
      const matchStatus = statusFilter === 'All' || inv.paymentStatus === statusFilter;

      // Party
      const matchParty = partyFilter === 'All' || inv.billedTo.partyName === partyFilter;

      return matchSearch && matchStatus && matchParty;
    });
  }, [invoices, searchQuery, statusFilter, partyFilter]);

  // Billing KPI Summary Statistics
  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
    const totalCollected = invoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);
    const unpaidCount = invoices.filter((inv) => inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partially Paid').length;
    const paidCount = invoices.filter((inv) => inv.paymentStatus === 'Paid').length;
    const totalWeight = invoices.reduce((s, inv) => s + (inv.totalWeight || 0), 0);

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      unpaidCount,
      paidCount,
      totalWeight,
      totalCount: invoices.length,
    };
  }, [invoices]);

  // Save invoice handler from builder
  const handleSaveInvoice = (savedInv: FreightInvoice, autoPrint: boolean = false) => {
    const updated = saveInvoice(savedInv);
    refreshInvoices();
    setIsBuilderOpen(false);
    setEditingInvoice(null);
    showNotification(`Invoice ${savedInv.invoiceNumber} saved successfully!`, 'success');

    if (autoPrint) {
      setSelectedInvoiceForPrint(updated);
    }
  };

  // Delete invoice handler
  const handleDeleteInvoice = (id: string, invoiceNo: string) => {
    if (confirm(`Are you sure you want to delete invoice ${invoiceNo}?`)) {
      deleteInvoice(id);
      refreshInvoices();
      showNotification(`Invoice ${invoiceNo} removed from billing ledger.`, 'info');
    }
  };

  // Duplicate invoice
  const handleDuplicateInvoice = (inv: FreightInvoice) => {
    const duplicated: FreightInvoice = {
      ...inv,
      id: generateSafeId('inv'),
      invoiceNumber: `${inv.invoiceNumber}-COPY`,
      invoiceDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'Unpaid',
      amountPaid: 0,
      balanceDue: inv.grandTotal,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveInvoice(duplicated);
    refreshInvoices();
    showNotification(`Duplicated invoice created as ${duplicated.invoiceNumber}.`, 'success');
  };

  // Open Payment Recording Modal
  const handleOpenPaymentModal = (inv: FreightInvoice) => {
    setPaymentInvoice(inv);
    const remaining = Math.max(0, (inv.grandTotal || 0) - (inv.amountPaid || 0));
    setPaymentTypeOption('Full');
    setPaymentAmount(remaining);
    setPaymentTdsOption('NONE');
    setPaymentTdsAmount(0);
    setPaymentDeductionAmount(0);
    setPaymentDeductionReason('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('Bank Transfer / NEFT / RTGS');
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentNextBillsAllocations({});
  };

  // Submit Payment Record with Full / Partial and Settlement against Next Bill
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    const nextBillsArray = Object.entries(paymentNextBillsAllocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoiceId, allocatedAmount]) => ({ invoiceId, allocatedAmount }));

    try {
      const result = recordInvoicePaymentWithReconciliation({
        invoiceId: paymentInvoice.id,
        paymentType: paymentTypeOption,
        bankReceivedAmount: paymentAmount,
        tdsDeducted: paymentTdsAmount,
        tdsSection: paymentTdsOption === '194C_1' ? '194C (1%)' : paymentTdsOption === '194C_2' ? '194C (2%)' : '194C',
        deductionAmount: paymentDeductionAmount,
        deductionReason: paymentDeductionReason,
        paymentDate,
        paymentMode,
        referenceNumber: paymentRef.trim(),
        notes: paymentNotes.trim(),
        nextBillsSettlement: nextBillsArray.length > 0 ? nextBillsArray : undefined,
      });

      refreshInvoices();
      setPaymentInvoice(null);
      
      const msg = result.settledInvoices.length > 0
        ? `Payment recorded! Reconciled and settled ${result.settledInvoices.length} next pending bill(s) for ${paymentInvoice.billedTo.partyName}.`
        : `Payment of ${formatCurrency(result.totalCreditApplied)} recorded for ${paymentInvoice.invoiceNumber}! Status: ${result.primaryInvoice.paymentStatus}`;

      showNotification(msg, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Failed to record payment.', 'error');
    }
  };

  // Delete / Void a specific payment installment on an invoice
  const handleVoidPaymentRecord = (invoiceId: string, paymentRecordId: string) => {
    if (!confirm('Are you sure you want to void / delete this payment installment?')) return;
    const all = getInvoices();
    const invIdx = all.findIndex((i) => i.id === invoiceId);
    if (invIdx === -1) return;

    const inv = { ...all[invIdx] };
    const pmt = inv.payments?.find((p) => p.id === paymentRecordId);
    if (!pmt) return;

    inv.payments = inv.payments?.filter((p) => p.id !== paymentRecordId) || [];
    const totalCreditsRemaining = inv.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    inv.amountPaid = totalCreditsRemaining;
    inv.balanceDue = Math.max(0, inv.grandTotal - inv.amountPaid);
    inv.paymentStatus = inv.balanceDue === 0 ? 'Paid' : inv.amountPaid > 0 ? 'Partially Paid' : 'Unpaid';
    inv.updatedAt = new Date().toISOString();

    saveInvoice(inv);
    refreshInvoices();
    setPaymentInvoice(inv);
    showNotification('Payment installment removed and ledger recalculated.', 'info');
  };

  // Save Biller Company Info
  const handleSaveBillerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveBillerProfile(billerProfile);
    setIsBillerModalOpen(false);
    showNotification('Company Transport Billing Profile updated!', 'success');
  };

  // Export Invoices list to CSV
  const handleExportInvoicesCsv = () => {
    if (invoices.length === 0) return;
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Due Date',
      'Invoice Type',
      'Billed To Party',
      'GSTIN',
      'City',
      'State',
      'Total Weight (MT)',
      'Taxable Freight',
      'GST Rate (%)',
      'Is RCM',
      'Total Tax',
      'Grand Total',
      'Amount Paid',
      'Balance Due',
      'Payment Status',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.dueDate}"`,
      `"${inv.invoiceType}"`,
      `"${inv.billedTo.partyName}"`,
      `"${inv.billedTo.gstin || ''}"`,
      `"${inv.billedTo.city || ''}"`,
      `"${inv.billedTo.state || ''}"`,
      inv.totalWeight,
      inv.taxableAmount,
      inv.gstRate,
      inv.isRcm ? 'YES' : 'NO',
      inv.totalTax,
      inv.grandTotal,
      inv.amountPaid,
      inv.balanceDue,
      `"${inv.paymentStatus}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LogiTrack_Billing_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Invoices ledger exported to CSV.', 'success');
  };

  // Selection Logic & Handlers
  const isAllFilteredSelected = filteredInvoices.length > 0 && filteredInvoices.every((i) => selectedInvoiceIds.includes(i.id));
  const isSomeFilteredSelected = filteredInvoices.some((i) => selectedInvoiceIds.includes(i.id));

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredInvoices.map((i) => i.id);
    setSelectedInvoiceIds((prev) => {
      const allSelected = filteredIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...filteredIds]));
      }
    });
  };

  const handleSelectAllRecords = () => {
    setSelectedInvoiceIds(invoices.map((i) => i.id));
  };

  const handleClearSelection = () => {
    setSelectedInvoiceIds([]);
  };

  const handleInvertSelection = () => {
    const filteredIds = filteredInvoices.map((i) => i.id);
    setSelectedInvoiceIds((prev) => {
      const remaining = prev.filter((id) => !filteredIds.includes(id));
      const newlySelected = filteredIds.filter((id) => !prev.includes(id));
      return [...remaining, ...newlySelected];
    });
  };

  const selectedInvoices = useMemo(() => {
    return invoices.filter((i) => selectedInvoiceIds.includes(i.id));
  }, [invoices, selectedInvoiceIds]);

  const selectedStats = useMemo(() => {
    const count = selectedInvoices.length;
    const totalGrand = selectedInvoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
    const totalPaid = selectedInvoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
    const totalBalance = selectedInvoices.reduce((s, inv) => s + (inv.balanceDue || 0), 0);
    return { count, totalGrand, totalPaid, totalBalance };
  }, [selectedInvoices]);

  // Batch Invoices Actions
  const handleBatchMarkPaid = () => {
    if (selectedInvoices.length === 0) return;
    if (!confirm(`Mark all ${selectedInvoices.length} selected invoices as FULLY PAID?`)) return;

    selectedInvoices.forEach((inv) => {
      const updated: FreightInvoice = {
        ...inv,
        amountPaid: inv.grandTotal,
        balanceDue: 0,
        paymentStatus: 'Paid',
        updatedAt: new Date().toISOString(),
      };
      saveInvoice(updated);
    });

    refreshInvoices();
    showNotification(`Marked ${selectedInvoices.length} invoices as Paid!`, 'success');
  };

  const handleBatchMarkUnpaid = () => {
    if (selectedInvoices.length === 0) return;
    if (!confirm(`Reset payment status of all ${selectedInvoices.length} selected invoices to UNPAID?`)) return;

    selectedInvoices.forEach((inv) => {
      const updated: FreightInvoice = {
        ...inv,
        amountPaid: 0,
        balanceDue: inv.grandTotal,
        paymentStatus: 'Unpaid',
        updatedAt: new Date().toISOString(),
      };
      saveInvoice(updated);
    });

    refreshInvoices();
    showNotification(`Reset ${selectedInvoices.length} invoices to Unpaid!`, 'info');
  };

  const handleBatchDeleteInvoices = () => {
    if (selectedInvoices.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${selectedInvoices.length} selected invoices?`)) return;

    selectedInvoiceIds.forEach((id) => deleteInvoice(id));
    refreshInvoices();
    const count = selectedInvoiceIds.length;
    setSelectedInvoiceIds([]);
    showNotification(`Deleted ${count} invoices from billing ledger.`, 'info');
  };

  const handleBatchExportSelectedCsv = () => {
    if (selectedInvoices.length === 0) return;
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Due Date',
      'Invoice Type',
      'Billed To Party',
      'GSTIN',
      'City',
      'State',
      'Total Weight (MT)',
      'Taxable Freight',
      'GST Rate (%)',
      'Is RCM',
      'Total Tax',
      'Grand Total',
      'Amount Paid',
      'Balance Due',
      'Payment Status',
    ];

    const rows = selectedInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.dueDate}"`,
      `"${inv.invoiceType}"`,
      `"${inv.billedTo.partyName}"`,
      `"${inv.billedTo.gstin || ''}"`,
      `"${inv.billedTo.city || ''}"`,
      `"${inv.billedTo.state || ''}"`,
      inv.totalWeight,
      inv.taxableAmount,
      inv.gstRate,
      inv.isRcm ? 'YES' : 'NO',
      inv.totalTax,
      inv.grandTotal,
      inv.amountPaid,
      inv.balanceDue,
      `"${inv.paymentStatus}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LogiTrack_Invoices_Selected_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Exported ${selectedInvoices.length} selected invoices to CSV.`, 'success');
  };

  // Full Invoices JSON Backup Export
  const handleExportInvoicesJSON = () => {
    const payload = exportInvoicesBackupJSON();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_Invoices_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showNotification(`Invoices dataset exported to JSON backup (${invoices.length} invoices).`, 'success');
  };

  // Selected Invoices JSON Backup Export
  const handleBatchExportSelectedJSON = () => {
    if (selectedInvoices.length === 0) return;
    const payload = {
      app: 'LogiTrack Freight Invoicing Suite',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      totalInvoices: selectedInvoices.length,
      totalTurnover: selectedInvoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0),
      billerProfile: getBillerProfile(),
      invoices: selectedInvoices,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LogiTrack_Invoices_Selected_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showNotification(`Exported ${selectedInvoices.length} selected invoices to JSON backup.`, 'success');
  };

  // Select File for Invoices Restore
  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const candidateInvoices: FreightInvoice[] = Array.isArray(parsed?.invoices)
          ? parsed.invoices
          : Array.isArray(parsed)
          ? parsed
          : [];

        if (candidateInvoices.length === 0) {
          throw new Error('Selected backup file contains 0 valid invoice records.');
        }

        const totalTurnover = candidateInvoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0);

        setRestorePreview({
          invoices: candidateInvoices,
          totalInvoices: candidateInvoices.length,
          totalTurnover,
          billerName: parsed?.billerProfile?.companyName,
        });
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        setRestoreError(err.message || 'Invalid JSON format or corrupted file.');
        showNotification(err.message || 'Failed to parse invoice backup file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Restore (Overwrite vs Merge)
  const handleExecuteRestore = () => {
    if (!restorePreview || restorePreview.invoices.length === 0) return;
    try {
      const result = restoreInvoicesFromBackupJSON(restorePreview, restoreMode);
      refreshInvoices();
      setIsRestoreModalOpen(false);
      setRestorePreview(null);
      showNotification(
        `Successfully restored ${result.count} invoices (${restoreMode === 'overwrite' ? 'Clean Overwrite' : 'Merge & Update'}).`,
        'success'
      );
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to restore invoices.');
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-150">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
              <Receipt className="h-6 w-6 text-slate-950" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center space-x-2">
                <span>Freight Billing & Tax Invoices</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  SAC 996511
                </span>
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Generate GST-compliant freight bills, track payment settlements, and print formal A4 consignment memos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Invoice Styler & Layouts Button */}
          <button
            type="button"
            onClick={() => setIsCustomizerModalOpen(true)}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-[#00E676] border border-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            title="Customize themes, colors, column headers, terms presets, and QR code settings"
          >
            <Palette className="h-4 w-4 text-[#00E676]" />
            <span>100% Styler & Themes</span>
          </button>

          {/* Company Profile Settings Button */}
          <button
            type="button"
            onClick={() => setIsBillerModalOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-slate-700" />
            <span>Issuer / Company Info</span>
          </button>

          {/* Export JSON Backup */}
          <button
            type="button"
            onClick={handleExportInvoicesJSON}
            disabled={invoices.length === 0}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            title="Export all Invoices to JSON Backup file"
          >
            <Download className="h-4 w-4 text-indigo-700" />
            <span>Export Backup</span>
          </button>

          {/* Restore Invoices (Overwrite / Merge) */}
          <label 
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            title="Restore invoices from JSON backup file with Overwrite or Safe Merge option"
          >
            <Upload className="h-4 w-4 text-emerald-700" />
            <span>Restore Invoices</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelectForRestore}
              className="hidden"
            />
          </label>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportInvoicesCsv}
            disabled={invoices.length === 0}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            title="Export invoices to Excel / CSV format"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>

          {/* New Invoice Button */}
          <button
            type="button"
            onClick={() => {
              setEditingInvoice(null);
              setIsBuilderOpen(true);
            }}
            className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Generate Bill / Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Invoiced Turnover */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-950 font-mono">
            {formatCurrency(stats.totalInvoiced)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Across <strong className="text-slate-900">{stats.totalCount}</strong> total bills ({stats.totalWeight} MT)
          </div>
        </div>

        {/* Card 2: Received / Collected Amount */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collected</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-800 font-mono">
            {formatCurrency(stats.totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold">
            {stats.paidCount} Fully Paid Invoices
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Due / Unpaid</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl font-black text-rose-950 font-mono">
            {formatCurrency(stats.totalOutstanding)}
          </div>
          <div className="text-[11px] text-rose-700 font-bold">
            {stats.unpaidCount} Pending Settlement
          </div>
        </div>

        {/* Card 4: Dispatches Available for Invoicing */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs space-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Available Trips</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00E676]">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="text-xl font-black font-mono mt-1">
              {dispatches.length} Trips
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingInvoice(null);
              setIsBuilderOpen(true);
            }}
            className="text-[11px] text-[#00E676] font-black hover:underline flex items-center space-x-1"
          >
            <span>+ Bill from Dispatches</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Invoice #, Party Name, GSTIN, LR No, Vehicle No, City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
            />
          </div>

          {/* Party Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap hidden sm:inline">Party:</span>
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="All">All Parties ({distinctParties.length})</option>
              {distinctParties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-1 pb-0.5">
          {(['All', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'] as (PaymentStatus | 'All')[]).map((status) => {
            const isSelected = statusFilter === status;
            const count = status === 'All' ? invoices.length : invoices.filter((i) => i.paymentStatus === status).length;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{status}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                  isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTION ACTIONS & STATS STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1 font-medium">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          {filteredInvoices.length > 0 && (
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-xs">
              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
                  }}
                  onChange={handleSelectAllFiltered}
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-slate-900 text-xs">
                  {isAllFilteredSelected ? 'Deselect All' : `Select All Visible (${filteredInvoices.length})`}
                </span>
              </label>
            </div>
          )}

          <div>
            Showing <span className="text-slate-950 font-black">{filteredInvoices.length}</span> of{' '}
            <span className="text-slate-950 font-black">{invoices.length}</span> invoices
            {(searchQuery || statusFilter !== 'All' || partyFilter !== 'All') && (
              <span className="text-emerald-700 font-bold ml-1.5">(Filtered)</span>
            )}
          </div>
        </div>

        {/* Multi-Selection Fast Action Buttons */}
        {filteredInvoices.length > 0 && (
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                isAllFilteredSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <CheckCheck className="h-3 w-3" />
              <span>{isAllFilteredSelected ? 'Deselect Visible' : `Select All Visible (${filteredInvoices.length})`}</span>
            </button>

            {invoices.length > filteredInvoices.length && (
              <button
                type="button"
                onClick={handleSelectAllRecords}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold transition-colors"
              >
                Select All {invoices.length}
              </button>
            )}

            {selectedInvoiceIds.length > 0 && (
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
                  Clear ({selectedInvoiceIds.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* FLOATING / STICKY BATCH ACTIONS BAR (when invoices are selected) */}
      {selectedInvoiceIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-slate-950 text-white rounded-2xl p-3 sm:p-4 shadow-xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-3 duration-150">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Selection Stats */}
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-[#00E676] flex items-center justify-center font-mono font-black text-sm border border-emerald-500/40">
                {selectedStats.count}
              </div>
              <div>
                <div className="font-black text-white text-xs flex items-center space-x-1.5">
                  <span>{selectedStats.count} Invoices Selected</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-mono">Turnover: {formatCurrency(selectedStats.totalGrand)}</span>
                  {selectedStats.totalBalance > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-mono">Due: {formatCurrency(selectedStats.totalBalance)}</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Perform batch settlement, export or deletion on selected invoices
                </div>
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
              {/* Batch Mark as Paid */}
              <button
                type="button"
                onClick={handleBatchMarkPaid}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs transition-colors"
                title="Mark all selected invoices as Fully Paid"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark Paid ({selectedStats.count})</span>
              </button>

              {/* Batch Mark as Unpaid */}
              <button
                type="button"
                onClick={handleBatchMarkUnpaid}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors"
                title="Reset selected invoices to Unpaid"
              >
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Mark Unpaid</span>
              </button>

              {/* Batch Export Selected to JSON */}
              <button
                type="button"
                onClick={handleBatchExportSelectedJSON}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors"
                title="Export selected invoices to JSON Backup"
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                <span>Export JSON ({selectedStats.count})</span>
              </button>

              {/* Batch Export Selected to CSV */}
              <button
                type="button"
                onClick={handleBatchExportSelectedCsv}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors"
                title="Export selected invoices to CSV"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              {/* Batch Delete */}
              <button
                type="button"
                onClick={handleBatchDeleteInvoices}
                className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-rose-500/40 transition-colors"
                title="Delete Selected Invoices"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete ({selectedStats.count})</span>
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

      {/* Invoices Ledger Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
                    }}
                    onChange={handleSelectAllFiltered}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Invoice # & Date</th>
                <th className="p-3.5">Billed To (Party)</th>
                <th className="p-3.5">LRs & Route</th>
                <th className="p-3.5 text-right">Taxable Freight</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 text-sm">No freight invoices found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery || statusFilter !== 'All'
                        ? 'Try clearing search filters to see all invoices.'
                        : 'Click "Generate Bill / Invoice" to create your first GST freight invoice!'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInvoice(null);
                        setIsBuilderOpen(true);
                      }}
                      className="mt-4 px-4 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs inline-flex items-center space-x-1.5 shadow-xs"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Bill</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const percentPaid = inv.grandTotal > 0 ? Math.min(100, Math.round(((inv.amountPaid || 0) / inv.grandTotal) * 100)) : 100;
                  const isSelected = selectedInvoiceIds.includes(inv.id);

                  return (
                    <tr 
                      key={inv.id} 
                      className={`transition-colors ${
                        isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50/90' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="p-3.5 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(inv.id, e as any)}
                          className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Invoice # & Date */}
                      <td className="p-3.5">
                        <div className="font-black font-mono text-slate-950 text-xs flex items-center space-x-1.5">
                          <FileText className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{inv.invoiceNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {inv.invoiceDate}
                        </div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">
                          Due: {inv.dueDate}
                        </span>
                      </td>

                      {/* Billed To Party */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-950 text-xs line-clamp-1">
                          {inv.billedTo.partyName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <span>{inv.billedTo.city || inv.billedTo.state}</span>
                          {inv.billedTo.gstin && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-600 uppercase font-semibold">
                                {inv.billedTo.gstin}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* LRs & Route */}
                      <td className="p-3.5 text-slate-700">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {inv.items.length} LR(s) • {inv.totalWeight} MT
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {inv.items[0]?.origin} ➔ {inv.items[0]?.destination}
                          {inv.items.length > 1 && ` (+${inv.items.length - 1} more)`}
                        </div>
                      </td>

                      {/* Taxable Freight */}
                      <td className="p-3.5 text-right font-mono">
                        <div className="font-bold text-slate-900">{formatCurrency(inv.taxableAmount)}</div>
                        <div className="text-[10px] text-slate-500">
                          {inv.isRcm ? '5% RCM' : `${inv.gstRate}% GST`}
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="p-3.5 text-right font-mono">
                        <div className="font-black text-slate-950 text-sm">
                          {formatCurrency(inv.grandTotal)}
                        </div>
                        {inv.balanceDue > 0 && inv.balanceDue !== inv.grandTotal && (
                          <div className="text-[10px] text-rose-700 font-bold">
                            Due: {formatCurrency(inv.balanceDue)}
                          </div>
                        )}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            inv.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : inv.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {inv.paymentStatus === 'Paid' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{inv.paymentStatus}</span>
                        </span>

                        {/* Mini Payment Progress Bar */}
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full mx-auto mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              inv.paymentStatus === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Print / View PDF Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-lg transition-colors"
                            title="Print / View PDF Invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* Record Payment Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInvoice(inv);
                              setIsBuilderOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-900 rounded-lg transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete Invoice"
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
      </div>

      {/* INVOICE BUILDER MODAL */}
      <InvoiceBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingInvoice(null);
        }}
        onSave={handleSaveInvoice}
        editingInvoice={editingInvoice}
        allDispatches={dispatches}
      />

      {/* PRINT / PDF MODAL */}
      <InvoicePrintModal
        invoice={selectedInvoiceForPrint}
        onClose={() => setSelectedInvoiceForPrint(null)}
        onUpdateInvoiceCustomization={(updatedCustomization) => {
          if (!selectedInvoiceForPrint) return;
          const updatedInv: FreightInvoice = {
            ...selectedInvoiceForPrint,
            customization: updatedCustomization,
            updatedAt: new Date().toISOString(),
          };
          saveInvoice(updatedInv);
          refreshInvoices();
          setSelectedInvoiceForPrint(updatedInv);
        }}
      />

      {/* RECORD PAYMENT & RECONCILIATION MODAL */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[94vh] flex flex-col my-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-black text-slate-950 text-base">
                    Record Payment: {paymentInvoice.invoiceNumber}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Full / Partial payment, TDS deduction u/s 194C, and next-bill reconciliation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 text-xs">
              {/* Invoice Summary Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Party Name</span>
                  <strong className="text-slate-900 line-clamp-1">{paymentInvoice.billedTo.partyName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Invoice Grand Total</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(paymentInvoice.grandTotal)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Already Credited</span>
                  <span className="font-mono text-emerald-700 font-bold">{formatCurrency(paymentInvoice.amountPaid || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Balance Due</span>
                  <span className="font-mono text-rose-700 font-black text-sm">
                    {formatCurrency(Math.max(0, paymentInvoice.grandTotal - (paymentInvoice.amountPaid || 0)))}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                {/* Full vs Partial vs Excess Settlement Selector */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <span className="font-black text-emerald-950 block text-[11px] uppercase tracking-wider">
                    Payment Type:
                  </span>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTypeOption('Full');
                        const due = Math.max(0, paymentInvoice.grandTotal - (paymentInvoice.amountPaid || 0));
                        setPaymentAmount(due);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        paymentTypeOption === 'Full'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-emerald-300 hover:bg-emerald-100/50'
                      }`}
                    >
                      Full Payment ({formatCurrency(Math.max(0, paymentInvoice.grandTotal - (paymentInvoice.amountPaid || 0)))})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTypeOption('Partial')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        paymentTypeOption === 'Partial'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-emerald-300 hover:bg-emerald-100/50'
                      }`}
                    >
                      Partial Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTypeOption('Settlement / Excess Adjustment')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        paymentTypeOption === 'Settlement / Excess Adjustment'
                          ? 'bg-purple-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      Excess / Settle Next Bills
                    </button>
                  </div>
                </div>

                {/* Amount Received, Date & Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank / Cash Received (₹) *</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-black text-slate-950 focus:ring-2 focus:ring-[#00E676]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode *</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="Bank Transfer / NEFT / RTGS">Bank Transfer (NEFT/RTGS)</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI / Digital</option>
                      <option value="Cash">Cash</option>
                      <option value="Settlement / Bill Reconciliation">Bill Reconciliation Credit</option>
                    </select>
                  </div>
                </div>

                {/* TDS Calculator Section */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-amber-950 text-[11px] uppercase tracking-wider">
                      TDS Deduction u/s 194C (Goods Transport Agency):
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentTdsOption('NONE');
                          setPaymentTdsAmount(0);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          paymentTdsOption === 'NONE' ? 'bg-amber-700 text-white' : 'bg-white text-slate-700 border border-amber-300'
                        }`}
                      >
                        No TDS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentTdsOption('194C_1');
                          // 1% on taxable freight or grand total
                          const calc = Math.round((paymentInvoice.taxableAmount || paymentInvoice.grandTotal) * 0.01);
                          setPaymentTdsAmount(calc);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          paymentTdsOption === '194C_1' ? 'bg-amber-700 text-white' : 'bg-white text-slate-700 border border-amber-300'
                        }`}
                      >
                        1% (Individual/HUF)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentTdsOption('194C_2');
                          // 2% on taxable freight or grand total
                          const calc = Math.round((paymentInvoice.taxableAmount || paymentInvoice.grandTotal) * 0.02);
                          setPaymentTdsAmount(calc);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          paymentTdsOption === '194C_2' ? 'bg-amber-700 text-white' : 'bg-white text-slate-700 border border-amber-300'
                        }`}
                      >
                        2% (Company/Firm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentTdsOption('CUSTOM')}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          paymentTdsOption === 'CUSTOM' ? 'bg-amber-700 text-white' : 'bg-white text-slate-700 border border-amber-300'
                        }`}
                      >
                        Custom ₹
                      </button>
                    </div>
                  </div>

                  {paymentTdsOption !== 'NONE' && (
                    <div className="flex items-center space-x-3 pt-1">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">TDS Amount Credited (₹):</label>
                        <input
                          type="number"
                          min="0"
                          value={paymentTdsAmount || ''}
                          onChange={(e) => setPaymentTdsAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-950"
                        />
                      </div>
                      <span className="text-[10px] text-amber-800 self-end pb-1.5">
                        TDS Certificate is credited against invoice total.
                      </span>
                    </div>
                  )}
                </div>

                {/* Deductions / Shortage / Rebate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deduction / Rebate / Shortage (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={paymentDeductionAmount || ''}
                      onChange={(e) => setPaymentDeductionAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deduction Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Shortage weight penalty / Detention deduction"
                      value={paymentDeductionReason}
                      onChange={(e) => setPaymentDeductionReason(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Ref & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reference / UTR / Cheque No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-HDFC-99182348"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Settled after TDS deduction"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Real-time Calculation Summary Banner */}
                {(() => {
                  const currentBal = Math.max(0, paymentInvoice.grandTotal - (paymentInvoice.amountPaid || 0));
                  const totalCredit = (paymentAmount || 0) + (paymentTdsAmount || 0) + (paymentDeductionAmount || 0);
                  const appliedToThis = Math.min(currentBal, totalCredit);
                  const excess = Math.max(0, totalCredit - currentBal);
                  const remainingDue = Math.max(0, currentBal - appliedToThis);

                  // Other pending bills for same party
                  const otherPendingBills = invoices.filter((i) => {
                    const isSameParty = (i.billedTo?.partyName || '').toLowerCase() === (paymentInvoice.billedTo?.partyName || '').toLowerCase();
                    const isNotThis = i.id !== paymentInvoice.id;
                    const hasDue = (i.balanceDue || (i.grandTotal - (i.amountPaid || 0))) > 0;
                    return isSameParty && isNotThis && hasDue;
                  });

                  return (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Total Credit Generated</span>
                          <span className="font-mono font-black text-sm text-[#00E676]">
                            ₹{totalCredit.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Applied to this Bill</span>
                          <span className="font-mono font-bold text-white">
                            ₹{appliedToThis.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Remaining Due on Bill</span>
                          <span className={`font-mono font-bold ${remainingDue === 0 ? 'text-[#00E676]' : 'text-amber-400'}`}>
                            {remainingDue === 0 ? '✓ Paid in Full' : `₹${remainingDue.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                        {excess > 0 && (
                          <div className="bg-purple-900/80 px-2.5 py-1 rounded-lg border border-purple-400">
                            <span className="text-purple-200 block text-[9px] uppercase font-black">Excess Credit</span>
                            <span className="font-mono font-black text-xs text-purple-300">
                              ₹{excess.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Next Bills Settlement Drawer (If excess or user wants to allocate) */}
                      {otherPendingBills.length > 0 && (excess > 0 || paymentTypeOption === 'Settlement / Excess Adjustment') && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <RefreshCw className="h-4 w-4 text-purple-700" />
                              <span className="font-bold text-purple-950 text-xs">
                                Settle Excess against Next Pending Bills for {paymentInvoice.billedTo.partyName}:
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-purple-700">
                              {otherPendingBills.length} other pending bill(s)
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {otherPendingBills.map((nextInv) => {
                              const nextBal = nextInv.balanceDue || (nextInv.grandTotal - (nextInv.amountPaid || 0));
                              const currentAlloc = paymentNextBillsAllocations[nextInv.id] || 0;

                              return (
                                <div key={nextInv.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-purple-200 text-xs">
                                  <div>
                                    <span className="font-mono font-bold text-slate-900">{nextInv.invoiceNumber}</span>
                                    <span className="text-[10px] text-slate-500 ml-2">({nextInv.invoiceDate})</span>
                                    <span className="text-[10px] text-rose-700 font-bold ml-2">Due: ₹{nextBal.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const fillAmt = Math.min(nextBal, excess);
                                        setPaymentNextBillsAllocations({ ...paymentNextBillsAllocations, [nextInv.id]: fillAmt });
                                      }}
                                      className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded text-[10px] font-bold"
                                    >
                                      Apply
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max={nextBal}
                                      value={currentAlloc || ''}
                                      onChange={(e) => {
                                        const val = Math.min(nextBal, parseFloat(e.target.value) || 0);
                                        setPaymentNextBillsAllocations({ ...paymentNextBillsAllocations, [nextInv.id]: val });
                                      }}
                                      placeholder="₹ Allocate"
                                      className="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Existing Payment Installments History for this invoice */}
                {Array.isArray(paymentInvoice.payments) && paymentInvoice.payments.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700 flex justify-between">
                      <span>Recorded Payment History ({paymentInvoice.payments.length} installments)</span>
                      <span>Total: ₹{(paymentInvoice.amountPaid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                      {paymentInvoice.payments.map((p) => (
                        <div key={p.id} className="p-2 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                          <div>
                            <span className="font-mono text-slate-600 font-medium">{p.paymentDate}</span>
                            <span className="mx-1.5 text-slate-300">•</span>
                            <span className="font-bold text-slate-900">{p.paymentMode}</span>
                            {p.referenceNumber && <span className="font-mono text-slate-500 ml-1.5">({p.referenceNumber})</span>}
                            {p.tdsDeducted ? <span className="text-amber-700 font-bold ml-1.5">TDS: ₹{p.tdsDeducted}</span> : null}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</span>
                            <button
                              type="button"
                              onClick={() => handleVoidPaymentRecord(paymentInvoice.id, p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Void payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-2 flex justify-end space-x-2 border-t">
                  <button
                    type="button"
                    onClick={() => setPaymentInvoice(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Payment & Update Ledgers</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BILLER PROFILE / ISSUER SETTINGS MODAL */}
      {isBillerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col my-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-indigo-700" />
                <div>
                  <h4 className="font-black text-slate-950 text-base">
                    Transport Agency / Issuer Billing Profile
                  </h4>
                  <p className="text-xs text-slate-500">Configure default company branding, logo, GSTIN and bank coordinates.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBillerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillerProfile} className="space-y-4 overflow-y-auto text-xs pr-1">
              {/* Autofill from Master Billing Parties */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                  <span className="font-bold text-emerald-950 text-xs">Autofill from Master Parties:</span>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const partyId = e.target.value;
                    if (!partyId) return;
                    const allParties = getMasters().parties;
                    const found = allParties.find((p) => p.id === partyId || p.name === partyId);
                    if (found) {
                      setBillerProfile({
                        companyName: found.name,
                        tagline: found.tagline || billerProfile.tagline || '',
                        logoUrl: found.logoUrl || billerProfile.logoUrl || '',
                        cinNumber: found.cinNumber || billerProfile.cinNumber || '',
                        gstin: found.gstin || billerProfile.gstin || '',
                        panNumber: found.panNumber || billerProfile.panNumber || '',
                        address: found.address || billerProfile.address || '',
                        city: found.city || billerProfile.city || '',
                        state: found.state || billerProfile.state || 'Maharashtra',
                        pincode: found.pincode || billerProfile.pincode || '',
                        phone: found.phone || billerProfile.phone || '',
                        email: found.email || billerProfile.email || '',
                        website: found.website || billerProfile.website || '',
                        bankName: found.bankName || billerProfile.bankName || '',
                        bankAccountNumber: found.bankAccountNumber || billerProfile.bankAccountNumber || '',
                        bankIfsc: found.bankIfsc || billerProfile.bankIfsc || '',
                        bankBranch: found.bankBranch || billerProfile.bankBranch || '',
                        accountHolderName: found.accountHolderName || found.name,
                        upiId: found.upiId || billerProfile.upiId || '',
                      });
                    }
                  }}
                  className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Select Master Billing Party --</option>
                  {getBillingParties().map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name} ({bp.city}) {bp.type === 'Billing Party (Issuer)' ? '★ Billing Party' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logo Upload & Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  <span>Company Logo (Printed on all Invoices & Bills)</span>
                </span>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {billerProfile.logoUrl ? (
                      <div className="relative group">
                        <img
                          src={billerProfile.logoUrl}
                          alt="Logo Preview"
                          className="h-14 w-14 object-contain rounded-lg border border-slate-300 bg-white p-1 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setBillerProfile({ ...billerProfile, logoUrl: '' })}
                          className="absolute -top-1 -right-1 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-xs"
                          title="Remove Logo"
                        >
                          <X className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="h-5 w-5 text-slate-300" />
                        <span className="text-[7px] font-bold mt-0.5">No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors">
                        <Upload className="h-3.5 w-3.5 text-[#00E676]" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              if (dataUrl) setBillerProfile({ ...billerProfile, logoUrl: dataUrl });
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-500">PNG, JPG, SVG or WebP</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste image URL (https://...)"
                      value={billerProfile.logoUrl || ''}
                      onChange={(e) => setBillerProfile({ ...billerProfile, logoUrl: e.target.value })}
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Transporter Name *</label>
                <input
                  type="text"
                  required
                  value={billerProfile.companyName}
                  onChange={(e) => setBillerProfile({ ...billerProfile, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tagline / Slogan</label>
                  <input
                    type="text"
                    placeholder="e.g. Reliable Road Logistics Across India"
                    value={billerProfile.tagline || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, tagline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CIN / MSME / Reg No</label>
                  <input
                    type="text"
                    placeholder="e.g. U63090MH2021PTC368920"
                    value={billerProfile.cinNumber || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, cinNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company GSTIN</label>
                  <input
                    type="text"
                    value={billerProfile.gstin || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company PAN</label>
                  <input
                    type="text"
                    value={billerProfile.panNumber || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered Address</label>
                <input
                  type="text"
                  value={billerProfile.address || ''}
                  onChange={(e) => setBillerProfile({ ...billerProfile, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={billerProfile.city || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={billerProfile.state || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={billerProfile.pincode || ''}
                    onChange={(e) => setBillerProfile({ ...billerProfile, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <span className="font-black text-slate-900 block text-xs">Bank Coordinates for Invoices</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      value={billerProfile.bankName || ''}
                      onChange={(e) => setBillerProfile({ ...billerProfile, bankName: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Number</label>
                    <input
                      type="text"
                      value={billerProfile.bankAccountNumber || ''}
                      onChange={(e) => setBillerProfile({ ...billerProfile, bankAccountNumber: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">IFSC Code</label>
                    <input
                      type="text"
                      value={billerProfile.bankIfsc || ''}
                      onChange={(e) => setBillerProfile({ ...billerProfile, bankIfsc: e.target.value.toUpperCase() })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">UPI ID (for QR Code)</label>
                    <input
                      type="text"
                      value={billerProfile.upiId || ''}
                      onChange={(e) => setBillerProfile({ ...billerProfile, upiId: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBillerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL 100% INVOICE CUSTOMIZER MODAL */}
      {isCustomizerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
                  <Palette className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-black text-white text-base tracking-tight">
                    Global Freight Invoice Styler & Templates
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    Configure default layouts, fonts, brand colors, QR codes, and terms presets for all future invoices.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomizerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <InvoiceCustomizerPanel
                customization={globalCustomization}
                onChange={(updated) => {
                  setGlobalCustomization(updated);
                  saveStoredInvoiceCustomization(updated);
                }}
                onSaveAsDefault={() => {
                  saveStoredInvoiceCustomization(globalCustomization);
                  showNotification('Default Invoice Styling & Formatting updated successfully!', 'success');
                  setIsCustomizerModalOpen(false);
                }}
                onResetToDefault={() => {
                  setGlobalCustomization(getStoredInvoiceCustomization());
                  showNotification('Reset to factory defaults.', 'info');
                }}
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCustomizerModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  saveStoredInvoiceCustomization(globalCustomization);
                  showNotification('Default Invoice Styling & Formatting saved!', 'success');
                  setIsCustomizerModalOpen(false);
                }}
                className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs shadow-xs border border-emerald-400 cursor-pointer"
              >
                Save as Default
              </button>
            </div>
          </div>
        </div>
      )}
      {/* INVOICES RESTORE MODAL (Overwrite vs Merge) */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
                  <Upload className="h-5 w-5 text-emerald-800" />
                </span>
                <div>
                  <h4 className="font-black text-slate-950 text-base">
                    Restore Invoices from JSON Backup
                  </h4>
                  <p className="text-xs text-slate-500">Restore or merge previous freight bills and ledger records.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRestorePreview(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1">
              {restorePreview && (
                <>
                  {/* Backup Stats Summary Card */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <span className="font-bold text-emerald-950 text-xs block">
                      Backup File Content Verified
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-500">Total Invoices: </span>
                        <strong className="font-mono text-slate-950 text-sm">{restorePreview.totalInvoices}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Turnover: </span>
                        <strong className="font-mono text-emerald-900 text-sm">{formatCurrency(restorePreview.totalTurnover)}</strong>
                      </div>
                      {restorePreview.billerName && (
                        <div className="col-span-2 text-[11px] text-slate-600">
                          Issuer Entity: <strong className="text-slate-900">{restorePreview.billerName}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restore Strategy Mode Selector */}
                  <div className="space-y-2.5">
                    <label className="block font-black text-slate-900 text-xs">
                      Choose Restore Strategy:
                    </label>

                    {/* OVERWRITE MODE */}
                    <div
                      onClick={() => setRestoreMode('overwrite')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        restoreMode === 'overwrite'
                          ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="inv_restore_mode"
                            checked={restoreMode === 'overwrite'}
                            onChange={() => setRestoreMode('overwrite')}
                            className="text-rose-600 focus:ring-rose-500 h-4 w-4"
                          />
                          <strong className="text-slate-950 font-black text-xs">
                            Clean Overwrite (Replace All Current Invoices)
                          </strong>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-rose-200 text-rose-950">
                          Replaces Database
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium pl-6 mt-1">
                        Wipes existing invoices in the ledger and replaces them completely with the backup records.
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
                            name="inv_restore_mode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-emerald-600 focus:ring-[#00E676] h-4 w-4"
                          />
                          <strong className="text-slate-950 font-black text-xs">
                            Safe Merge & Update Existing Invoices
                          </strong>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium pl-6 mt-1">
                        Preserves current ledger, updates existing bills with matching invoice numbers, and appends new bills.
                      </p>
                    </div>
                  </div>

                  {restoreError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end space-x-3 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRestoreModalOpen(false);
                        setRestorePreview(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      className={`px-5 py-2 rounded-xl font-black text-xs sm:text-sm shadow-xs border transition-all cursor-pointer ${
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
