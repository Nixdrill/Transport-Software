import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Truck, 
  Receipt, 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Search, 
  Layers, 
  CreditCard, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  X,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { FreightInvoice, PaymentMode } from '../types/invoice';
import { getInvoices, getBillerProfile } from '../lib/invoiceService';
import { getMasters } from '../lib/mastersService';
import { getLocalDispatches } from '../lib/syncManager';
import { 
  getPartyLedger, 
  getTransporterLedger, 
  getMisFinancialSummary, 
  allocateLumpSumPaymentAcrossPartyInvoices,
  PartyLedgerSummary,
  TransporterLedgerSummary,
  MisFinancialSummary,
  LedgerEntry 
} from '../lib/ledgerService';

interface MisAndLedgersViewProps {
  onOpenInvoicePrint?: (invoice: FreightInvoice) => void;
  onNavigateToBilling?: () => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MisAndLedgersView: React.FC<MisAndLedgersViewProps> = ({
  onOpenInvoicePrint,
  onNavigateToBilling,
  showNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'party_ledger' | 'transporter_ledger' | 'transactions_journal' | 'mis_analytics' | 'reconciliation'>('party_ledger');

  // Common Filters
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom'>('this_fy');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Party Ledger State
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [partySearchQuery, setPartySearchQuery] = useState<string>('');

  // Transporter Ledger State
  const [selectedTransporter, setSelectedTransporter] = useState<string>('');

  // Master Journal Filters
  const [journalTypeFilter, setJournalTypeFilter] = useState<string>('ALL');
  const [journalSearchQuery, setJournalSearchQuery] = useState<string>('');

  // Multi-Bill Lump Sum Reconciliation State
  const [reconParty, setReconParty] = useState<string>('');
  const [reconTotalAmount, setReconTotalAmount] = useState<number>(0);
  const [reconTdsAmount, setReconTdsAmount] = useState<number>(0);
  const [reconDeductionAmount, setReconDeductionAmount] = useState<number>(0);
  const [reconDeductionReason, setReconDeductionReason] = useState<string>('');
  const [reconPaymentDate, setReconPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reconPaymentMode, setReconPaymentMode] = useState<PaymentMode>('Bank Transfer / NEFT / RTGS');
  const [reconRefNumber, setReconRefNumber] = useState<string>('');
  const [reconNotes, setReconNotes] = useState<string>('');
  const [reconCustomAllocations, setReconCustomAllocations] = useState<Record<string, number>>({});
  const [isReconFifo, setIsReconFifo] = useState<boolean>(true);

  // Statement Print Preview Modal
  const [isStatementPrintOpen, setIsStatementPrintOpen] = useState<boolean>(false);

  // All Invoices & Masters
  const invoices = useMemo(() => getInvoices(), [activeSubTab]);
  const masters = useMemo(() => getMasters(), []);
  const billerProfile = useMemo(() => getBillerProfile(), []);

  // Compute Active Date Range Strings
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    if (dateFilterMode === 'all') {
      return { startDate: undefined, endDate: undefined, label: 'All Time' };
    }
    if (dateFilterMode === 'this_month') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end, label: 'This Month' };
    }
    if (dateFilterMode === 'last_month') {
      const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end, label: 'Last Month' };
    }
    if (dateFilterMode === 'this_quarter') {
      const qMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qMonth, 1).toISOString().split('T')[0];
      const end = new Date(year, qMonth + 3, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end, label: 'This Quarter' };
    }
    if (dateFilterMode === 'this_fy') {
      // Indian Financial Year: April 1 to March 31
      const fyStartYear = month >= 3 ? year : year - 1;
      const start = `${fyStartYear}-04-01`;
      const end = `${fyStartYear + 1}-03-31`;
      return { startDate: start, endDate: end, label: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}` };
    }
    if (dateFilterMode === 'custom') {
      return { 
        startDate: customStartDate || undefined, 
        endDate: customEndDate || undefined, 
        label: 'Custom Range' 
      };
    }
    return { startDate: undefined, endDate: undefined, label: 'All Time' };
  }, [dateFilterMode, customStartDate, customEndDate]);

  // List of distinct parties from Invoices and Master Parties
  const distinctParties = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.billedTo?.partyName) set.add(inv.billedTo.partyName.trim());
    });
    masters.parties.forEach((p) => {
      if (p.name) set.add(p.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [invoices, masters.parties]);

  // List of distinct transporters
  const distinctTransporters = useMemo(() => {
    const dispatches = getLocalDispatches();
    const set = new Set<string>();
    dispatches.forEach((d) => {
      if (d.transporterName) set.add(d.transporterName.trim());
    });
    masters.transporters.forEach((t) => {
      if (t.name) set.add(t.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masters.transporters]);

  // Set default selected party if none selected
  const activePartyName = selectedParty || distinctParties[0] || '';
  const activeTransporterName = selectedTransporter || distinctTransporters[0] || '';

  // 1. Party Ledger Calculation
  const partyLedger: PartyLedgerSummary = useMemo(() => {
    if (!activePartyName) {
      return {
        partyName: '',
        openingBalance: 0,
        totalDebits: 0,
        totalCredits: 0,
        totalTdsDeducted: 0,
        totalOtherDeductions: 0,
        totalCashBankReceived: 0,
        closingBalance: 0,
        totalInvoicesCount: 0,
        unpaidInvoicesCount: 0,
        entries: [],
      };
    }
    return getPartyLedger(activePartyName, {
      startDate: activeDateRange.startDate,
      endDate: activeDateRange.endDate,
    });
  }, [activePartyName, activeDateRange, invoices]);

  // 2. Transporter Ledger Calculation
  const transporterLedger: TransporterLedgerSummary = useMemo(() => {
    if (!activeTransporterName) {
      return {
        transporterName: '',
        totalTrips: 0,
        totalWeight: 0,
        totalGrossFreight: 0,
        totalAdvancePaid: 0,
        totalCommission: 0,
        totalOtherDeductions: 0,
        totalNetPayable: 0,
        trips: [],
      };
    }
    return getTransporterLedger(activeTransporterName, {
      startDate: activeDateRange.startDate,
      endDate: activeDateRange.endDate,
    });
  }, [activeTransporterName, activeDateRange]);

  // 3. MIS Analytics Summary
  const misSummary: MisFinancialSummary = useMemo(() => {
    return getMisFinancialSummary({
      startDate: activeDateRange.startDate,
      endDate: activeDateRange.endDate,
    });
  }, [activeDateRange, invoices]);

  // 4. Unified Transactions Journal
  const masterJournalEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      category: 'INVOICE' | 'PAYMENT' | 'TDS' | 'DEDUCTION' | 'RECONCILIATION';
      voucherNo: string;
      partyName: string;
      description: string;
      refNo?: string;
      paymentMode?: string;
      debit: number;
      credit: number;
      rawInvoice?: FreightInvoice;
    }> = [];

    for (const inv of invoices) {
      const invDate = inv.invoiceDate;
      const invTime = new Date(invDate).getTime();
      if (activeDateRange.startDate && invTime < new Date(activeDateRange.startDate).getTime()) continue;
      if (activeDateRange.endDate && invTime > new Date(activeDateRange.endDate + 'T23:59:59').getTime()) continue;

      const pName = inv.billedTo?.partyName || 'Party';

      // Invoice entry
      list.push({
        id: `inv-${inv.id}`,
        date: inv.invoiceDate,
        category: 'INVOICE',
        voucherNo: inv.invoiceNumber,
        partyName: pName,
        description: `Billed: ${inv.serviceDescription || 'Consolidated Freight'} (${inv.items.length} LRs)`,
        refNo: inv.sacCode || '996511',
        debit: inv.grandTotal || 0,
        credit: 0,
        rawInvoice: inv,
      });

      // Payments entries
      if (Array.isArray(inv.payments)) {
        for (const pmt of inv.payments) {
          const pmtDate = pmt.paymentDate;
          const pmtTime = new Date(pmtDate).getTime();
          if (activeDateRange.startDate && pmtTime < new Date(activeDateRange.startDate).getTime()) continue;
          if (activeDateRange.endDate && pmtTime > new Date(activeDateRange.endDate + 'T23:59:59').getTime()) continue;

          const isSettlement = pmt.paymentMode === 'Settlement / Bill Reconciliation';

          if (pmt.amount > 0) {
            list.push({
              id: `pmt-${pmt.id}`,
              date: pmt.paymentDate,
              category: isSettlement ? 'RECONCILIATION' : 'PAYMENT',
              voucherNo: pmt.referenceNumber || `RCPT-${inv.invoiceNumber}`,
              partyName: pName,
              description: isSettlement
                ? `Reconciliation Credit from Bill #${pmt.sourceSettlementInvoiceNo || 'Excess'} on ${inv.invoiceNumber}`
                : `Payment received against ${inv.invoiceNumber} via ${pmt.paymentMode}`,
              refNo: pmt.referenceNumber,
              paymentMode: pmt.paymentMode,
              debit: 0,
              credit: pmt.amount,
              rawInvoice: inv,
            });
          }

          if (pmt.tdsDeducted && pmt.tdsDeducted > 0) {
            list.push({
              id: `tds-${pmt.id}`,
              date: pmt.paymentDate,
              category: 'TDS',
              voucherNo: `TDS-${inv.invoiceNumber}`,
              partyName: pName,
              description: `TDS Deduction u/s ${pmt.tdsSection || '194C'} on Bill #${inv.invoiceNumber}`,
              refNo: pmt.referenceNumber,
              debit: 0,
              credit: pmt.tdsDeducted,
              rawInvoice: inv,
            });
          }

          if (pmt.deductionAmount && pmt.deductionAmount > 0) {
            list.push({
              id: `ded-${pmt.id}`,
              date: pmt.paymentDate,
              category: 'DEDUCTION',
              voucherNo: `DN-${inv.invoiceNumber}`,
              partyName: pName,
              description: `Freight Deduction / Rebate on Bill #${inv.invoiceNumber}: ${pmt.deductionReason || 'Penalty'}`,
              refNo: pmt.referenceNumber,
              debit: 0,
              credit: pmt.deductionAmount,
              rawInvoice: inv,
            });
          }
        }
      }
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by type and query
    return list.filter((item) => {
      if (journalTypeFilter !== 'ALL' && item.category !== journalTypeFilter) return false;
      if (journalSearchQuery) {
        const q = journalSearchQuery.toLowerCase();
        return (
          item.voucherNo.toLowerCase().includes(q) ||
          item.partyName.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.refNo && item.refNo.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [invoices, activeDateRange, journalTypeFilter, journalSearchQuery]);

  // 5. Unpaid Invoices for Reconciliation
  const reconPartyPendingInvoices = useMemo(() => {
    if (!reconParty) return [];
    const target = reconParty.toLowerCase().trim();
    return invoices
      .filter((inv) => {
        const pName = (inv.billedTo?.partyName || '').toLowerCase().trim();
        const isParty = pName === target || pName.includes(target) || target.includes(pName);
        const hasBal = (inv.balanceDue || (inv.grandTotal - (inv.amountPaid || 0))) > 0;
        return isParty && hasBal;
      })
      .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
  }, [reconParty, invoices]);

  // Handle Multi-Bill Reconciliation Submit
  const handleExecuteReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconParty) {
      showNotification('Please select a party for reconciliation.', 'error');
      return;
    }
    const totalPool = reconTotalAmount + reconTdsAmount + reconDeductionAmount;
    if (totalPool <= 0) {
      showNotification('Please enter payment received amount or TDS/deductions.', 'error');
      return;
    }

    let customAllocArray: Array<{ invoiceId: string; amount: number }> | undefined = undefined;

    if (!isReconFifo) {
      customAllocArray = Object.entries(reconCustomAllocations)
        .filter(([_, amt]) => amt > 0)
        .map(([invoiceId, amount]) => ({ invoiceId, amount }));

      if (customAllocArray.length === 0) {
        showNotification('Please allocate amount to at least one pending invoice.', 'error');
        return;
      }
    }

    try {
      const result = allocateLumpSumPaymentAcrossPartyInvoices({
        partyName: reconParty,
        totalReceived: reconTotalAmount,
        tdsDeducted: reconTdsAmount,
        deductionAmount: reconDeductionAmount,
        deductionReason: reconDeductionReason,
        paymentDate: reconPaymentDate,
        paymentMode: reconPaymentMode,
        referenceNumber: reconRefNumber,
        notes: reconNotes,
        customAllocations: customAllocArray,
      });

      showNotification(
        `Successfully reconciled and settled ₹${result.totalAllocated.toLocaleString('en-IN')} across ${result.settledInvoices.length} bill(s)!`,
        'success'
      );

      // Reset recon inputs
      setReconTotalAmount(0);
      setReconTdsAmount(0);
      setReconDeductionAmount(0);
      setReconDeductionReason('');
      setReconRefNumber('');
      setReconNotes('');
      setReconCustomAllocations({});
    } catch (err: any) {
      showNotification(err.message || 'Failed to execute reconciliation.', 'error');
    }
  };

  // Export Party Ledger to CSV
  const handleExportPartyLedgerCsv = () => {
    if (!partyLedger.entries || partyLedger.entries.length === 0) {
      showNotification('No ledger entries to export for this period.', 'error');
      return;
    }

    const headers = ['Date', 'Voucher Type', 'Voucher / Doc No', 'Particulars / LR Details', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)', 'Status'];
    const rows = partyLedger.entries.map((e) => [
      e.date,
      `"${e.voucherType.replace(/"/g, '""')}"`,
      `"${e.voucherNumber.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.runningBalance,
      e.status || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `"STATEMENT OF ACCOUNT / PARTY LEDGER - ${partyLedger.partyName.replace(/"/g, '""')}"`,
      `"Period: ${activeDateRange.label} (${activeDateRange.startDate || 'Start'} to ${activeDateRange.endDate || 'Present'})"`,
      `"Opening Balance: ₹${partyLedger.openingBalance} | Total Invoiced: ₹${partyLedger.totalDebits} | Total Received: ₹${partyLedger.totalCredits} | Closing Balance: ₹${partyLedger.closingBalance}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LogiTrack_Ledger_${partyLedger.partyName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Party Ledger CSV exported successfully!', 'success');
  };

  // Export Journal to CSV
  const handleExportJournalCsv = () => {
    const headers = ['Date', 'Category', 'Voucher No', 'Party Name', 'Description', 'Ref No', 'Payment Mode', 'Debit (₹)', 'Credit (₹)'];
    const rows = masterJournalEntries.map((e) => [
      e.date,
      e.category,
      `"${e.voucherNo.replace(/"/g, '""')}"`,
      `"${e.partyName.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${(e.refNo || '').replace(/"/g, '""')}"`,
      `"${(e.paymentMode || '').replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `"MASTER TRANSACTIONS JOURNAL STATEMENT"`,
      `"Export Date: ${new Date().toISOString()}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LogiTrack_Transactions_Journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Journal Statement exported successfully!', 'success');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-900 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="h-6 w-6 text-[#00E676]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-950">
                  MIS, Ledgers & Statement of Accounts
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Financial Suite
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Party Ledgers, Running Balances, Bill Reconciliation, Receivables Aging, and Master Journal.
              </p>
            </div>
          </div>

          {/* Global Date Filter Selector */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDateFilterMode('this_month')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  dateFilterMode === 'this_month' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('last_month')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  dateFilterMode === 'last_month' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('this_quarter')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  dateFilterMode === 'this_quarter' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Quarter
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('this_fy')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  dateFilterMode === 'this_fy' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Current FY
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  dateFilterMode === 'all' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('custom')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  dateFilterMode === 'custom' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom
              </button>
            </div>

            {dateFilterMode === 'custom' && (
              <div className="flex items-center space-x-1.5 text-xs bg-indigo-50 border border-indigo-200 p-1.5 rounded-xl">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-indigo-300 rounded-lg text-xs"
                />
                <span className="text-indigo-900 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-indigo-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex items-center space-x-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('party_ledger')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSubTab === 'party_ledger'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4 text-[#00E676]" />
            <span>Party Ledger (Statement of Account)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reconciliation')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSubTab === 'reconciliation'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="h-4 w-4 text-emerald-300" />
            <span>Lump-Sum Bill Reconciliation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('transporter_ledger')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSubTab === 'transporter_ledger'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Truck className="h-4 w-4 text-[#0096C7]" />
            <span>Transporter / Fleet Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('transactions_journal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSubTab === 'transactions_journal'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Receipt className="h-4 w-4 text-[#E65100]" />
            <span>Transactions Master Journal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mis_analytics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSubTab === 'mis_analytics'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-[#7C3AED]" />
            <span>MIS Financial Analytics & Aging</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: PARTY LEDGER (STATEMENT OF ACCOUNT) */}
      {/* ========================================================================= */}
      {activeSubTab === 'party_ledger' && (
        <div className="space-y-6">
          {/* Party Selector & Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Select Customer / Billed Party:
                </label>
                <div className="relative">
                  <select
                    value={activePartyName}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-950 text-sm focus:ring-2 focus:ring-[#00E676] cursor-pointer"
                  >
                    {distinctParties.length === 0 && <option value="">No parties found</option>}
                    {distinctParties.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportPartyLedgerCsv}
                disabled={partyLedger.entries.length === 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-200"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStatementPrintOpen(true)}
                disabled={partyLedger.entries.length === 0}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <Printer className="h-3.5 w-3.5 text-[#00E676]" />
                <span>Print Official Statement</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReconParty(activePartyName);
                  setActiveSubTab('reconciliation');
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-200" />
                <span>Reconcile Bills</span>
              </button>
            </div>
          </div>

          {/* Party Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opening Balance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Balance</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ₹{partyLedger.openingBalance.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Prior to {activeDateRange.startDate || 'start period'}
              </p>
            </div>

            {/* Total Invoiced (Debit) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Billed (Dr)</span>
                <ArrowUpRight className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-600">
                ₹{partyLedger.totalDebits.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {partyLedger.totalInvoicesCount} invoices raised in period
              </p>
            </div>

            {/* Total Paid & Deductions (Credit) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Received (Cr)</span>
                <ArrowDownLeft className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700">
                ₹{partyLedger.totalCredits.toLocaleString('en-IN')}
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                <span>Bank: ₹{partyLedger.totalCashBankReceived.toLocaleString('en-IN')}</span>
                <span>•</span>
                <span>TDS: ₹{partyLedger.totalTdsDeducted.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Net Closing Outstanding Balance */}
            <div className={`border rounded-2xl p-4 shadow-xs ${
              partyLedger.closingBalance > 0 
                ? 'bg-rose-50 border-rose-200' 
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider ${
                  partyLedger.closingBalance > 0 ? 'text-rose-900' : 'text-emerald-900'
                }`}>
                  Closing Net Balance
                </span>
                <Building2 className={`h-4 w-4 ${
                  partyLedger.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`} />
              </div>
              <div className={`mt-2 text-2xl font-black ${
                partyLedger.closingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                ₹{partyLedger.closingBalance.toLocaleString('en-IN')}
              </div>
              <p className={`text-[11px] font-bold mt-1 ${
                partyLedger.closingBalance > 0 ? 'text-rose-800' : 'text-emerald-800'
              }`}>
                {partyLedger.closingBalance > 0 
                  ? `Receivable Due (${partyLedger.unpaidInvoicesCount} unpaid bills)` 
                  : 'Account Clear / Advance Credit'}
              </p>
            </div>
          </div>

          {/* Running Balance Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Statement of Transactions & Running Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological record of invoices, direct payments, TDS deductions, and bill reconciliation credits.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {partyLedger.entries.length} Transaction(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Voucher Type</th>
                    <th className="py-3 px-4">Voucher / Doc No</th>
                    <th className="py-3 px-4">Particulars & Trip Info</th>
                    <th className="py-3 px-4 text-right">Debit / Billed (₹)</th>
                    <th className="py-3 px-4 text-right">Credit / Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Running Balance (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/70 font-bold text-slate-700">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {activeDateRange.startDate || 'Opening'}
                    </td>
                    <td className="py-2.5 px-4" colSpan={3}>
                      <span className="text-slate-600 italic">Opening Balance Brought Forward</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                      ₹{partyLedger.openingBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-400">-</td>
                  </tr>

                  {partyLedger.entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold">No transactions found for {activePartyName} in this date range.</p>
                      </td>
                    </tr>
                  ) : (
                    partyLedger.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {e.date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            e.type === 'INVOICE'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : e.type === 'PAYMENT'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : e.type === 'TDS_CREDIT'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : e.type === 'SETTLEMENT_CREDIT'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {e.voucherType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-950 whitespace-nowrap">
                          {e.voucherNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-md">
                          <p className="font-medium text-slate-900">{e.description}</p>
                          {e.lrNumbers && e.lrNumbers.length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              LR(s): {e.lrNumbers.slice(0, 4).join(', ')}{e.lrNumbers.length > 4 ? '...' : ''}
                              {e.vehicleNumbers && e.vehicleNumbers.length > 0 && ` • Veh: ${e.vehicleNumbers.slice(0, 2).join(', ')}`}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black whitespace-nowrap ${
                          e.runningBalance > 0 ? 'text-slate-900' : 'text-emerald-700'
                        }`}>
                          ₹{e.runningBalance.toLocaleString('en-IN')} {e.runningBalance > 0 ? 'Dr' : 'Cr'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {e.type === 'INVOICE' && e.rawInvoice ? (
                            <button
                              type="button"
                              onClick={() => onOpenInvoicePrint && onOpenInvoicePrint(e.rawInvoice!)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px] transition-colors"
                            >
                              View Invoice
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700">
                              {e.status || 'Settled'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MULTI-BILL LUMP-SUM RECONCILIATION WORKSPACE */}
      {/* ========================================================================= */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-[#00E676]" />
                <h3 className="text-lg font-black tracking-tight">
                  Multi-Bill Lump-Sum Payment Reconciliation & Next-Bill Allocation
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Receive a single bulk lump-sum payment (via NEFT / RTGS / Cheque) and automatically settle multiple pending invoices for a party chronologically (FIFO) or allocate specific amounts per invoice.
              </p>
            </div>
          </div>

          <form onSubmit={handleExecuteReconciliation} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Select Party */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Customer / Party *
                </label>
                <select
                  required
                  value={reconParty}
                  onChange={(e) => setReconParty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-950 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Party with Pending Invoices --</option>
                  {distinctParties.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Bank / Cash Received */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Bank / Cash Received (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={reconTotalAmount || ''}
                  onChange={(e) => setReconTotalAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 250000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-black text-slate-950 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Receipt Date *
                </label>
                <input
                  type="date"
                  required
                  value={reconPaymentDate}
                  onChange={(e) => setReconPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-950"
                />
              </div>
            </div>

            {/* TDS and Deductions Grid */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={reconPaymentMode}
                  onChange={(e) => setReconPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-950"
                >
                  <option value="Bank Transfer / NEFT / RTGS">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">UTR / Cheque Ref No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC-991823"
                  value={reconRefNumber}
                  onChange={(e) => setReconRefNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">TDS Deducted u/s 194C (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={reconTdsAmount || ''}
                  onChange={(e) => setReconTdsAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Other Deductions / Rebates (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={reconDeductionAmount || ''}
                  onChange={(e) => setReconDeductionAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            {/* Allocation Strategy: FIFO vs Manual */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Allocation Strategy:</span>
                <button
                  type="button"
                  onClick={() => setIsReconFifo(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isReconFifo 
                      ? 'bg-emerald-700 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Automatic FIFO (Oldest Bill First)
                </button>
                <button
                  type="button"
                  onClick={() => setIsReconFifo(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !isReconFifo 
                      ? 'bg-emerald-700 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Custom Selective Allocation
                </button>
              </div>

              <div className="text-xs font-bold text-slate-700">
                Total Credit Pool: <span className="text-emerald-700 font-mono font-black text-sm">₹{(reconTotalAmount + reconTdsAmount + reconDeductionAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Pending Invoices Table for this Party */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-700 flex justify-between items-center">
                <span>Pending Invoices for {reconParty || 'Selected Party'} ({reconPartyPendingInvoices.length} Unpaid / Partially Paid)</span>
                <span className="text-[11px] text-slate-500">
                  Total Outstanding: ₹{reconPartyPendingInvoices.reduce((s, i) => s + (i.balanceDue || (i.grandTotal - i.amountPaid)), 0).toLocaleString('en-IN')}
                </span>
              </div>

              {reconPartyPendingInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  {reconParty ? 'No unpaid or partially paid invoices found for this party!' : 'Please select a party above to view pending invoices.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4">Invoice #</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-right">Grand Total (₹)</th>
                        <th className="py-2.5 px-4 text-right">Already Paid (₹)</th>
                        <th className="py-2.5 px-4 text-right">Balance Due (₹)</th>
                        <th className="py-2.5 px-4 text-right">Allocated Payment (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reconPartyPendingInvoices.map((inv, idx) => {
                        const bal = inv.balanceDue || (inv.grandTotal - (inv.amountPaid || 0));
                        
                        // Compute preview allocation for FIFO
                        let previewAllocation = 0;
                        if (isReconFifo) {
                          let runningPool = reconTotalAmount + reconTdsAmount + reconDeductionAmount;
                          for (let i = 0; i < idx; i++) {
                            const prevBal = reconPartyPendingInvoices[i].balanceDue || (reconPartyPendingInvoices[i].grandTotal - (reconPartyPendingInvoices[i].amountPaid || 0));
                            runningPool = Math.max(0, runningPool - prevBal);
                          }
                          previewAllocation = Math.min(bal, runningPool);
                        } else {
                          previewAllocation = reconCustomAllocations[inv.id] || 0;
                        }

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{inv.invoiceDate}</td>
                            <td className="py-2.5 px-4 text-right font-mono">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-emerald-700">₹{(inv.amountPaid || 0).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">₹{bal.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-4 text-right">
                              {isReconFifo ? (
                                <span className={`font-mono font-black ${
                                  previewAllocation >= bal ? 'text-emerald-700' : previewAllocation > 0 ? 'text-amber-700' : 'text-slate-400'
                                }`}>
                                  ₹{previewAllocation.toLocaleString('en-IN')} {previewAllocation >= bal ? '✓ Full' : previewAllocation > 0 ? '(Partial)' : ''}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max={bal}
                                  value={reconCustomAllocations[inv.id] || ''}
                                  onChange={(e) => {
                                    const val = Math.min(bal, parseFloat(e.target.value) || 0);
                                    setReconCustomAllocations({ ...reconCustomAllocations, [inv.id]: val });
                                  }}
                                  placeholder="0"
                                  className="w-28 px-2 py-1 text-right bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="submit"
                disabled={reconPartyPendingInvoices.length === 0}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 text-[#00E676]" />
                <span>Execute Reconciliation & Settle Invoices</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: TRANSPORTER / FLEET LEDGER */}
      {/* ========================================================================= */}
      {activeSubTab === 'transporter_ledger' && (
        <div className="space-y-6">
          {/* Transporter Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Select Hired Fleet Transporter:
              </label>
              <select
                value={activeTransporterName}
                onChange={(e) => setSelectedTransporter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-950 text-sm focus:ring-2 focus:ring-[#0096C7] cursor-pointer"
              >
                {distinctTransporters.length === 0 && <option value="">No transporters found</option>}
                {distinctTransporters.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              Period: <span className="text-slate-900">{activeDateRange.label}</span>
            </div>
          </div>

          {/* Transporter Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Market Freight</span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ₹{transporterLedger.totalGrossFreight.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{transporterLedger.totalTrips} Trips • {transporterLedger.totalWeight.toFixed(2)} MT</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Advance Paid</span>
              <div className="mt-2 text-2xl font-black text-emerald-700">
                ₹{transporterLedger.totalAdvancePaid.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Disbursed on dispatch</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Commission Deducted</span>
              <div className="mt-2 text-2xl font-black text-indigo-700">
                ₹{transporterLedger.totalCommission.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Brokerage / Margin retained</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">Net Balance Payable</span>
              <div className="mt-2 text-2xl font-black text-amber-950">
                ₹{transporterLedger.totalNetPayable.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] font-bold text-amber-800 mt-1">Pending settlement</p>
            </div>
          </div>

          {/* Transporter Trip Records Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">
                Trip Ledger for {activeTransporterName}
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {transporterLedger.trips.length} Hired Trips
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Vehicle #</th>
                    <th className="py-3 px-4">Route & Commodity</th>
                    <th className="py-3 px-4">LR Numbers</th>
                    <th className="py-3 px-4 text-right">Gross Freight (₹)</th>
                    <th className="py-3 px-4 text-right">Advance Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Commission (₹)</th>
                    <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transporterLedger.trips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        No market placement trips found for {activeTransporterName} in this period.
                      </td>
                    </tr>
                  ) : (
                    transporterLedger.trips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-600">{trip.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{trip.vehicleNumber}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <p className="font-bold text-slate-900">{trip.route}</p>
                          <p className="text-[10px] text-slate-500">{trip.commodity} • {trip.weight} MT</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{trip.lrNumbers.join(', ') || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{trip.grossFreight.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">₹{trip.advancePaid.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">₹{trip.commission.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-800">₹{trip.netFreightPayable.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: MASTER TRANSACTIONS JOURNAL */}
      {/* ========================================================================= */}
      {activeSubTab === 'transactions_journal' && (
        <div className="space-y-6">
          {/* Filters & Export */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search voucher #, party name, or ref..."
                  value={journalSearchQuery}
                  onChange={(e) => setJournalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <select
                value={journalTypeFilter}
                onChange={(e) => setJournalTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="INVOICE">Invoices Billed (Debit)</option>
                <option value="PAYMENT">Bank / Cash Receipts (Credit)</option>
                <option value="TDS">TDS Deductions (Credit)</option>
                <option value="RECONCILIATION">Reconciliations / Settlements</option>
                <option value="DEDUCTION">Rebates & Deductions</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportJournalCsv}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#00E676]" />
              <span>Export Master Journal CSV</span>
            </button>
          </div>

          {/* Master Journal Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Unified Financial Journal</h3>
                <p className="text-xs text-slate-500">Every debited and credited financial event across the organization.</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {masterJournalEntries.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Customer / Party Name</th>
                    <th className="py-3 px-4">Description & Ref</th>
                    <th className="py-3 px-4 text-right">Debit / Billed (₹)</th>
                    <th className="py-3 px-4 text-right">Credit / Received (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterJournalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        No journal entries found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    masterJournalEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            row.category === 'INVOICE'
                              ? 'bg-indigo-50 text-indigo-800'
                              : row.category === 'PAYMENT'
                              ? 'bg-emerald-50 text-emerald-800'
                              : row.category === 'TDS'
                              ? 'bg-amber-50 text-amber-800'
                              : row.category === 'RECONCILIATION'
                              ? 'bg-purple-50 text-purple-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-950 whitespace-nowrap">{row.voucherNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.partyName}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <p className="font-medium text-slate-900">{row.description}</p>
                          {row.paymentMode && (
                            <p className="text-[10px] text-slate-500 font-mono">Mode: {row.paymentMode} {row.refNo ? `• Ref: ${row.refNo}` : ''}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: MIS ANALYTICS & AGING INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeSubTab === 'mis_analytics' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Turnover Billed</span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ₹{misSummary.totalTurnover.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Period: {activeDateRange.label}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash & Bank Collected</span>
              <div className="mt-2 text-2xl font-black text-emerald-700">
                ₹{misSummary.totalCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Efficiency: {misSummary.collectionEfficiencyPercent}%</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">TDS u/s 194C Deducted</span>
              <div className="mt-2 text-2xl font-black text-amber-700">
                ₹{misSummary.totalTdsCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Claimable tax credit</p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-black uppercase tracking-wider text-rose-900">Total Outstanding Due</span>
              <div className="mt-2 text-2xl font-black text-rose-700">
                ₹{misSummary.totalOutstanding.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] font-bold text-rose-800 mt-1">Pending receivables</p>
            </div>
          </div>

          {/* Receivables Aging Analysis Buckets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Receivables Aging Analysis (Buckets)</h3>
              <p className="text-xs text-slate-500">Overdue breakdown of unpaid freight bills across 30, 60, 90, and 90+ days.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs font-bold text-emerald-900 uppercase">0 - 30 Days (Current)</span>
                <div className="mt-1.5 text-xl font-black text-emerald-800">
                  ₹{misSummary.agingBuckets.days0_30.amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] font-bold text-emerald-700">{misSummary.agingBuckets.days0_30.count} Invoices</span>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-xs font-bold text-blue-900 uppercase">31 - 60 Days (Aging)</span>
                <div className="mt-1.5 text-xl font-black text-blue-800">
                  ₹{misSummary.agingBuckets.days31_60.amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] font-bold text-blue-700">{misSummary.agingBuckets.days31_60.count} Invoices</span>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-xs font-bold text-amber-900 uppercase">61 - 90 Days (Overdue)</span>
                <div className="mt-1.5 text-xl font-black text-amber-800">
                  ₹{misSummary.agingBuckets.days61_90.amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] font-bold text-amber-700">{misSummary.agingBuckets.days61_90.count} Invoices</span>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-xs font-bold text-rose-900 uppercase">90+ Days (Critical)</span>
                <div className="mt-1.5 text-xl font-black text-rose-800">
                  ₹{misSummary.agingBuckets.days90Plus.amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] font-bold text-rose-700">{misSummary.agingBuckets.days90Plus.count} Invoices</span>
              </div>
            </div>

            {/* Party-wise Aging Breakdown Matrix */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
              <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800">
                Party-wise Outstanding Aging Matrix
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">Party Name</th>
                      <th className="py-2.5 px-4 text-right">0-30 Days (₹)</th>
                      <th className="py-2.5 px-4 text-right">31-60 Days (₹)</th>
                      <th className="py-2.5 px-4 text-right">61-90 Days (₹)</th>
                      <th className="py-2.5 px-4 text-right">90+ Days (₹)</th>
                      <th className="py-2.5 px-4 text-right font-black text-slate-900">Total Outstanding (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {misSummary.partyAgingList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          All accounts fully paid up! No outstanding dues.
                        </td>
                      </tr>
                    ) : (
                      misSummary.partyAgingList.map((p) => (
                        <tr key={p.partyName} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{p.partyName}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                            {p.bucket0_30 > 0 ? `₹${p.bucket0_30.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-blue-700">
                            {p.bucket31_60 > 0 ? `₹${p.bucket31_60.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-amber-700">
                            {p.bucket61_90 > 0 ? `₹${p.bucket61_90.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-rose-700 font-bold">
                            {p.bucket90Plus > 0 ? `₹${p.bucket90Plus.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-black text-slate-950">
                            ₹{p.totalOutstanding.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Party Turnover Ranking Leaderboard & Fleet Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Party Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="font-black text-slate-900 text-sm">Top Customer Turnover Rankings</h3>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {misSummary.partyTurnoverRanking.map((p, idx) => (
                  <div key={p.partyName} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{p.partyName}</p>
                        <p className="text-[10px] text-slate-500">{p.invoicesCount} Invoices • {p.totalWeight.toFixed(1)} MT</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-slate-900">₹{p.totalBilled.toLocaleString('en-IN')}</p>
                      <p className={`text-[10px] font-bold ${p.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {p.outstanding > 0 ? `₹${p.outstanding.toLocaleString('en-IN')} Due` : 'Fully Paid'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fleet Placement Margin */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-black text-slate-900 text-sm">Fleet Placement Margin Analysis</h3>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-900">Own Vehicle Placement</span>
                  <p className="text-lg font-black text-emerald-950 mt-1">₹{misSummary.fleetPlacementMetrics.ownTotalFreight.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-emerald-800">{misSummary.fleetPlacementMetrics.ownTripsCount} Trips</p>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="font-bold text-blue-900">Market Hired Placement</span>
                  <p className="text-lg font-black text-blue-950 mt-1">₹{misSummary.fleetPlacementMetrics.marketGrossFreight.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-blue-800">{misSummary.fleetPlacementMetrics.marketTripsCount} Trips</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600">Gross Brokerage Commission Earned:</span>
                  <span className="font-mono text-emerald-700 font-black">₹{misSummary.fleetPlacementMetrics.marketCommissionEarned.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600">Net Freight Payable to Transporters:</span>
                  <span className="font-mono text-slate-900">₹{misSummary.fleetPlacementMetrics.marketNetFreightPayable.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span className="text-slate-900">Estimated Market Fleet Margin:</span>
                  <span className="font-mono text-indigo-700 font-black text-sm">{misSummary.fleetPlacementMetrics.estimatedGrossMargin}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATEMENT OF ACCOUNT OFFICIAL PRINT MODAL */}
      {/* ========================================================================= */}
      {isStatementPrintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-4xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[94vh] flex flex-col my-4">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="h-5 w-5 text-slate-800" />
                <h4 className="font-black text-slate-950 text-base">
                  Official Statement of Account - {partyLedger.partyName}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStatementPrintOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Statement Container */}
            <div className="overflow-y-auto p-6 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-900 font-sans">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <h1 className="text-xl font-black uppercase text-slate-950 tracking-tight">
                    {billerProfile.companyName || 'LogiTrack Freight Solutions'}
                  </h1>
                  {billerProfile.tagline && <p className="text-xs text-slate-600 font-medium">{billerProfile.tagline}</p>}
                  <p className="text-[11px] text-slate-500">
                    {billerProfile.address}, {billerProfile.city}, {billerProfile.state} - {billerProfile.pincode}
                  </p>
                  <p className="text-[11px] font-mono text-slate-700 font-bold">
                    GSTIN: {billerProfile.gstin || '27AAACL8890M1Z4'} | PAN: {billerProfile.panNumber || 'AAACL8890M'}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className="px-3 py-1 bg-slate-950 text-white rounded font-black text-xs uppercase tracking-wider">
                    STATEMENT OF ACCOUNT
                  </span>
                  <p className="text-xs text-slate-600 mt-2">
                    Date: <span className="font-mono font-bold text-slate-900">{new Date().toLocaleDateString('en-IN')}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Period: <span className="font-bold text-slate-900">{activeDateRange.label}</span>
                  </p>
                </div>
              </div>

              {/* Statement Billed To Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Statement For:</span>
                  <h3 className="font-black text-base text-slate-950 mt-0.5">{partyLedger.partyName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Net Outstanding Balance:</span>
                  <h3 className="font-mono font-black text-base text-rose-700 mt-0.5">
                    ₹{partyLedger.closingBalance.toLocaleString('en-IN')} {partyLedger.closingBalance > 0 ? 'Dr' : 'Cr'}
                  </h3>
                </div>
              </div>

              {/* Ledger Table */}
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-200">Date</th>
                    <th className="p-2 border-r border-slate-200">Doc / Voucher No</th>
                    <th className="p-2 border-r border-slate-200">Particulars</th>
                    <th className="p-2 text-right border-r border-slate-200">Debit (₹)</th>
                    <th className="p-2 text-right border-r border-slate-200">Credit (₹)</th>
                    <th className="p-2 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-200 font-mono">{activeDateRange.startDate || 'Start'}</td>
                    <td className="p-2 border-r border-slate-200" colSpan={2}>Opening Balance</td>
                    <td className="p-2 text-right border-r border-slate-200">-</td>
                    <td className="p-2 text-right border-r border-slate-200">-</td>
                    <td className="p-2 text-right font-mono font-bold">₹{partyLedger.openingBalance.toLocaleString('en-IN')}</td>
                  </tr>
                  {partyLedger.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="p-2 border-r border-slate-200 font-mono whitespace-nowrap">{e.date}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold whitespace-nowrap">{e.voucherNumber}</td>
                      <td className="p-2 border-r border-slate-200">{e.description}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-200 text-rose-600 font-bold">
                        {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-2 text-right font-mono border-r border-slate-200 text-emerald-700 font-bold">
                        {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-2 text-right font-mono font-black">
                        ₹{e.runningBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Bottom Bar */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>1. Please verify statement and notify discrepancies within 7 days.</p>
                  <p>2. Payment may be directly transferred to Bank: {billerProfile.bankName} (A/c: {billerProfile.bankAccountNumber}).</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs font-bold text-slate-900">For {billerProfile.companyName || 'LogiTrack Freight Solutions'}</p>
                  <div className="h-10"></div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase border-t border-slate-300 pt-1">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
