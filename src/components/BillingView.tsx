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
  saveBillerProfile 
} from '../lib/invoiceService';
import { formatCurrency, generateSafeId } from '../lib/calculations';
import { InvoicePrintModal } from './InvoicePrintModal';
import { InvoiceBuilderModal } from './InvoiceBuilderModal';
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
  ChevronRight
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

  // Modals State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<FreightInvoice | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<FreightInvoice | null>(null);

  // Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<FreightInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer / NEFT / RTGS');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Biller Profile Settings Modal
  const [isBillerModalOpen, setIsBillerModalOpen] = useState(false);
  const [billerProfile, setBillerProfile] = useState<BillerCompanyInfo>(() => getBillerProfile());

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
    setPaymentAmount(remaining);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('Bank Transfer / NEFT / RTGS');
    setPaymentRef('');
    setPaymentNotes('');
  };

  // Submit Payment Record
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    const newPaymentRecord = {
      id: generateSafeId('pmt'),
      amount: paymentAmount,
      paymentDate,
      paymentMode,
      referenceNumber: paymentRef.trim(),
      notes: paymentNotes.trim(),
      recordedAt: new Date().toISOString(),
    };

    const newAmountPaid = (paymentInvoice.amountPaid || 0) + paymentAmount;
    const newBalanceDue = Math.max(0, paymentInvoice.grandTotal - newAmountPaid);
    
    let newStatus: PaymentStatus = 'Partially Paid';
    if (newBalanceDue === 0 || newAmountPaid >= paymentInvoice.grandTotal) {
      newStatus = 'Paid';
    } else if (newAmountPaid === 0) {
      newStatus = 'Unpaid';
    }

    const updatedInv: FreightInvoice = {
      ...paymentInvoice,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      paymentStatus: newStatus,
      payments: [...(paymentInvoice.payments || []), newPaymentRecord],
      updatedAt: new Date().toISOString(),
    };

    saveInvoice(updatedInv);
    refreshInvoices();
    setPaymentInvoice(null);
    showNotification(`Payment of ${formatCurrency(paymentAmount)} recorded for ${paymentInvoice.invoiceNumber}! Status: ${newStatus}`, 'success');
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
          {/* Company Profile Settings Button */}
          <button
            type="button"
            onClick={() => setIsBillerModalOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Building2 className="h-4 w-4 text-slate-700" />
            <span>Issuer / Company Info</span>
          </button>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportInvoicesCsv}
            disabled={invoices.length === 0}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-40"
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
            className="px-4 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs border border-emerald-400 transition-all"
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

      {/* Invoices Ledger Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
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
                  <td colSpan={7} className="p-12 text-center text-slate-500">
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

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
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
      />

      {/* RECORD PAYMENT MODAL */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-300 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <CreditCard className="h-5 w-5" />
                </span>
                <h4 className="font-black text-slate-950 text-sm">
                  Record Payment: {paymentInvoice.invoiceNumber}
                </h4>
              </div>
              <button
                onClick={() => setPaymentInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Party:</span>
                <strong className="text-slate-900">{paymentInvoice.billedTo.partyName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Total:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(paymentInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-mono text-emerald-700 font-bold">{formatCurrency(paymentInvoice.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-slate-900">Current Balance Due:</span>
                <span className="font-mono text-rose-700 font-black">
                  {formatCurrency(Math.max(0, paymentInvoice.grandTotal - (paymentInvoice.amountPaid || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-black text-slate-950 focus:ring-2 focus:ring-[#00E676]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  </select>
                </div>
              </div>

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

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl shadow-xs"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILLER COMPANY SETTINGS MODAL */}
      {isBillerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-300 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-indigo-700" />
                <h4 className="font-black text-slate-950 text-base">
                  Transport Agency / Issuer Billing Profile
                </h4>
              </div>
              <button
                onClick={() => setIsBillerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillerProfile} className="space-y-3 overflow-y-auto text-xs">
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
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">UPI ID (Optional)</label>
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
